import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db, EmailRecord } from '../db/index.js';
import { emailQueue, scheduleEmailJob } from '../queue/emailQueue.js';
import { elasticsearchService } from '../services/elasticsearch.js';
import { config } from '../config/env.js';

const router = Router();

// 1. Schedule emails (Single, Bulk CSV, or Load Test)
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const {
      sender,
      recipients,
      subject,
      body,
      startTime,
      delayBetweenEmails = 2, // default 2 seconds
      hourlyLimit = 50,       // default 50 emails/hour
    } = req.body;

    if (!sender || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Sender and a non-empty list of recipients are required.' });
    }

    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and Body are required.' });
    }

    const startTimestamp = startTime ? new Date(startTime).getTime() : Date.now();
    const delayStepMs = Math.max(0, Number(delayBetweenEmails) * 1000);
    const configuredHourlyLimit = Number(hourlyLimit) || config.worker.maxEmailsPerHour;

    const scheduledRecords: EmailRecord[] = [];
    const now = Date.now();

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i].trim();
      if (!recipient) continue;

      const emailId = `email_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      // Calculate individual send time based on start time and staggering delay
      const sendAtMs = startTimestamp + (i * delayStepMs);
      const scheduledAtIso = new Date(sendAtMs).toISOString();
      const delayMs = Math.max(0, sendAtMs - now);

      const emailRecord: EmailRecord = {
        id: emailId,
        sender: sender.trim(),
        recipient,
        subject,
        body,
        scheduled_at: scheduledAtIso,
        status: 'scheduled',
        delay_ms: delayStepMs,
        hourly_limit: configuredHourlyLimit,
        attempts: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Store in relational DB
      await db.insertEmail(emailRecord);

      // Schedule delayed job via BullMQ (persisted in Redis)
      await scheduleEmailJob(emailRecord, delayMs);

      // Index in Elasticsearch
      await elasticsearchService.indexEmail(emailRecord);

      scheduledRecords.push(emailRecord);
    }

    return res.status(201).json({
      message: `Successfully scheduled ${scheduledRecords.length} email(s).`,
      count: scheduledRecords.length,
      emails: scheduledRecords,
    });
  } catch (err: any) {
    console.error('❌ Error scheduling email:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 2. View Scheduled Emails
router.get('/scheduled', async (_req: Request, res: Response) => {
  try {
    const scheduled = await db.getScheduledEmails();
    return res.json({ scheduled });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. View Sent Emails
router.get('/sent', async (_req: Request, res: Response) => {
  try {
    const sent = await db.getSentEmails();
    return res.json({ sent });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Cancel a scheduled email
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Remove from BullMQ if present
    const job = await emailQueue.getJob(id);
    if (job) {
      await job.remove();
    }

    // Remove from DB
    const deleted = await db.deleteEmail(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Email record not found.' });
    }

    return res.json({ message: 'Scheduled email cancelled successfully.', id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. System Queue & Delivery Stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const scheduled = await db.getScheduledEmails();
    const sent = await db.getSentEmails();

    const queueCounts = await emailQueue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused'
    );

    const sentSuccess = sent.filter((e) => e.status === 'sent').length;
    const sentFailed = sent.filter((e) => e.status === 'failed').length;
    const rateLimitedCount = scheduled.filter((e) => e.status === 'delayed_rate_limited').length;

    return res.json({
      db: {
        totalScheduled: scheduled.length,
        totalSent: sentSuccess,
        totalFailed: sentFailed,
        delayedRateLimited: rateLimitedCount,
      },
      queue: queueCounts,
      config: {
        workerConcurrency: config.worker.concurrency,
        minDelayMs: config.worker.minDelayMs,
        maxEmailsPerHour: config.worker.maxEmailsPerHour,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

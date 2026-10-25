import { Worker, Job } from 'bullmq';
import { redisOptions } from '../config/redis.js';
import { config } from '../config/env.js';
import { db } from '../db/index.js';
import { EmailJobData, EMAIL_QUEUE_NAME, emailQueue } from './emailQueue.js';
import { RateLimiter } from './rateLimiter.js';
import { sendEmailViaEthereal } from '../services/emailService.js';
import { slackService } from '../services/slackService.js';
import { elasticsearchService } from '../services/elasticsearch.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function startEmailWorker(): Worker<EmailJobData> {
  console.log(`🚀 Starting BullMQ Email Worker with concurrency = ${config.worker.concurrency}...`);

  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const data = job.data;
      console.log(`\n📨 [Worker Job ${job.id}] Processing email for ${data.recipient} from ${data.sender}`);

      // 1. Mark status as processing in database
      await db.updateEmailStatus(data.emailId, {
        status: 'processing',
        attempts: job.attemptsMade + 1,
      });

      // 2. Check and consume hourly rate limit (Redis-backed atomic counter per sender)
      const rateLimitCheck = await RateLimiter.checkAndConsume(
        data.sender,
        data.hourlyLimit || config.worker.maxEmailsPerHour
      );

      // 3. Handle Rate Limit Hit
      if (!rateLimitCheck.allowed) {
        const rescheduledTo = rateLimitCheck.rescheduledTo || new Date(Date.now() + 3600000);
        console.warn(
          `⚠️ [RATE LIMIT HIT] Sender ${data.sender} reached ${rateLimitCheck.limit} emails/hr limit. ` +
          `Rescheduling email to next window (${rescheduledTo.toLocaleTimeString()}).`
        );

        // Update DB status to delayed_rate_limited
        await db.updateEmailStatus(data.emailId, {
          status: 'delayed_rate_limited',
          error_message: `Hourly rate limit exceeded (${rateLimitCheck.currentCount}/${rateLimitCheck.limit} sent). Rescheduled for next hour window.`,
        });

        // Trigger verifiable Slack alert
        await slackService.sendRateLimitAlert({
          sender: data.sender,
          currentCount: rateLimitCheck.currentCount,
          hourlyLimit: rateLimitCheck.limit,
          rescheduledTo,
          recipientEmail: data.recipient,
          emailSubject: data.subject,
        });

        // DO NOT DROP: Reschedule job into next hour window while preserving order
        const rescheduleDelayMs = rateLimitCheck.delayUntilNextWindowMs || 3600000;
        await emailQueue.add(
          'sendEmail',
          {
            ...data,
            scheduledAt: rescheduledTo.toISOString(),
          },
          {
            delay: rescheduleDelayMs,
            jobId: `${data.emailId}-rescheduled-${Date.now()}`,
          }
        );

        return {
          status: 'delayed_rate_limited',
          rescheduledTo: rescheduledTo.toISOString(),
        };
      }

      // 4. Mimic provider throttling: minimum delay between individual email sends
      const minDelay = data.delayMs || config.worker.minDelayMs;
      if (minDelay > 0) {
        console.log(`⏳ Applying provider throttling delay (${minDelay}ms) for ${data.recipient}...`);
        await sleep(minDelay);
      }

      // 5. Send email via fake SMTP (Ethereal Email)
      try {
        const result = await sendEmailViaEthereal({
          to: data.recipient,
          from: data.sender,
          subject: data.subject,
          body: data.body,
          emailId: data.emailId,
        });

        const now = new Date().toISOString();
        const previewUrl = typeof result.previewUrl === 'string' ? result.previewUrl : null;

        // 6. Update database record to 'sent'
        await db.updateEmailStatus(data.emailId, {
          status: 'sent',
          sent_at: now,
          preview_url: previewUrl,
          error_message: null,
        });

        // 7. Index in Elasticsearch
        const updatedEmail = await db.getEmailById(data.emailId);
        if (updatedEmail) {
          await elasticsearchService.indexEmail(updatedEmail);
        }

        console.log(`🎉 [SUCCESS] Email sent to ${data.recipient}! Preview URL: ${previewUrl}`);
        return {
          status: 'sent',
          messageId: result.messageId,
          previewUrl,
        };
      } catch (err: any) {
        console.error(`❌ [FAILED] Email send failed for ${data.recipient}:`, err.message);

        // Update database with failure info
        await db.updateEmailStatus(data.emailId, {
          status: 'failed',
          error_message: err.message,
        });

        const updatedEmail = await db.getEmailById(data.emailId);
        if (updatedEmail) {
          await elasticsearchService.indexEmail(updatedEmail);
        }

        throw err;
      }
    },
    {
      connection: redisOptions,
      concurrency: config.worker.concurrency, // Configurable worker concurrency
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ [Job Completed] Job ID: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 [Job Failed] Job ID: ${job?.id}, Error: ${err.message}`);
  });

  return worker;
}

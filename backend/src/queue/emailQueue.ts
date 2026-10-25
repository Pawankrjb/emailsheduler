import { Queue, JobsOptions } from 'bullmq';
import { redisOptions } from '../config/redis.js';
import { db, EmailRecord } from '../db/index.js';

export interface EmailJobData {
  emailId: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  delayMs: number;
  hourlyLimit: number;
  scheduledAt: string;
}

export const EMAIL_QUEUE_NAME = 'emailQueue';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 1000, // keep last 1000 completed jobs for bull-board inspection
    removeOnFail: 5000,     // keep failed jobs for debugging
  },
});

/**
 * Schedules a new email job using BullMQ delayed jobs.
 * Enforces idempotency via unique jobId = emailRecord.id.
 */
export async function scheduleEmailJob(
  emailRecord: EmailRecord,
  delayMs: number
): Promise<string> {
  const jobOptions: JobsOptions = {
    jobId: emailRecord.id, // Strictly ensures idempotency: cannot be duplicated in the queue
    delay: Math.max(0, delayMs),
  };

  const jobData: EmailJobData = {
    emailId: emailRecord.id,
    sender: emailRecord.sender,
    recipient: emailRecord.recipient,
    subject: emailRecord.subject,
    body: emailRecord.body,
    delayMs: emailRecord.delay_ms,
    hourlyLimit: emailRecord.hourly_limit,
    scheduledAt: emailRecord.scheduled_at,
  };

  const job = await emailQueue.add('sendEmail', jobData, jobOptions);
  console.log(`⏱️ Scheduled email job ${job.id} for ${emailRecord.recipient} with delay ${delayMs}ms`);
  return job.id!;
}

/**
 * Ensures system persistence across server crashes or restarts.
 * Verifies any emails in Relational DB with 'scheduled' status are present in BullMQ delayed queue.
 */
export async function recoverScheduledJobsOnStartup(): Promise<void> {
  console.log('🔄 Checking database for persistent scheduled emails after startup/restart...');
  try {
    const pendingEmails = await db.getScheduledEmails();
    const now = Date.now();
    let recoveredCount = 0;

    for (const email of pendingEmails) {
      const existingJob = await emailQueue.getJob(email.id);

      if (!existingJob) {
        // Job was not in Redis (e.g. Redis restart or cold boot), re-schedule it
        const targetTime = new Date(email.scheduled_at).getTime();
        const delay = Math.max(0, targetTime - now);

        await scheduleEmailJob(email, delay);
        recoveredCount++;
      }
    }

    if (recoveredCount > 0) {
      console.log(`✅ Recovered and re-queued ${recoveredCount} persistent email jobs from database.`);
    } else {
      console.log(`✅ All scheduled email jobs verified in BullMQ queue (${pendingEmails.length} pending).`);
    }
  } catch (err: any) {
    console.error('❌ Error recovering scheduled jobs:', err.message);
  }
}

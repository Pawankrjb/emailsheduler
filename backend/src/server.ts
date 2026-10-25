import { config } from './config/env.js';
import { createApp } from './app.js';
import { db } from './db/index.js';
import { elasticsearchService } from './services/elasticsearch.js';
import { recoverScheduledJobsOnStartup } from './queue/emailQueue.js';
import { startEmailWorker } from './queue/emailWorker.js';

async function bootstrap() {
  console.log('========================================================');
  console.log('🚀 Starting ReachInbox Full-stack Email Job Scheduler...');
  console.log('========================================================');

  // 1. Initialize Relational Database
  await db.init();

  // 2. Initialize Elasticsearch
  await elasticsearchService.init();

  // 3. Recover persistent scheduled jobs from database into BullMQ delayed queue
  await recoverScheduledJobsOnStartup();

  // 4. Start BullMQ Email Worker
  const worker = startEmailWorker();

  // 5. Start Express API Server
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`\n🎉 Server running successfully at http://localhost:${config.port}`);
    console.log(`📊 Live BullMQ Dashboard active at: http://localhost:${config.port}/admin/queues`);
    console.log(`⚙️  Worker Concurrency: ${config.worker.concurrency}`);
    console.log(`⏳ Minimum Delay Between Sends: ${config.worker.minDelayMs}ms`);
    console.log(`⏱️  Max Hourly Rate Limit: ${config.worker.maxEmailsPerHour} emails/hr per sender\n`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Gracefully shutting down ReachInbox Scheduler...');
    await worker.close();
    server.close(() => {
      console.log('👋 HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('💥 Fatal error bootstrapping server:', err);
  process.exit(1);
});

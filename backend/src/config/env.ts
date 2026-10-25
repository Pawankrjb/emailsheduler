import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  database: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/reachinbox',
  },
  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  },
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    minDelayMs: parseInt(process.env.MIN_EMAIL_DELAY_MS || '2000', 10), // minimum 2 seconds between sends
    maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR || '50', 10),
  },
  ethereal: {
    user: process.env.ETHEREAL_USER || '',
    pass: process.env.ETHEREAL_PASS || '',
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    redirectUri:
      process.env.SLACK_REDIRECT_URI ||
      'http://localhost:4000/api/slack/oauth/callback',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};

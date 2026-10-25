import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { emailQueue } from './queue/emailQueue.js';
import emailRoutes from './routes/emailRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import slackRoutes from './routes/slackRoutes.js';
import authRoutes from './routes/authRoutes.js';

export function createApp() {
  const app = express();

  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // CORS configuration
  app.use(
    cors({
      origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://localhost:4000',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Bull-board Setup for Live Real-Time BullMQ Dashboard
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter: serverAdapter,
    options: {
      uiConfig: {
        boardTitle: '📬 Email Scheduler — Queue Dashboard',
        boardLogo: {
          path: '',
          width: 0,
          height: 0,
        },
        favIcon: {
          default: 'static/images/logo.svg',
          alternative: 'static/favicon.ico',
        },
      },
    },
  });

  // Serve public assets (custom themes, etc.)
  app.use('/admin/public', express.static(path.join(__dirname, '../../public')));

  // Inject custom Email Scheduler CSS theme into Bull Board HTML
  app.use('/admin/queues', (req, res, next) => {
    const originalSend = res.send.bind(res);
    (res as any).send = (body: any) => {
      if (typeof body === 'string' && body.includes('</head>')) {
        body = body.replace(
          '</head>',
          `<link rel="stylesheet" href="/admin/public/email-scheduler-theme.css" />
           <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
           </head>`
        );
      }
      return originalSend(body);
    };
    next();
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  // Mount Application Routes
  app.use('/api/emails', emailRoutes);
  app.use('/api/emails/search', searchRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/slack', slackRoutes);
  app.use('/', authRoutes); // mounts /profile, /login, /signup, /auth/google

  // Root / Health Check
  app.get('/', (_req, res) => {
    res.json({
      service: 'ReachInbox Full-stack Email Job Scheduler',
      status: 'healthy',
      bullBoardUrl: 'http://localhost:4000/admin/queues',
      docs: {
        scheduled: '/api/emails/scheduled',
        sent: '/api/emails/sent',
        search: '/api/emails/search?q=query',
        slackStatus: '/api/slack/status',
        stats: '/api/emails/stats',
      },
    });
  });

  return app;
}

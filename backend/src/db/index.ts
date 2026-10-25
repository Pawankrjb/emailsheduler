import { createClient, Client } from '@libsql/client';
import pg from 'pg';
import path from 'path';
import { config } from '../config/env.js';

const { Pool } = pg;

export interface EmailRecord {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  scheduled_at: string;
  sent_at?: string | null;
  status: 'scheduled' | 'processing' | 'sent' | 'failed' | 'delayed_rate_limited';
  delay_ms: number;
  hourly_limit: number;
  attempts: number;
  error_message?: string | null;
  preview_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SlackIntegrationRecord {
  id: string;
  user_id: string;
  webhook_url?: string | null;
  access_token?: string | null;
  channel?: string | null;
  connected: boolean;
  created_at: string;
  updated_at: string;
}

// Database client abstraction supporting both PostgreSQL and SQLite/LibSQL
class DatabaseService {
  private pgPool: pg.Pool | null = null;
  private sqliteClient: Client | null = null;
  private isPostgres = false;

  async init(): Promise<void> {
    // Attempt PostgreSQL first if connection string is provided
    if (config.database.url && config.database.url.startsWith('postgres')) {
      try {
        const pool = new Pool({
          connectionString: config.database.url,
          connectionTimeoutMillis: 3000,
        });
        const client = await pool.connect();
        await client.query('SELECT 1;');
        client.release();
        this.pgPool = pool;
        this.isPostgres = true;
        console.log('✅ Connected to PostgreSQL database.');
      } catch (err: any) {
        console.warn(`⚠️ PostgreSQL connection failed (${err.message}). Falling back to persistent SQLite/LibSQL relational DB.`);
        this.isPostgres = false;
      }
    }

    if (!this.isPostgres) {
      const dbPath = path.resolve(process.cwd(), 'reachinbox.db');
      this.sqliteClient = createClient({
        url: `file:${dbPath}`,
      });
      console.log(`✅ Using persistent Relational SQLite Database: ${dbPath}`);
    }

    await this.createTables();
  }

  private async createTables(): Promise<void> {
    const emailTableQuery = `
      CREATE TABLE IF NOT EXISTS emails (
        id TEXT PRIMARY KEY,
        sender TEXT NOT NULL,
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        scheduled_at TEXT NOT NULL,
        sent_at TEXT,
        status TEXT NOT NULL DEFAULT 'scheduled',
        delay_ms INTEGER DEFAULT 2000,
        hourly_limit INTEGER DEFAULT 50,
        attempts INTEGER DEFAULT 0,
        error_message TEXT,
        preview_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const slackTableQuery = `
      CREATE TABLE IF NOT EXISTS slack_integrations (
        id TEXT PRIMARY KEY,
        user_id TEXT DEFAULT 'default',
        webhook_url TEXT,
        access_token TEXT,
        channel TEXT,
        connected INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const usersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        avatar TEXT,
        google_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    if (this.isPostgres && this.pgPool) {
      await this.pgPool.query(emailTableQuery);
      await this.pgPool.query(slackTableQuery);
      await this.pgPool.query(usersTableQuery);
      await this.pgPool.query(`CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);`);
      await this.pgPool.query(`CREATE INDEX IF NOT EXISTS idx_emails_sender ON emails(sender);`);
    } else if (this.sqliteClient) {
      await this.sqliteClient.execute(emailTableQuery);
      await this.sqliteClient.execute(slackTableQuery);
      await this.sqliteClient.execute(usersTableQuery);
      await this.sqliteClient.execute(`CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);`);
      await this.sqliteClient.execute(`CREATE INDEX IF NOT EXISTS idx_emails_sender ON emails(sender);`);
    }
    console.log('✅ Relational database schema verified.');
  }

  // Insert single or batch emails
  async insertEmail(email: Omit<EmailRecord, 'created_at' | 'updated_at'>): Promise<void> {
    const now = new Date().toISOString();
    const query = `
      INSERT INTO emails (id, sender, recipient, subject, body, scheduled_at, sent_at, status, delay_ms, hourly_limit, attempts, error_message, preview_url, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        updated_at = excluded.updated_at;
    `;
    const params = [
      email.id,
      email.sender,
      email.recipient,
      email.subject,
      email.body,
      email.scheduled_at,
      email.sent_at || null,
      email.status,
      email.delay_ms,
      email.hourly_limit,
      email.attempts,
      email.error_message || null,
      email.preview_url || null,
      now,
      now,
    ];

    if (this.isPostgres && this.pgPool) {
      await this.pgPool.query(query, params);
    } else if (this.sqliteClient) {
      // LibSQL uses ? for positional params
      const sqliteQuery = query.replace(/\$(\d+)/g, '?');
      await this.sqliteClient.execute({ sql: sqliteQuery, args: params });
    }
  }

  // Update email status and delivery details
  async updateEmailStatus(
    id: string,
    updates: {
      status: EmailRecord['status'];
      sent_at?: string;
      error_message?: string | null;
      preview_url?: string | null;
      attempts?: number;
    }
  ): Promise<void> {
    const now = new Date().toISOString();
    const sets: string[] = ['status = $1', 'updated_at = $2'];
    const args: any[] = [updates.status, now];
    let counter = 3;

    if (updates.sent_at !== undefined) {
      sets.push(`sent_at = $${counter++}`);
      args.push(updates.sent_at);
    }
    if (updates.error_message !== undefined) {
      sets.push(`error_message = $${counter++}`);
      args.push(updates.error_message);
    }
    if (updates.preview_url !== undefined) {
      sets.push(`preview_url = $${counter++}`);
      args.push(updates.preview_url);
    }
    if (updates.attempts !== undefined) {
      sets.push(`attempts = $${counter++}`);
      args.push(updates.attempts);
    }

    const query = `UPDATE emails SET ${sets.join(', ')} WHERE id = $${counter}`;
    args.push(id);

    if (this.isPostgres && this.pgPool) {
      await this.pgPool.query(query, args);
    } else if (this.sqliteClient) {
      const sqliteQuery = query.replace(/\$(\d+)/g, '?');
      await this.sqliteClient.execute({ sql: sqliteQuery, args });
    }
  }

  async getEmailById(id: string): Promise<EmailRecord | null> {
    const query = `SELECT * FROM emails WHERE id = $1`;
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query(query, [id]);
      return res.rows[0] || null;
    } else if (this.sqliteClient) {
      const res = await this.sqliteClient.execute({ sql: 'SELECT * FROM emails WHERE id = ?', args: [id] });
      return (res.rows[0] as unknown as EmailRecord) || null;
    }
    return null;
  }

  async getScheduledEmails(): Promise<EmailRecord[]> {
    const query = `SELECT * FROM emails WHERE status IN ('scheduled', 'delayed_rate_limited', 'processing') ORDER BY scheduled_at ASC`;
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query(query);
      return res.rows;
    } else if (this.sqliteClient) {
      const res = await this.sqliteClient.execute({ sql: query, args: [] });
      return res.rows as unknown as EmailRecord[];
    }
    return [];
  }

  async getSentEmails(): Promise<EmailRecord[]> {
    const query = `SELECT * FROM emails WHERE status IN ('sent', 'failed') ORDER BY COALESCE(sent_at, updated_at) DESC`;
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query(query);
      return res.rows;
    } else if (this.sqliteClient) {
      const res = await this.sqliteClient.execute({ sql: query, args: [] });
      return res.rows as unknown as EmailRecord[];
    }
    return [];
  }

  async deleteEmail(id: string): Promise<boolean> {
    const query = `DELETE FROM emails WHERE id = $1`;
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query(query, [id]);
      return (res.rowCount ?? 0) > 0;
    } else if (this.sqliteClient) {
      const res = await this.sqliteClient.execute({ sql: 'DELETE FROM emails WHERE id = ?', args: [id] });
      return res.rowsAffected > 0;
    }
    return false;
  }

  // Database fallback search (used when Elasticsearch is offline or as fallback)
  async searchEmails(searchTerm: string): Promise<EmailRecord[]> {
    const term = `%${searchTerm.toLowerCase()}%`;
    const query = `
      SELECT * FROM emails 
      WHERE LOWER(recipient) LIKE $1 
         OR LOWER(sender) LIKE $1 
         OR LOWER(subject) LIKE $1 
         OR LOWER(body) LIKE $1
      ORDER BY scheduled_at DESC
      LIMIT 100
    `;
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query(query, [term]);
      return res.rows;
    } else if (this.sqliteClient) {
      const res = await this.sqliteClient.execute({
        sql: query.replace(/\$(\d+)/g, '?'),
        args: [term, term, term, term],
      });
      return res.rows as unknown as EmailRecord[];
    }
    return [];
  }

  // Slack integration queries
  async getSlackIntegration(): Promise<SlackIntegrationRecord | null> {
    const query = `SELECT * FROM slack_integrations WHERE user_id = 'default' LIMIT 1`;
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query(query);
      return res.rows[0] || null;
    } else if (this.sqliteClient) {
      const res = await this.sqliteClient.execute({ sql: query, args: [] });
      const row = res.rows[0] as any;
      if (!row) return null;
      return {
        ...row,
        connected: Boolean(row.connected),
      };
    }
    return null;
  }

  async saveSlackIntegration(data: {
    webhook_url?: string;
    access_token?: string;
    channel?: string;
    connected: boolean;
  }): Promise<void> {
    const now = new Date().toISOString();
    const query = `
      INSERT INTO slack_integrations (id, user_id, webhook_url, access_token, channel, connected, created_at, updated_at)
      VALUES ('default', 'default', $1, $2, $3, $4, $5, $5)
      ON CONFLICT(id) DO UPDATE SET
        webhook_url = excluded.webhook_url,
        access_token = excluded.access_token,
        channel = excluded.channel,
        connected = excluded.connected,
        updated_at = excluded.updated_at;
    `;
    const params = [
      data.webhook_url || null,
      data.access_token || null,
      data.channel || null,
      data.connected ? 1 : 0,
      now,
    ];

    if (this.isPostgres && this.pgPool) {
      await this.pgPool.query(query, params);
    } else if (this.sqliteClient) {
      await this.sqliteClient.execute({
        sql: query.replace(/\$(\d+)/g, '?'),
        args: params,
      });
    }
  }

  async disconnectSlack(): Promise<void> {
    const query = `UPDATE slack_integrations SET connected = 0 WHERE id = 'default'`;
    if (this.isPostgres && this.pgPool) {
      await this.pgPool.query(query);
    } else if (this.sqliteClient) {
      await this.sqliteClient.execute({ sql: query, args: [] });
    }
  }
}

export const db = new DatabaseService();

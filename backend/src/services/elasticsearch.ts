import { Client } from '@elastic/elasticsearch';
import { config } from '../config/env.js';
import { db, EmailRecord } from '../db/index.js';

class ElasticsearchService {
  private client: Client;
  private isAvailable: boolean = false;
  private indexName = 'emails';

  constructor() {
    this.client = new Client({
      node: config.elasticsearch.url,
      requestTimeout: 3000,
      maxRetries: 1,
    });
  }

  async init(): Promise<void> {
    try {
      const ping = await this.client.ping();
      if (ping) {
        this.isAvailable = true;
        console.log('✅ Connected to Elasticsearch at', config.elasticsearch.url);
        await this.ensureIndexExists();
      }
    } catch (err: any) {
      this.isAvailable = false;
      console.warn(
        `⚠️ Elasticsearch is not reachable at ${config.elasticsearch.url} (${err.message}). ` +
        `Search will automatically use Relational DB full-text search as fallback.`
      );
    }
  }

  private async ensureIndexExists(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      if (!exists) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                sender: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                subject: { type: 'text' },
                body: { type: 'text' },
                status: { type: 'keyword' },
                scheduled_at: { type: 'date' },
                sent_at: { type: 'date' },
                preview_url: { type: 'keyword' },
                created_at: { type: 'date' },
              },
            },
          },
        });
        console.log(`✅ Elasticsearch index '${this.indexName}' created.`);
      }
    } catch (err: any) {
      console.warn('⚠️ Error checking/creating Elasticsearch index:', err.message);
    }
  }

  async indexEmail(email: EmailRecord): Promise<void> {
    if (!this.isAvailable) return;
    try {
      await this.client.index({
        index: this.indexName,
        id: email.id,
        document: {
          id: email.id,
          sender: email.sender,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
          status: email.status,
          scheduled_at: email.scheduled_at,
          sent_at: email.sent_at,
          preview_url: email.preview_url,
          created_at: email.created_at,
        },
      });
    } catch (err: any) {
      console.warn('⚠️ Failed to index email in Elasticsearch:', err.message);
    }
  }

  async searchEmails(query: string): Promise<{ results: EmailRecord[]; source: 'elasticsearch' | 'database' }> {
    if (this.isAvailable && query.trim()) {
      try {
        const response = await this.client.search({
          index: this.indexName,
          query: {
            multi_match: {
              query,
              fields: ['recipient^3', 'sender^2', 'subject^2', 'body'],
              fuzziness: 'AUTO',
            },
          },
          size: 50,
        });

        const hits = response.hits.hits.map((hit: any) => hit._source as EmailRecord);
        return { results: hits, source: 'elasticsearch' };
      } catch (err: any) {
        console.warn('⚠️ Elasticsearch search error, falling back to DB:', err.message);
      }
    }

    // Fallback to database
    const dbResults = await db.searchEmails(query);
    return { results: dbResults, source: 'database' };
  }

  getStatus() {
    return {
      available: this.isAvailable,
      url: config.elasticsearch.url,
      index: this.indexName,
    };
  }
}

export const elasticsearchService = new ElasticsearchService();

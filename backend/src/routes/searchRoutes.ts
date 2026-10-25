import { Router, Request, Response } from 'express';
import { elasticsearchService } from '../services/elasticsearch.js';

const router = Router();

// Search emails across sender, recipient, subject, body using Elasticsearch
router.get('/', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';

    if (!q.trim()) {
      return res.json({ query: '', results: [], total: 0, source: 'none' });
    }

    const { results, source } = await elasticsearchService.searchEmails(q);

    return res.json({
      query: q,
      source, // Indicates 'elasticsearch' or 'database'
      total: results.length,
      results,
    });
  } catch (err: any) {
    console.error('❌ Search error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;

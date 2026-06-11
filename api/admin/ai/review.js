// POST /api/admin/ai/review — { kind, record } -> { suggestions }. requireAdmin.
import OpenAI from 'openai';
import { json, readJsonBody } from '../../_lib/supabase.js';
import { requireAdmin } from '../../_lib/admin-auth.js';
import { reviewOne } from '../../_lib/ai/generate.js';

const KINDS = new Set(['place', 'event', 'mom']);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return json(res, 500, { error: 'OPENAI_API_KEY not set' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });
  if (!KINDS.has(body.kind)) return json(res, 400, { error: 'kind must be place|event|mom' });
  if (!body.record || typeof body.record !== 'object') return json(res, 400, { error: 'record required' });

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return json(res, 200, { suggestions: await reviewOne(openai, body.kind, body.record) });
  } catch (e) {
    console.error('ai/review failed', e);
    return json(res, 502, { error: 'AI request failed' });
  }
}

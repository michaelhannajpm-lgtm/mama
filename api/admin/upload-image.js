// POST /api/admin/upload-image — { kind, id, dataUrl } -> { url }. requireAdmin.
import { put } from '@vercel/blob';
import { json, readJsonBody, randomHex } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/admin-auth.js';
import { decodeDataUrl } from '../_lib/ai/prompts.js';

const MAX_BYTES = 8 * 1024 * 1024;
const FOLDER = { place: 'places', event: 'events', mom: 'profiles' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return json(res, 500, { error: 'Blob storage not configured' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });
  const folder = FOLDER[body.kind];
  if (!folder) return json(res, 400, { error: 'kind must be place|event|mom' });

  const decoded = decodeDataUrl(body.dataUrl);
  if (!decoded) return json(res, 400, { error: 'dataUrl must be a base64 jpeg/png/webp image' });
  if (decoded.bytes.length > MAX_BYTES) return json(res, 413, { error: 'Image too large (max 8MB)' });

  try {
    const id = String(body.id || 'new').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'new';
    const path = `${folder}/up-${id}-${randomHex(6)}.${decoded.ext}`;
    const blob = await put(path, decoded.bytes, { access: 'public', contentType: decoded.contentType });
    return json(res, 200, { url: blob.url });
  } catch (e) {
    console.error('upload-image failed', e);
    return json(res, 502, { error: 'Upload failed' });
  }
}

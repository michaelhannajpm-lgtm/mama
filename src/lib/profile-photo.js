import { supabase, isSupabaseReady } from './supabase';

// Downscale + JPEG-encode a chosen image File to a data URL so uploads stay
// small (well under the serverless body limit) regardless of the source photo.
export const compressImageToDataUrl = (file, { maxDim = 1024, quality = 0.82 } = {}) =>
  new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Please choose an image file'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')); };
    img.src = url;
  });

// Upload one profile photo; resolves to its public blob URL. Throws a friendly
// error if the upload fails. `opts.seedMomId` routes through the DEV-only path
// when there's no real session (dev seeded-mom login), so seeded profiles can
// add photos locally too.
export const uploadProfilePhoto = async (file, { seedMomId } = {}) => {
  const access_token = isSupabaseReady()
    ? (await supabase.auth.getSession()).data?.session?.access_token || null
    : null;
  if (!access_token && !seedMomId) throw new Error('Sign in to add photos');

  const dataUrl = await compressImageToDataUrl(file);
  const payload = access_token ? { access_token, dataUrl } : { seed_mom_id: seedMomId, dataUrl };

  let res;
  try {
    res = await fetch('/api/profile-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Could not reach the server');
  }
  let body = {};
  try { body = await res.json(); } catch { /* ignore */ }
  if (!res.ok || !body.url) throw new Error(body?.error || `Upload failed (${res.status})`);
  return body.url;
};

// Delete one profile photo: removes it from the profile AND deletes the blob.
// Resolves to the updated photos array (server-authoritative), or null for a
// local-only user (no session/seed) so the caller can fall back to a local
// filter. Throws on a real server error.
export const deleteProfilePhoto = async (url, { seedMomId } = {}) => {
  const access_token = isSupabaseReady()
    ? (await supabase.auth.getSession()).data?.session?.access_token || null
    : null;
  if (!access_token && !seedMomId) return null;

  const payload = access_token ? { access_token, url } : { seed_mom_id: seedMomId, url };
  let res;
  try {
    res = await fetch('/api/profile-photo/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Could not reach the server');
  }
  let body = {};
  try { body = await res.json(); } catch { /* ignore */ }
  if (!res.ok) throw new Error(body?.error || `Could not remove photo (${res.status})`);
  return Array.isArray(body.photos) ? body.photos : [];
};

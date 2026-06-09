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
// error if the user isn't signed in or the upload fails.
export const uploadProfilePhoto = async (file) => {
  if (!isSupabaseReady()) throw new Error('Sign in to add photos');
  const { data } = await supabase.auth.getSession();
  const access_token = data?.session?.access_token;
  if (!access_token) throw new Error('Sign in to add photos');

  const dataUrl = await compressImageToDataUrl(file);

  let res;
  try {
    res = await fetch('/api/profile-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token, dataUrl }),
    });
  } catch {
    throw new Error('Could not reach the server');
  }
  let body = {};
  try { body = await res.json(); } catch { /* ignore */ }
  if (!res.ok || !body.url) throw new Error(body?.error || `Upload failed (${res.status})`);
  return body.url;
};

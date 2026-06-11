// ============================================================================
// AiImageControl — Generate / Upload pair for a photo slot in an edit modal.
//
// Props:
//   kind     — string, e.g. 'place' | 'event'
//   record   — plain object, the current form state (used in generate prompt)
//   onImage  — (url: string, meta: { generated: boolean }) => void
//              called with the final public URL after either path completes
//
// Generate path: POST /api/admin/ai/image { kind, record } → { url, generated }
// Upload path  : FileReader → base64 dataUrl → POST /api/admin/upload-image
//                { kind, id: record?.id, dataUrl } → { url }
//
// busy is a string ('generate' | 'upload' | '') — only one inflight at a time.
// Hidden file input is reset after each pick so the same file triggers onChange
// again if the user re-uploads. NEVER writes to the DB.
// ============================================================================
import { useState, useRef } from 'react';
import { Wand2, Upload } from 'lucide-react';
import { AC } from '../admin-theme';
import { adminFetch } from '../lib/adminFetch';

export const AiImageControl = ({ kind, record, onImage }) => {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  // ── Generate ──────────────────────────────────────────────────────────────
  const generate = async () => {
    setBusy('generate');
    setErr('');
    try {
      const r = await adminFetch('/api/admin/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, record }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      if (!data.url) throw new Error('No URL returned from AI');
      onImage(data.url, { generated: true });
    } catch (e) {
      setErr(e.message || 'Generate failed');
    } finally {
      setBusy('');
    }
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    // Reset so the same file can be picked again if the user retries
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;

    setBusy('upload');
    setErr('');
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(file);
      });

      const r = await adminFetch('/api/admin/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id: record?.id ?? null, dataUrl }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      if (!data.url) throw new Error('No URL returned from upload');
      onImage(data.url, { generated: false });
    } catch (e) {
      setErr(e.message || 'Upload failed');
    } finally {
      setBusy('');
    }
  };

  const isBusy = busy !== '';

  const btnBase = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', borderRadius: AC.radiusSm,
    fontFamily: AC.font, fontSize: 12, fontWeight: 600,
    cursor: isBusy ? 'default' : 'pointer',
    opacity: isBusy ? 0.6 : 1,
    transition: 'background .12s, border-color .12s',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {/* Generate button */}
      <button
        type="button"
        disabled={isBusy}
        onClick={generate}
        style={{
          ...btnBase,
          background: busy === 'generate' ? AC.surfaceAlt : AC.accentSoft,
          color: busy === 'generate' ? AC.textMuted : AC.accent,
          border: `1px solid ${busy === 'generate' ? AC.border : AC.accentBorder}`,
        }}
      >
        <Wand2 size={13} />
        {busy === 'generate' ? 'Generating…' : '✨ Generate image'}
      </button>

      {/* Upload button (triggers hidden input) */}
      <button
        type="button"
        disabled={isBusy}
        onClick={() => fileRef.current?.click()}
        style={{
          ...btnBase,
          background: busy === 'upload' ? AC.surfaceAlt : AC.surface,
          color: busy === 'upload' ? AC.textMuted : AC.textSoft,
          border: `1px solid ${AC.border}`,
        }}
      >
        <Upload size={13} />
        {busy === 'upload' ? 'Uploading…' : 'Upload'}
      </button>

      {/* Hidden file input — reset-safe via ref */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Inline error */}
      {err && (
        <span style={{
          fontFamily: AC.font, fontSize: 11, color: AC.danger,
          maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} title={err}>
          {err}
        </span>
      )}
    </div>
  );
};

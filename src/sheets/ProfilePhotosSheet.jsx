import { useRef, useState } from 'react';
import { Plus, Star, X as XIcon } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { uploadProfilePhoto } from '../lib/profile-photo';

// ==========================================================================
// ProfilePhotosSheet — manage up to 5 profile photos. The first photo is the
// primary (what other moms see first). Tap the star to promote a photo, the X
// to remove. New photos upload to Vercel Blob, then the whole array is
// persisted by the parent via onSave (→ updateMomProfile({ photos })).
// ==========================================================================

const MAX = 5;

export const ProfilePhotosSheet = ({ photos = [], onSave, flash, onClose }) => {
  const list = Array.isArray(photos) ? photos : [];
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const remaining = Math.max(0, MAX - list.length);

  const commit = (next) => onSave?.(next.slice(0, MAX));

  const onPick = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, remaining);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    const added = [];
    try {
      for (const f of files) {
        try {
          added.push(await uploadProfilePhoto(f));
        } catch (err) {
          flash?.(err?.message || 'Upload failed');
          break;
        }
      }
      if (added.length) {
        commit([...list, ...added]);
        flash?.(`✦ ${added.length === 1 ? 'Photo added' : `${added.length} photos added`}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (i) => { commit(list.filter((_, idx) => idx !== i)); flash?.('Photo removed'); };
  const makePrimary = (i) => {
    if (i === 0) return;
    commit([list[i], ...list.filter((_, idx) => idx !== i)]);
    flash?.('✦ Primary photo updated');
  };

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}>
          Your photos
        </div>
        <h3 className="mt-1.5" style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.navy, letterSpacing: '-.02em' }}>
          Up to <span style={{ fontStyle: 'italic', color: C.coral }}>five</span> · first is primary
        </h3>
        <p style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>
          Your primary photo is what other moms see first. Tap the star to make a photo primary.
        </p>

        <div className="mt-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {list.map((url, i) => (
            <div key={`${url}-${i}`} style={{
              position: 'relative', aspectRatio: '1', borderRadius: 14, overflow: 'hidden',
              border: i === 0 ? `2px solid ${C.coral}` : `1px solid ${C.line}`,
            }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
              <button onClick={() => removeAt(i)} aria-label="Remove photo" style={{
                position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: 12,
                background: 'rgba(20,14,16,.55)', color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <XIcon size={13}/>
              </button>
              {i === 0 ? (
                <div style={{
                  position: 'absolute', left: 5, bottom: 5, display: 'inline-flex', alignItems: 'center', gap: 3,
                  background: C.coral, color: '#fff', borderRadius: 999, padding: '3px 8px',
                  fontFamily: 'Albert Sans', fontSize: 9.5, fontWeight: 800,
                }}>
                  <Star size={9} fill="#fff"/> Primary
                </div>
              ) : (
                <button onClick={() => makePrimary(i)} aria-label="Make primary photo" style={{
                  position: 'absolute', left: 5, bottom: 5, display: 'inline-flex', alignItems: 'center', gap: 3,
                  background: 'rgba(255,255,255,.92)', color: C.coralDeep, borderRadius: 999, padding: '3px 8px',
                  border: 'none', cursor: 'pointer', fontFamily: 'Albert Sans', fontSize: 9.5, fontWeight: 800,
                }}>
                  <Star size={9}/> Primary
                </button>
              )}
            </div>
          ))}

          {list.length < MAX && (
            <button
              onClick={() => !busy && inputRef.current?.click()}
              disabled={busy}
              style={{
                aspectRatio: '1', borderRadius: 14, cursor: busy ? 'default' : 'pointer',
                border: `1.5px dashed ${C.coral}`, background: `${C.coralSoft}66`, color: C.coralDeep,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >
              <Plus size={22}/>
              <span style={{ fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700 }}>
                {busy ? 'Uploading…' : 'Add photo'}
              </span>
            </button>
          )}
        </div>

        <div style={{ marginTop: 10, fontFamily: 'Albert Sans', fontSize: 10.5, color: C.muted }}>
          {list.length}/{MAX} photos
        </div>

        <input ref={inputRef} type="file" accept="image/*" multiple onChange={onPick} style={{ display: 'none' }}/>
      </div>
    </Sheet>
  );
};

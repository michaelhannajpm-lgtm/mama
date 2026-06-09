import { useState } from 'react';
import { C } from '../theme';
import { X, Star } from 'lucide-react';

const FIELDS = [
  ['name', 'Name'], ['category', 'Category'], ['area', 'Area'], ['address', 'Address'],
  ['website', 'Website'], ['reference_url', 'Reference URL'], ['phone', 'Phone'],
];
const CATS = ['fun','sports','wellness','schools','childcare','extracurricular','camps','health'];

export const PlaceEditModal = ({ place, adminFetch, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: place.name || '', category: place.category || 'fun', area: place.area || '',
    address: place.address || '', website: place.website || '', reference_url: place.reference_url || '',
    phone: place.phone || '', description: place.description || '', tags: (place.tags || []).join(', '),
    visible: !!place.visible, review_status: place.review_status || 'needs_review',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const photos = place.place_photos || [];

  const post = async (payload, label) => {
    setBusy(true);
    try {
      const r = await adminFetch('/api/admin/places/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || r.status); }
      return true;
    } catch (e) { alert(`${label} failed: ${e.message}`); return false; }
    finally { setBusy(false); }
  };

  const save = async () => {
    const patch = {
      name: form.name, category: form.category, area: form.area || null, address: form.address || null,
      website: form.website || null, reference_url: form.reference_url || null, phone: form.phone || null,
      description: form.description || null, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      visible: form.visible, review_status: form.review_status,
    };
    if (await post({ id: place.id, patch }, 'Save')) await onSaved();
  };

  const setHero = async (url) => { if (await post({ id: place.id, patch: { hero_photo: url } }, 'Set hero')) await onSaved(); };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.paper, borderRadius: 16, width: 560, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', padding: 20 }}>
        <div className="flex items-center mb-3">
          <h3 style={{ fontFamily: 'Fraunces', fontSize: 18, color: C.ink, flex: 1 }}>Edit place</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {/* Photos + hero picker */}
        {photos.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {photos.map(p => {
              // Stable hero value: a stored url, or the WIDTH-AGNOSTIC proxy path
              // for Google photos (consumer picks width). `thumb` adds w=200 for
              // display only — we never persist the thumbnail width as the hero.
              const heroRef = p.url || (p.google_ref ? `/api/places/photo?ref=${encodeURIComponent(p.google_ref)}` : null);
              const thumb = p.url || (heroRef ? `${heroRef}&w=200` : null);
              const isHero = place.hero_photo ? place.hero_photo === heroRef : p.is_hero;
              return (
                <button key={p.id} onClick={() => heroRef && setHero(heroRef)} title="Set as hero"
                  style={{ position: 'relative', width: 84, height: 64, borderRadius: 8, overflow: 'hidden', border: `2px solid ${isHero ? C.saffron : C.divider}`, background: thumb ? `center/cover url(${thumb})` : C.lilac, cursor: 'pointer' }}>
                  {isHero && <Star size={13} fill={C.saffron} color={C.saffron} style={{ position: 'absolute', top: 3, right: 3 }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* Fields */}
        <div className="grid grid-cols-2 gap-2">
          {FIELDS.map(([k, label]) => k === 'category' ? (
            <label key={k} style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>{label}
              <select value={form.category} onChange={e => set('category', e.target.value)}
                style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          ) : (
            <label key={k} style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>{label}
              <input value={form[k]} onChange={e => set(k, e.target.value)}
                style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }} />
            </label>
          ))}
        </div>
        <label style={{ display: 'block', marginTop: 8, fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>Description
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
            style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }} />
        </label>
        <label style={{ display: 'block', marginTop: 8, fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>Tags (comma-separated)
          <input value={form.tags} onChange={e => set('tags', e.target.value)}
            style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }} />
        </label>

        <div className="flex items-center gap-3 mt-3">
          <label style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.ink }}>
            <input type="checkbox" checked={form.visible} onChange={e => set('visible', e.target.checked)} /> visible in app
          </label>
          <select value={form.review_status} onChange={e => set('review_status', e.target.value)}
            style={{ border: `1px solid ${C.divider}`, borderRadius: 8, padding: '5px 8px', fontSize: 12.5 }}>
            {['needs_review','approved','rejected','archived'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button disabled={busy} onClick={save}
            style={{ marginLeft: 'auto', background: C.terracotta, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

import { useMemo, useState } from 'react';
import { CheckCircle2, RefreshCw, Search, UserRound, X } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { MOM_TYPES } from '../data/taxonomy';

const MOM_TYPE_LABELS = Object.fromEntries(MOM_TYPES.map(t => [t.id, t.label]));

const listText = (value) => Array.isArray(value) ? value.join(' ') : '';
const labelMomTypes = (types = []) => types.map(t => MOM_TYPE_LABELS[t] || t).join(', ');

const fmtKids = (kids) => {
  if (!kids || typeof kids !== 'object') return '';
  return Object.entries(kids)
    .filter(([, count]) => Number(count) > 0)
    .map(([age, count]) => `${count}x ${age}`)
    .join(', ');
};

export const SeededMomLoginSheet = ({
  rows = [],
  loading,
  error,
  onRefresh,
  onSelect,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row => [
      row.display_name, row.username, row.city, row.neighborhood, row.county,
      labelMomTypes(row.mom_types),
      listText(row.values),
      listText(row.interests),
      fmtKids(row.kids_ages),
    ].some(v => (v || '').toLowerCase().includes(q)));
  }, [rows, query]);

  return (
    <Sheet onClose={onClose} tall hideClose>
      <div
        className="px-5 pt-2 pb-3 flex items-center justify-between border-b"
        style={{ borderColor: C.divider, background: C.cream }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-2 -ml-2"
          style={{ color: C.inkSoft }}
        >
          <X size={18}/>
        </button>
        <div style={{ textAlign: 'center', minWidth: 0 }}>
          <h2 style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 500, color: C.ink, letterSpacing: '-.01em' }}>
            Seeded mom login
          </h2>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 11, color: C.inkMuted, marginTop: 2 }}>
            {loading ? 'Loading...' : `${filtered.length} of ${rows.length} profiles`}
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          aria-label="Reload seeded profiles"
          className="rounded-full p-2 -mr-2"
          style={{ color: C.inkSoft, opacity: loading ? 0.5 : 1 }}
        >
          <RefreshCw size={17}/>
        </button>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center gap-2 rounded-full" style={{
          height: 40, padding: '0 13px',
          background: C.paper, border: `1px solid ${C.divider}`,
        }}>
          <Search size={14} color={C.inkMuted}/>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name, city, interests..."
            className="flex-1 min-w-0 bg-transparent outline-none text-[13px]"
            style={{ fontFamily: 'Albert Sans', color: C.ink, fontWeight: 600 }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear"
              className="rounded-full flex items-center justify-center"
              style={{ width: 20, height: 20, background: C.line, color: C.ink }}
            >
              <X size={11}/>
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-xl px-3 py-2 text-[12.5px]" style={{
            background: `${C.terracotta}18`,
            border: `1px solid ${C.terracotta}`,
            color: C.ink,
            fontFamily: 'Albert Sans',
          }}>
            {error}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {loading && rows.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl" style={{ height: 74, background: C.paper, border: `1px solid ${C.divider}`, opacity: 0.65 }}/>
            ))
          ) : filtered.length ? (
            filtered.map(row => {
              const photo = row.photos?.[0];
              const place = [row.neighborhood, row.city].filter(Boolean).join(', ');
              return (
                <button
                  key={row.id || row.username}
                  onClick={() => onSelect(row)}
                  className="w-full rounded-2xl p-3 flex items-center gap-3 text-left active:scale-[.99] transition-transform"
                  style={{ background: C.paper, border: `1px solid ${C.divider}` }}
                >
                  <div
                    className="rounded-full overflow-hidden flex items-center justify-center"
                    style={{ width: 52, height: 52, background: C.cream, flexShrink: 0 }}
                  >
                    {photo ? (
                      <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    ) : (
                      <UserRound size={20} color={C.inkMuted}/>
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="flex items-center gap-1.5" style={{ minWidth: 0 }}>
                      <span style={{
                        fontFamily: 'Albert Sans', fontSize: 14, fontWeight: 800,
                        color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {row.display_name || row.username || 'Seed mom'}
                      </span>
                      {row.verified && <CheckCircle2 size={13} color={C.sageDark} style={{ flexShrink: 0 }}/>}
                    </div>
                    <div style={{
                      fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkMuted,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      @{row.username || 'seed'} · {place || 'Tampa Bay'}
                    </div>
                    <div style={{
                      fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft, marginTop: 3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {labelMomTypes(row.mom_types) || 'Mom'} · {fmtKids(row.kids_ages) || 'kids'}
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-2xl px-4 py-8 text-center" style={{ background: C.paper, border: `1px solid ${C.divider}` }}>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.inkSoft, fontWeight: 700 }}>
                No seeded moms found.
              </div>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.inkMuted, marginTop: 5 }}>
                Run the admin seed with 1000 moms, then reload.
              </div>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
};

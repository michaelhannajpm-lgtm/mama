import { useEffect, useRef, useState } from 'react';
import { MapPin, ChevronDown, Search } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from './Sheet';
import { searchAreas, POPULAR_AREAS } from '../lib/places.js';

export const NeighborhoodPicker = ({ value, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  // Debounced search; empty query falls back to popular areas.
  useEffect(() => {
    const id = setTimeout(() => {
      setResults(query.trim() ? searchAreas(query) : POPULAR_AREAS);
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (open) {
      setResults(POPULAR_AREAS);
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery('');
    }
  }, [open]);

  const pick = (entry) => {
    onSelect(entry);
    setOpen(false);
  };

  const showingPopular = !query.trim();

  return (
    <>
      {/* Closed field — select-styled */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between active:scale-[.99] transition-transform"
        style={{
          background: '#fff',
          border: `1.5px solid ${value ? C.coral : '#EFE3D0'}`,
          borderRadius: 13, padding: '13px 14px', cursor: 'pointer',
          boxShadow: value ? '0 6px 14px -8px rgba(214,68,106,.3)' : '0 1px 2px rgba(27,42,78,.04)',
        }}
      >
        <span className="flex items-center" style={{ gap: 9, minWidth: 0 }}>
          <MapPin size={16} color={value ? C.coral : C.muted} style={{ flexShrink: 0 }} />
          <span style={{
            fontFamily: 'Albert Sans', fontSize: 13.5,
            fontWeight: value ? 700 : 500,
            color: value ? C.navy : C.muted,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {value ? value.label : 'Choose your neighborhood'}
          </span>
        </span>
        <ChevronDown size={16} color={C.muted} style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <Sheet onClose={() => setOpen(false)} tall>
          <div style={{ padding: '4px 16px 16px' }}>
            <h3 style={{
              fontFamily: 'Fraunces', fontSize: 19, fontWeight: 700,
              color: C.navy, margin: '0 0 12px',
            }}>
              Find your area
            </h3>

            {/* Search input */}
            <div className="flex items-center" style={{
              gap: 9, background: '#fff', border: `1.5px solid ${C.coral}`,
              borderRadius: 13, padding: '11px 13px',
            }}>
              <Search size={15} color={C.muted} style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a city or neighborhood…"
                style={{
                  border: 'none', outline: 'none', width: '100%',
                  background: 'transparent', fontFamily: 'Albert Sans',
                  fontSize: 13.5, color: C.navy,
                }}
              />
            </div>

            {/* Section label */}
            <div style={{
              fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800,
              letterSpacing: '.13em', textTransform: 'uppercase',
              color: C.muted, margin: '16px 2px 6px',
            }}>
              {showingPopular ? 'Popular areas' : 'Matches'}
            </div>

            {/* Results */}
            {results.length === 0 ? (
              <div style={{
                fontFamily: 'Albert Sans', fontSize: 13, color: C.muted,
                padding: '14px 2px',
              }}>
                No matches in the Tampa Bay area. Try a nearby city.
              </div>
            ) : (
              <div>
                {results.map((a) => {
                  const active = value?.id === a.id;
                  const sub = [a.neighborhood ? a.city : null, `${a.county} County`]
                    .filter(Boolean).join(' · ');
                  return (
                    <button
                      key={a.id}
                      onClick={() => pick(a)}
                      className="w-full flex items-center active:scale-[.99] transition-transform"
                      style={{
                        gap: 11, padding: '11px 8px', cursor: 'pointer',
                        background: active ? C.coralSoft : 'transparent',
                        border: 'none', borderRadius: 10, textAlign: 'left',
                        borderBottom: `1px solid ${C.line}`,
                      }}
                    >
                      <MapPin size={15} color={active ? C.coral : C.muted} style={{ flexShrink: 0 }} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{
                          display: 'block', fontFamily: 'Albert Sans', fontSize: 13.5,
                          fontWeight: 600, color: C.navy,
                        }}>{a.label}</span>
                        <span style={{
                          display: 'block', fontFamily: 'Albert Sans', fontSize: 10.5,
                          color: C.muted, marginTop: 1,
                        }}>{sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
};

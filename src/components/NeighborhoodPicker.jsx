import { useEffect, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { C } from '../theme';
import { searchAreas } from '../lib/places.js';

// Inline city/neighborhood search. The box itself is the input — type to
// filter, tap a match to select. No nested drawer, no popular-areas default:
// results appear below only once the user starts typing.
export const NeighborhoodPicker = ({ value, onSelect }) => {
  const [query, setQuery] = useState(value?.label || '');

  // Reflect selections made outside the box (e.g. "use my location" GPS) by
  // writing the resolved city/area name into the input.
  useEffect(() => {
    if (value?.label) setQuery(value.label);
  }, [value?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = query.trim() ? searchAreas(query) : [];
  // Hide the list once the query matches the picked value (i.e. right after a
  // selection) so it doesn't linger; show it again as soon as the user edits.
  const showResults = query.trim().length > 0 && query !== value?.label;

  const pick = (entry) => {
    onSelect(entry);
    setQuery(entry.label);
  };

  return (
    <div>
      {/* Search field */}
      <div className="flex items-center" style={{
        gap: 9, background: '#fff',
        border: `1.5px solid ${value ? C.coral : '#EFE3D0'}`,
        borderRadius: 13, padding: '13px 14px',
        boxShadow: value ? '0 6px 14px -8px rgba(214,68,106,.3)' : '0 1px 2px rgba(27,42,78,.04)',
      }}>
        <Search size={15} color={C.muted} style={{ flexShrink: 0 }} />
        <input
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

      {/* Results — only while typing */}
      {showResults && (
        <div style={{
          marginTop: 8, maxHeight: 240, overflowY: 'auto',
          border: `1px solid ${C.line}`, borderRadius: 12, background: '#fff',
        }}>
          {results.length === 0 ? (
            <div style={{
              fontFamily: 'Albert Sans', fontSize: 13, color: C.muted,
              padding: '14px',
            }}>
              No matches in the Tampa Bay area. Try a nearby city.
            </div>
          ) : (
            results.map((a, i) => {
              const active = value?.id === a.id;
              const sub = [a.neighborhood ? a.city : null, `${a.county} County`]
                .filter(Boolean).join(' · ');
              return (
                <button
                  key={a.id}
                  onClick={() => pick(a)}
                  className="w-full flex items-center active:scale-[.99] transition-transform"
                  style={{
                    gap: 11, padding: '11px 12px', cursor: 'pointer',
                    background: active ? C.coralSoft : 'transparent',
                    border: 'none', textAlign: 'left',
                    borderBottom: i === results.length - 1 ? 'none' : `1px solid ${C.line}`,
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
            })
          )}
        </div>
      )}
    </div>
  );
};

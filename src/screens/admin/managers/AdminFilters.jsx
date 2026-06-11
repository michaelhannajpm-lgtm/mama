// Reusable filter-bar primitives shared by PlacesManager + EventsManager:
// a checkbox MultiSelect dropdown, a collapsible search, a view dropdown, and
// the status chip row. Each accepts an `accent` color so each manager keeps
// its identity (terracotta for places, sage for events).
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search as SearchIcon } from 'lucide-react';
import { C } from '../../../theme';
import { STATUSES, statusColor } from './adminRows';

const fieldStyle = {
  border: `1px solid ${C.divider}`, borderRadius: 8, padding: '5px 8px',
  fontFamily: 'Albert Sans', fontSize: 12.5, background: C.paper, color: C.ink,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
};

// Checkbox dropdown with typeahead filtering. `options` is an array of strings
// or {value,label}. `selected` is an array; `onChange` gets the next array.
// A typeahead input appears at the top of the dropdown when there are more
// than 6 options; users can type to narrow the list before checking.
export const MultiSelect = ({ label, options, selected, onChange, accent = C.terracotta }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  useEffect(() => { if (!open) setQuery(''); }, [open]);

  const opts = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o));
  const q = query.trim().toLowerCase();
  const visible = q
    ? opts.filter(o => `${o.label} ${o.value}`.toLowerCase().includes(q))
    : opts;
  const sel = new Set(selected);
  const toggle = (v) => { const n = new Set(sel); n.has(v) ? n.delete(v) : n.add(v); onChange([...n]); };
  const count = selected.length;
  const showSearch = opts.length > 6;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ ...fieldStyle, borderColor: count ? accent : C.divider, color: count ? accent : C.ink, fontWeight: count ? 600 : 400 }}>
        {label}{count ? ` (${count})` : ''} <ChevronDown size={13} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', zIndex: 40, marginTop: 4, minWidth: 220, maxHeight: 320,
          overflowY: 'auto', background: C.paper, border: `1px solid ${C.divider}`,
          borderRadius: 10, boxShadow: '0 8px 24px -8px rgba(27,42,78,.28)', padding: 6,
        }}>
          {showSearch && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px 6px', borderBottom: `1px solid ${C.divider}`, marginBottom: 4 }}>
              <SearchIcon size={12} style={{ color: C.inkMuted, flexShrink: 0 }} />
              <input
                value={query}
                autoFocus
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Type to filter ${label.toLowerCase()}…`}
                style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontFamily: 'Albert Sans', fontSize: 12.5, background: 'transparent', color: C.ink }}
              />
            </div>
          )}
          {count > 0 && (
            <button onClick={() => onChange([])}
              style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: C.inkMuted, fontFamily: 'Albert Sans', fontSize: 12, padding: '4px 6px', cursor: 'pointer' }}>
              Clear ({count})
            </button>
          )}
          {visible.length === 0 && (
            <div style={{ padding: '6px', fontFamily: 'Albert Sans', fontSize: 12, color: C.inkMuted }}>
              {opts.length === 0 ? 'No options' : 'No matches'}
            </div>
          )}
          {visible.map(o => (
            <label key={o.value}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', fontFamily: 'Albert Sans', fontSize: 12.5, color: C.ink, cursor: 'pointer', borderRadius: 6 }}>
              <input type="checkbox" checked={sel.has(o.value)} onChange={() => toggle(o.value)} />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

// Single-select dropdown with typeahead. Same look as MultiSelect but only one
// value at a time. Used for filter controls that aren't binary (e.g. Photo,
// minRating) but might benefit from typing instead of scrolling.
export const TypeaheadSelect = ({ label, value, onChange, options, accent = C.terracotta, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  useEffect(() => { if (!open) setQuery(''); }, [open]);

  const opts = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o));
  const q = query.trim().toLowerCase();
  const visible = q ? opts.filter(o => `${o.label} ${o.value}`.toLowerCase().includes(q)) : opts;
  const selected = opts.find(o => o.value === value);
  const showSearch = opts.length > 6;
  const hasValue = value != null && value !== '' && value !== 0 && value !== 'any';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ ...fieldStyle, borderColor: hasValue ? accent : C.divider, color: hasValue ? accent : C.ink, fontWeight: hasValue ? 600 : 400 }}>
        {label ? `${label}: ` : ''}{selected ? selected.label : (placeholder || 'Any')} <ChevronDown size={13} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', zIndex: 40, marginTop: 4, minWidth: 200, maxHeight: 320,
          overflowY: 'auto', background: C.paper, border: `1px solid ${C.divider}`,
          borderRadius: 10, boxShadow: '0 8px 24px -8px rgba(27,42,78,.28)', padding: 6,
        }}>
          {showSearch && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px 6px', borderBottom: `1px solid ${C.divider}`, marginBottom: 4 }}>
              <SearchIcon size={12} style={{ color: C.inkMuted }} />
              <input value={query} autoFocus onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to filter…"
                style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontFamily: 'Albert Sans', fontSize: 12.5, background: 'transparent', color: C.ink }} />
            </div>
          )}
          {visible.length === 0 && (
            <div style={{ padding: '6px', fontFamily: 'Albert Sans', fontSize: 12, color: C.inkMuted }}>No matches</div>
          )}
          {visible.map(o => (
            <button key={String(o.value)} onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                width: '100%', textAlign: 'left', padding: '4px 8px', borderRadius: 6,
                background: o.value === value ? `${accent}15` : 'transparent', color: C.ink,
                border: 'none', cursor: 'pointer', fontFamily: 'Albert Sans', fontSize: 12.5,
              }}>{o.label}</button>
          ))}
        </div>
      )}
    </div>
  );
};

// Search icon that expands to an input on click; collapses on blur when empty.
export const CollapsibleSearch = ({ value, onChange, accent = C.terracotta }) => {
  const [open, setOpen] = useState(!!value);
  const inputRef = useRef(null);
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} title="Search" aria-label="Search"
        style={{ ...fieldStyle, padding: '6px 7px' }}>
        <SearchIcon size={15} style={{ color: C.inkMuted }} />
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1" style={{ border: `1px solid ${value ? accent : C.divider}`, borderRadius: 8, padding: '3px 8px', background: C.paper }}>
      <SearchIcon size={13} style={{ color: C.inkMuted }} />
      <input ref={inputRef} value={value} onChange={e => onChange(e.target.value)}
        onBlur={() => { if (!value) setOpen(false); }}
        placeholder="search for anything"
        style={{ border: 'none', outline: 'none', fontFamily: 'Albert Sans', fontSize: 12.5, width: 240, background: 'transparent', color: C.ink }} />
    </div>
  );
};

// View dropdown (e.g. Grid / Map).
export const ViewMenu = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

// Colored pill showing a row's review_status (orange when needs_review).
export const StatusBadge = ({ status }) => (
  <span style={{ background: `${statusColor(status)}22`, color: statusColor(status), borderRadius: 999, padding: '2px 10px', fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700 }}>
    {status}
  </span>
);

// Pill showing whether the row is visible in the app.
export const VisibilityBadge = ({ visible }) => (
  <span style={{ background: visible ? `${C.sageDark}22` : `${C.inkMuted}22`, color: visible ? C.sageDark : C.inkMuted, borderRadius: 999, padding: '2px 10px', fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700 }}>
    {visible ? 'Visible' : 'Hidden'}
  </span>
);

// Status filter chips with per-status counts.
export const StatusChips = ({ status, setStatus, counts, accent = C.terracotta }) => {
  const chip = (active, onClick, label) => (
    <button key={label} onClick={onClick} style={{
      background: active ? accent : 'transparent', color: active ? '#fff' : C.inkSoft,
      border: `1px solid ${active ? accent : C.divider}`, borderRadius: 999,
      padding: '4px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer',
    }}>{label}</button>
  );
  return (
    <>
      {chip(status === 'all', () => setStatus('all'), `All (${counts.all})`)}
      {STATUSES.map(s => chip(status === s, () => setStatus(s), `${s} (${counts[s]})`))}
    </>
  );
};

// ============================================================================
// Admin console primitives — the shared vocabulary every section is built from.
// All styling pulls from `AC` (admin-theme.js). Keep app-facing tokens (`C`)
// out of this file. See `.claude/skills/admin-design/SKILL.md`.
// ============================================================================
import { AC, AC_TONES } from '../admin-theme';

// ---- Card -----------------------------------------------------------------
export const Card = ({ children, padding = 18, style, className = '' }) => (
  <div
    className={className}
    style={{
      background: AC.surface,
      border: `1px solid ${AC.border}`,
      borderRadius: AC.radius,
      boxShadow: AC.shadow,
      padding,
      ...style,
    }}
  >
    {children}
  </div>
);

// ---- PageHeader -----------------------------------------------------------
// The title block at the top of every section: title, subtitle, right-side
// actions. Keeps section headers consistent regardless of content below.
export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex items-start justify-between gap-4 mb-5">
    <div>
      <h2 style={{ fontFamily: AC.font, fontSize: 21, fontWeight: 700, color: AC.text, letterSpacing: '-.01em', lineHeight: 1.1 }}>
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1" style={{ fontFamily: AC.font, fontSize: 13, color: AC.textMuted, lineHeight: 1.45, maxWidth: 620 }}>
          {subtitle}
        </p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

// ---- Button ---------------------------------------------------------------
// variants: primary | secondary | ghost | danger
export const Button = ({ variant = 'secondary', size = 'md', icon: Icon, children, style, ...rest }) => {
  const pad = size === 'sm' ? '6px 10px' : '8px 13px';
  const fs = size === 'sm' ? 12 : 13;
  const v = {
    primary: { background: AC.accent, color: AC.accentText, border: `1px solid ${AC.accent}` },
    secondary: { background: AC.surface, color: AC.text, border: `1px solid ${AC.borderStrong}` },
    ghost: { background: 'transparent', color: AC.textSoft, border: '1px solid transparent' },
    danger: { background: AC.surface, color: AC.danger, border: `1px solid ${AC.dangerBorder}` },
  }[variant];
  return (
    <button
      {...rest}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: pad, borderRadius: AC.radiusSm, fontFamily: AC.font,
        fontWeight: 600, fontSize: fs, cursor: rest.disabled ? 'default' : 'pointer',
        opacity: rest.disabled ? 0.55 : 1, whiteSpace: 'nowrap', transition: 'background .12s, border-color .12s',
        ...v, ...style,
      }}
    >
      {Icon && <Icon size={size === 'sm' ? 13 : 14} />}
      {children}
    </button>
  );
};

// ---- Badge ----------------------------------------------------------------
export const Badge = ({ tone = 'neutral', children, dot = false, style }) => {
  const t = AC_TONES[tone] || AC_TONES.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: AC.radiusPill,
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      fontFamily: AC.font, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: t.fg }} />}
      {children}
    </span>
  );
};

// ---- StatCard -------------------------------------------------------------
// The KPI tile. Big number, label, optional delta/hint. Numbers are tabular.
export const StatCard = ({ label, value, hint, tone, icon: Icon }) => (
  <Card padding={16}>
    <div className="flex items-center justify-between">
      <div className="uppercase" style={{ fontFamily: AC.font, fontSize: 10.5, letterSpacing: '.12em', fontWeight: 700, color: AC.textMuted }}>
        {label}
      </div>
      {Icon && <Icon size={15} style={{ color: AC.textFaint }} />}
    </div>
    <div className="mt-1.5 tabular-nums" style={{ fontFamily: AC.font, fontSize: 28, fontWeight: 700, color: tone || AC.text, letterSpacing: '-.02em', lineHeight: 1 }}>
      {value}
    </div>
    {hint && (
      <div className="mt-1" style={{ fontFamily: AC.font, fontSize: 12, color: AC.textMuted }}>
        {hint}
      </div>
    )}
  </Card>
);

// ---- DataTable ------------------------------------------------------------
// columns: [{ key, header, width?, align?, mono?, render?(row) }]
// A dense, console-standard table with a sticky-styled head and zebra hover.
export const DataTable = ({ columns, rows, rowKey = (r, i) => r.id ?? i, empty = 'No rows.', onRowClick }) => {
  if (!rows || rows.length === 0) {
    return (
      <div className="text-center" style={{ padding: '28px 16px', fontFamily: AC.font, fontSize: 13, color: AC.textMuted }}>
        {empty}
      </div>
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontFamily: AC.font }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{
                textAlign: c.align || 'left', padding: '9px 12px', width: c.width,
                background: AC.surfaceAlt, borderBottom: `1px solid ${AC.border}`,
                position: 'sticky', top: 0,
                fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: AC.textMuted, whiteSpace: 'nowrap',
              }}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={rowKey(r, i)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = AC.surfaceAlt; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {columns.map((c) => (
                <td key={c.key} style={{
                  textAlign: c.align || 'left', padding: '10px 12px',
                  borderBottom: `1px solid ${AC.divider}`,
                  fontSize: 12.5, color: AC.text,
                  fontFamily: c.mono ? AC.mono : AC.font,
                  whiteSpace: c.wrap ? 'normal' : 'nowrap',
                  fontVariantNumeric: c.mono ? 'tabular-nums' : undefined,
                }}>
                  {c.render ? c.render(r) : r[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ---- Toolbar --------------------------------------------------------------
// A horizontal control strip (search, filters, actions) above a table.
export const Toolbar = ({ children, style }) => (
  <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 14, ...style }}>
    {children}
  </div>
);

// ---- Input ----------------------------------------------------------------
export const Input = ({ style, ...rest }) => (
  <input
    {...rest}
    style={{
      background: AC.surface, border: `1px solid ${AC.borderStrong}`, borderRadius: AC.radiusSm,
      padding: '8px 11px', fontFamily: AC.font, fontSize: 13, color: AC.text, outline: 'none',
      ...style,
    }}
  />
);

// ---- EmptyState -----------------------------------------------------------
export const EmptyState = ({ icon: Icon, title, body, action }) => (
  <Card>
    <div className="text-center" style={{ padding: '34px 18px' }}>
      {Icon && (
        <div className="mx-auto mb-3 flex items-center justify-center"
          style={{ width: 44, height: 44, borderRadius: 12, background: AC.surfaceSunken }}>
          <Icon size={20} style={{ color: AC.textMuted }} />
        </div>
      )}
      <div style={{ fontFamily: AC.font, fontSize: 15, fontWeight: 700, color: AC.text }}>{title}</div>
      {body && <div className="mt-1 mx-auto" style={{ fontFamily: AC.font, fontSize: 13, color: AC.textMuted, maxWidth: 380, lineHeight: 1.5 }}>{body}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  </Card>
);

// ---- Banner ---------------------------------------------------------------
export const Banner = ({ tone = 'danger', icon: Icon, children }) => {
  const t = AC_TONES[tone] || AC_TONES.danger;
  return (
    <div className="flex items-start gap-2.5" style={{
      background: t.bg, border: `1px solid ${t.bd}`, borderRadius: AC.radiusSm,
      padding: '11px 13px', marginBottom: 16,
    }}>
      {Icon && <Icon size={16} style={{ color: t.fg, flexShrink: 0, marginTop: 1 }} />}
      <div style={{ fontFamily: AC.font, fontSize: 12.5, color: AC.text, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
};

// ---- relative-time + number helpers (console-wide) ------------------------
export const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString());
export const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '0%');
export const rel = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
};

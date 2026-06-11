// ============================================================================
// Go Mama · Admin Console design tokens — the `AC` object (named export).
//
// DELIBERATELY SEPARATE from the phone-app palette in `src/theme.js` (`C`).
// The phone app is a warm coral/navy editorial magazine cover; the admin
// console is a neutral, dense, data-first operator surface. Do NOT mix the two:
//
//   • App-facing UI (screens/, sheets/, components/) → import `C` from theme.js
//   • Admin console UI (screens/admin/**)            → import `AC` from here
//
// See `.claude/skills/admin-design/SKILL.md` for the full system + rules.
// The single point of overlap is the brand accent (Go Mama coral), so the
// console still reads as the same product — everything else is its own world.
//
// ----------------------------------------------------------------------------
// THEMING (light / dark / system) — added 2026-06-11.
//
// Every COLOR token below resolves to a CSS custom property: `var(--ac-x, …)`.
// The fallback is the LIGHT value, so the console renders correctly even before
// any theme attribute is applied. The actual values live in `LIGHT` / `DARK`
// (below) and are emitted as `AC_THEME_CSS`; `useAdminTheme` flips the active
// set by setting `data-ac-theme="light|dark"` on <html>.
//
// Because tokens are CSS variables, switching themes needs ZERO component
// changes and zero re-renders — the cascade re-resolves every `AC.x` reference
// automatically, including inside portals and memoized subtrees. The only rule
// for consumers: a color token is a CSS *value*, so don't string-concatenate an
// alpha suffix onto it (`${AC.accent}33` would become `var(...)33` — invalid).
// Use the `*Soft` / `*Border` tokens, or `color-mix(in srgb, AC.x N%, transparent)`.
// ============================================================================

// ---- Per-theme color values ------------------------------------------------
// Keys here become CSS custom properties `--ac-<key>`. Anything NOT listed here
// (radii, widths, fonts) is a plain literal on `AC` and never themes.

const LIGHT = {
  // Surfaces (light, cool, neutral)
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFBFC',
  surfaceSunken: '#F0F2F5',

  // Sidebar (dark operator rail)
  railBg: '#131823',
  railText: '#9AA3B2',
  railTextActive: '#FFFFFF',
  railActiveBg: 'rgba(233,107,125,0.16)',
  railActiveBar: '#E96B7D',
  railHover: 'rgba(255,255,255,0.06)',
  railBorder: 'rgba(255,255,255,0.08)',
  railMuted: '#5B6472',

  // Borders / lines
  border: '#E6E8EC',
  borderStrong: '#D5D9DF',
  divider: '#EEF0F3',

  // Text
  text: '#1A2233',
  textSoft: '#566175',
  textMuted: '#8A93A3',
  textFaint: '#AEB5C0',

  // Brand accent (the ONE tie to the phone app)
  accent: '#E96B7D',
  accentHover: '#D6446A',
  accentText: '#FFFFFF',
  accentSoft: '#FCEEF0',
  accentBorder: '#F6CFD6',

  // Semantic states
  success: '#1E7A4D', successSoft: '#E7F3EC', successBorder: '#C5E4D2',
  warn: '#B7791F', warnSoft: '#FBF1DD', warnBorder: '#F0DCB0',
  danger: '#D0463B', dangerSoft: '#FBEAE8', dangerBorder: '#F2C9C4',
  info: '#2563C9', infoSoft: '#E8EFFB', infoBorder: '#C7D8F4',
  neutral: '#6B7382', neutralSoft: '#F0F2F5', neutralBorder: '#E1E4E9',

  // Elevation
  shadow: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
  shadowLg: '0 8px 28px rgba(16,24,40,0.12)',
};

const DARK = {
  // Surfaces (deep slate, layered)
  bg: '#0E1117',
  surface: '#161B24',
  surfaceAlt: '#1C222D',
  surfaceSunken: '#11151C',

  // Sidebar — rail sits a touch darker than the page so it still reads as a rail
  railBg: '#0A0D13',
  railText: '#8B95A6',
  railTextActive: '#FFFFFF',
  railActiveBg: 'rgba(233,107,125,0.22)',
  railActiveBar: '#E96B7D',
  railHover: 'rgba(255,255,255,0.06)',
  railBorder: 'rgba(255,255,255,0.08)',
  railMuted: '#5B6472',

  // Borders / lines
  border: '#2A313D',
  borderStrong: '#3A434F',
  divider: '#222932',

  // Text
  text: '#E6EAF0',
  textSoft: '#AAB3C0',
  textMuted: '#7A8494',
  textFaint: '#5A6373',

  // Brand accent — same coral as light so buttons read identically; soft/border
  // become dark coral washes so badges/tints work on the dark surface.
  accent: '#E96B7D',
  accentHover: '#F0909D',
  accentText: '#FFFFFF',
  accentSoft: '#2E1B20',
  accentBorder: '#4A2A31',

  // Semantic states — foregrounds brightened for dark; success kept dark enough
  // that the (white-text) action buttons relying on it stay legible.
  success: '#2E9D63', successSoft: '#16251E', successBorder: '#244A39',
  warn: '#D9A441', warnSoft: '#2A2212', warnBorder: '#4D3F1C',
  danger: '#EC6A60', dangerSoft: '#2C1816', dangerBorder: '#50271F',
  info: '#5B9CF0', infoSoft: '#13203A', infoBorder: '#25406B',
  neutral: '#8A94A6', neutralSoft: '#1C222D', neutralBorder: '#2D3744',

  // Elevation — softer/darker shadows read better on a dark canvas
  shadow: '0 1px 2px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.6)',
  shadowLg: '0 12px 32px rgba(0,0,0,0.6)',
};

// Build the `AC.<key>` => `var(--ac-<key>, <lightfallback>)` map for every
// themed token, then layer the static (non-color) metrics on top.
const themed = Object.fromEntries(
  Object.keys(LIGHT).map((k) => [k, `var(--ac-${k}, ${LIGHT[k]})`])
);

export const AC = {
  ...themed,

  // ---- Typography (never themes) ------------------------------------------
  // UI font everywhere. Fraunces is reserved for the wordmark ONLY.
  font: "'Albert Sans', system-ui, sans-serif",
  brandFont: "'Fraunces', Georgia, serif",
  mono: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace",

  // ---- Shape (never themes) -----------------------------------------------
  radius: 10,       // cards / panels
  radiusSm: 8,      // controls, inputs, buttons
  radiusPill: 999,

  // ---- Layout metrics (never themes) --------------------------------------
  railWidth: 232,
  railWidthCollapsed: 64,
  headerHeight: 56,
  maxContent: 1200,
};

// Semantic badge palettes keyed by tone. Use with the <Badge> primitive.
// (Each value is a `var(--ac-…)` string, so tones theme automatically.)
export const AC_TONES = {
  accent: { fg: AC.accent, bg: AC.accentSoft, bd: AC.accentBorder },
  success: { fg: AC.success, bg: AC.successSoft, bd: AC.successBorder },
  warn: { fg: AC.warn, bg: AC.warnSoft, bd: AC.warnBorder },
  danger: { fg: AC.danger, bg: AC.dangerSoft, bd: AC.dangerBorder },
  info: { fg: AC.info, bg: AC.infoSoft, bd: AC.infoBorder },
  neutral: { fg: AC.neutral, bg: AC.neutralSoft, bd: AC.neutralBorder },
};

// Valid theme *preferences* a user can pick. The resolved theme is always
// 'light' or 'dark'; 'system' follows `prefers-color-scheme`.
export const AC_THEMES = ['light', 'dark', 'system'];

// CSS that defines the custom properties for each resolved theme. Scoped to a
// `data-ac-theme` attribute on the document root, injected once by useAdminTheme.
const emitVars = (vars) =>
  Object.entries(vars).map(([k, v]) => `  --ac-${k}: ${v};`).join('\n');

export const AC_THEME_CSS = `
[data-ac-theme="light"] {
${emitVars(LIGHT)}
  color-scheme: light;
}
[data-ac-theme="dark"] {
${emitVars(DARK)}
  color-scheme: dark;
}`;

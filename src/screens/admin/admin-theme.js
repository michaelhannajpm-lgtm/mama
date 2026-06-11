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
// ============================================================================

export const AC = {
  // ---- Surfaces (light, cool, neutral) ------------------------------------
  bg: '#F5F6F8',          // app background behind cards
  surface: '#FFFFFF',     // cards, panels, table bodies
  surfaceAlt: '#FAFBFC',  // table headers, subtle fills, hover rows
  surfaceSunken: '#F0F2F5', // wells, inset code/empty areas

  // ---- Sidebar (dark operator rail) ---------------------------------------
  railBg: '#131823', // slate-950-ish
  railText: '#9AA3B2',
  railTextActive: '#FFFFFF',
  railActiveBg: 'rgba(233,107,125,0.16)', // coral wash for the active item
  railActiveBar: '#E96B7D',
  railHover: 'rgba(255,255,255,0.06)',
  railBorder: 'rgba(255,255,255,0.08)',
  railMuted: '#5B6472',

  // ---- Borders / lines ----------------------------------------------------
  border: '#E6E8EC',
  borderStrong: '#D5D9DF',
  divider: '#EEF0F3',

  // ---- Text ---------------------------------------------------------------
  text: '#1A2233',        // primary
  textSoft: '#566175',    // secondary
  textMuted: '#8A93A3',   // tertiary / captions
  textFaint: '#AEB5C0',   // disabled / placeholder

  // ---- Brand accent (the ONE tie to the phone app) ------------------------
  accent: '#E96B7D',      // Go Mama coral — primary actions, active nav
  accentHover: '#D6446A',
  accentText: '#FFFFFF',
  accentSoft: '#FCEEF0',  // tinted backgrounds, soft badges
  accentBorder: '#F6CFD6',

  // ---- Semantic states (console-standard, NOT the app's sage/saffron) -----
  success: '#1E7A4D', successSoft: '#E7F3EC', successBorder: '#C5E4D2',
  warn: '#B7791F', warnSoft: '#FBF1DD', warnBorder: '#F0DCB0',
  danger: '#D0463B', dangerSoft: '#FBEAE8', dangerBorder: '#F2C9C4',
  info: '#2563C9', infoSoft: '#E8EFFB', infoBorder: '#C7D8F4',
  neutral: '#6B7382', neutralSoft: '#F0F2F5', neutralBorder: '#E1E4E9',

  // ---- Typography ---------------------------------------------------------
  // UI font everywhere. Fraunces is reserved for the wordmark ONLY.
  font: "'Albert Sans', system-ui, sans-serif",
  brandFont: "'Fraunces', Georgia, serif",
  mono: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace",

  // ---- Shape / elevation --------------------------------------------------
  radius: 10,       // cards / panels
  radiusSm: 8,      // controls, inputs, buttons
  radiusPill: 999,
  shadow: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
  shadowLg: '0 8px 28px rgba(16,24,40,0.12)',

  // ---- Layout metrics -----------------------------------------------------
  railWidth: 232,
  railWidthCollapsed: 64,
  headerHeight: 56,
  maxContent: 1200,
};

// Semantic badge palettes keyed by tone. Use with the <Badge> primitive.
export const AC_TONES = {
  accent: { fg: AC.accent, bg: AC.accentSoft, bd: AC.accentBorder },
  success: { fg: AC.success, bg: AC.successSoft, bd: AC.successBorder },
  warn: { fg: AC.warn, bg: AC.warnSoft, bd: AC.warnBorder },
  danger: { fg: AC.danger, bg: AC.dangerSoft, bd: AC.dangerBorder },
  info: { fg: AC.info, bg: AC.infoSoft, bd: AC.infoBorder },
  neutral: { fg: AC.neutral, bg: AC.neutralSoft, bd: AC.neutralBorder },
};

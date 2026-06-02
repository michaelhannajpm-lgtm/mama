// src/theme.js
// Design tokens — single source of truth for the Go Mama palette.
// Imported by every component that styles anything.
//
// 2026-06-01: Palette ported from the GoMama Expo prototype
// (C:\projects\GoMama). Coral becomes the primary accent, navy
// becomes the ink, cream/blush/peach/lilac fill the warm backgrounds.
// Existing token names are preserved (terracotta, ink, sage…) so the
// hundreds of `C.tokenName` references across screens, sheets, and the
// admin dashboard inherit the new look without a rename.
export const C = {
  // Backgrounds — warm cream + blush + paper white
  cream:        '#FBF5EF',  // page background
  creamSoft:    '#FCEEEE',  // blush — slightly pink-warm surfaces, sheets
  paper:        '#FFFFFF',  // cards
  blush:        '#FCEEEE',
  lilac:        '#EDE4F4',  // soft secondary chip background
  peach:        '#FDE2D4',  // tertiary chip background

  // Text — navy ink
  ink:          '#1B2A4E',
  inkSoft:      '#3A4A6D',
  inkMuted:     '#7C8499',
  muted:        '#7C8499',
  navy:         '#1B2A4E',
  navySoft:     '#3A4A6D',

  // Primary accent — coral 1:1 / intimacy
  terracotta:     '#E96B7D',
  terracottaDark: '#D6446A',
  coral:          '#E96B7D',
  coralDeep:      '#D6446A',
  coralSoft:      '#F8D7DD',

  // Secondary accent — sage for community / groups.
  // Sage is now used as a *background* shade; sageDark is the readable foreground.
  sage:         '#E2EBD8',
  sageDark:     '#5E7A3B',

  // Highlight — saffron for premium pop, keeps warm tone
  saffron:      '#D9A441',

  // Atmospheric warm wash (rose → peach in the new palette)
  rose:         '#FDE2D4',

  // Hairlines
  divider:      '#EFE5E0',
  line:         '#EFE5E0',

  // Premium dark surface
  premium:      '#1B1517',
};

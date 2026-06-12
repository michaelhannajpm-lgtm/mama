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
  saffronDark:  '#8A6610',  // readable saffron/gold foreground (text on a tint)
  saffronSoft:  '#FFF4D6',  // pale gold chip background

  // Extended accents — readable foregrounds on their soft tints, plus the
  // category-chip colors used across the tabs. Added 2026-06-12 to retire the
  // hardcoded hex that had drifted into HomeTab / Explore / Profile / Connect.
  lilacDark:    '#5E4A8A',  // readable lilac/purple foreground (on C.lilac)
  azure:        '#1D5A94',  // info/blue foreground (saved places, Facebook pill)
                            //   — passes WCAG AA (≈5:1) as text on C.azureSoft.
  azureSoft:    '#D6E6F4',  // pale blue chip background
  amber:        '#B36A1D',  // warm-amber ICON color (saved programs). NOTE: only
                            //   ~3.4:1 on amberSoft — decorative/icon use only,
                            //   not text.
  amberSoft:    '#FBE2C7',  // pale amber chip background
  // Explore category-chip accents — filled circles behind a white icon.
  catViolet:    '#8E63CC',  // Meetups
  catOrange:    '#F09142',  // Kids Activities
  catTeal:      '#4A8A7A',  // Schools & Childcare

  // Atmospheric warm wash (rose → peach in the new palette)
  rose:         '#FDE2D4',

  // Hairlines
  divider:      '#EFE5E0',
  line:         '#EFE5E0',

  // Skeleton loaders — a calm, neutral warm-gray placeholder (never coral; a
  // loading state should rest the eye, not grab it). `skeletonSheen` is the
  // light band that sweeps across it. See components/Skeleton.jsx.
  skeleton:      '#ECE3DC',
  skeletonSheen: '#F7F1EB',

  // Premium dark surface
  premium:      '#1B1517',

  // Disabled primary-button fill — a muted warm tan that reads as inert
  // against cream (never coral; a disabled CTA shouldn't look tappable).
  btnDisabled:  '#D8CCB6',
};

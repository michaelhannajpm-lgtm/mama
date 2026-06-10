// Turn a server mom card (abstract icon/color keys) into a render-ready object:
// resolve iconKey → lucide component and tagBg/tagFg token names → C.* colors.
import { Briefcase, Home, Heart, Baby, Sparkles, Coffee, ShieldCheck, Globe, Compass } from 'lucide-react';
import { C } from '../theme';

const ICONS = {
  working: Briefcase, home: Home, solo: Heart, new: Baby,
  multi: Sparkles, hybrid: Coffee, verified: ShieldCheck,
  multicultural: Globe, new_to_area: Compass,
};
export const momIconFromKey = (key) => ICONS[key] || ShieldCheck;

const TOKENS = {
  lilac: C.lilac, sage: C.sage, sageDark: C.sageDark,
  coralSoft: C.coralSoft, coralDeep: C.coralDeep, peach: C.peach,
  plum: '#5E4A8A', // matches ConnectTab's existing purple tag foreground
};
export const resolveTagColor = (name) => TOKENS[name] || C.muted;

// Add client-only fields. Keeps the original string keys overwritten with the
// resolved values so existing consumers (MomCard/MomListCard/MomDetailSheet)
// that read item.tagBg / item.tagFg / item.Icon keep working unchanged.
export const decorateMom = (card) => ({
  ...card,
  Icon: momIconFromKey(card.iconKey),
  tagBg: resolveTagColor(card.tagBg),
  tagFg: resolveTagColor(card.tagFg),
});

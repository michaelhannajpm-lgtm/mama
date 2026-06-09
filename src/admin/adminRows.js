// Shared row helpers for the admin Places/Events managers: photo realness,
// status colors, and which row actions are relevant for a given status.
import { C } from '../theme';

export const STATUSES = ['needs_review', 'approved', 'rejected', 'archived'];

// Generated gradient images live under the storage "generated/" path.
export const isGeneratedPhotoUrl = (url) => typeof url === 'string' && url.includes('/generated/');

// A row has a REAL photo only if it has a Google/manual photo — a generated
// gradient placeholder does not count. Curated rows with just a hero_photo
// (and no place_photos rows) count, as long as that hero isn't a gradient.
export const hasRealPhoto = (row) => {
  const photos = row.place_photos || [];
  if (photos.length) return photos.some(p => p.source && p.source !== 'generated');
  return !!row.hero_photo && !isGeneratedPhotoUrl(row.hero_photo);
};

// Status label color: needs_review pops in orange (not yet reviewed).
export const statusColor = (s) => ({
  needs_review: C.saffron,
  approved: C.sageDark,
  rejected: C.terracotta,
  archived: C.inkMuted,
}[s] || C.inkMuted);

// Which row/bulk actions are relevant for a row, keyed by review_status.
// (Hide/Show is only meaningful for approved rows; its direction depends on
// `visible`.) Edit is always available.
export const rowActionsFor = (row) => {
  const s = row.review_status;
  return {
    approve: s === 'needs_review' || s === 'rejected' || s === 'archived', // archived = restore
    reject: s === 'needs_review' || s === 'approved',
    toggleVisible: s === 'approved',
    archive: s === 'approved' || s === 'rejected',
    del: s === 'archived',
    edit: true,
  };
};

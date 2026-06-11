// Pure presence derivation — no I/O. Maps a mom's last-seen heartbeat timestamp
// to online / away / offline using admin-configured recency windows (seconds).
//   online  : age <= onlineMaxS
//   away    : age <= awayMaxS
//   offline : older, or no/invalid timestamp
export const PRESENCE = { ONLINE: 'online', AWAY: 'away', OFFLINE: 'offline' };

export const derivePresence = (lastSeenAt, onlineMaxS = 300, awayMaxS = 1800, nowMs = Date.now()) => {
  if (!lastSeenAt) return PRESENCE.OFFLINE;
  const seenMs = Date.parse(lastSeenAt);
  if (Number.isNaN(seenMs)) return PRESENCE.OFFLINE;
  const ageS = (nowMs - seenMs) / 1000;       // negative age (clock skew / future) ⇒ online
  if (ageS <= onlineMaxS) return PRESENCE.ONLINE;
  if (ageS <= awayMaxS) return PRESENCE.AWAY;
  return PRESENCE.OFFLINE;
};

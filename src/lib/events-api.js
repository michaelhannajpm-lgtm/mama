// Client for the public events API. Normalizes into the shapes screens consume.
export const normalizeEventsPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return { recurring: [], thisWeek: [] };
  return {
    recurring: Array.isArray(payload.recurring) ? payload.recurring : [],
    thisWeek: Array.isArray(payload.thisWeek) ? payload.thisWeek : [],
  };
};

export const fetchEvents = async () => {
  const res = await fetch('/api/events', { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`events ${res.status}`);
  return normalizeEventsPayload(await res.json());
};

// Resolve an event by id/slug across a list (live or fallback).
export const findEventIn = (list, id) =>
  (list || []).find(e => e.id === id || e.slug === id) || null;

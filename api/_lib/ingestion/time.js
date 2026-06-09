// Derive the app's recurring-UI fields from an absolute instant, in local tz.
// Uses Intl (built-in) — no tz dependency.

const hourIn = (d, timezone) => {
  const h = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false })
    .formatToParts(d).find(p => p.type === 'hour')?.value;
  return (parseInt(h, 10) || 0) % 24; // some envs emit '24' at midnight
};

const bucketFor = (h) =>
  h >= 5 && h < 11 ? 'morning' :
  h >= 11 && h < 14 ? 'noon' :
  h >= 14 && h < 18 ? 'afternoon' : 'night-owl';

export const eventTimeParts = (startsAt, timezone = 'America/New_York') => {
  const d = startsAt instanceof Date ? startsAt : new Date(startsAt);
  if (isNaN(d.getTime())) return { dayOfWeek: null, bucket: null, timeLabel: null };
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
  }).formatToParts(d);
  const get = (t) => parts.find(p => p.type === t)?.value;
  return {
    dayOfWeek: get('weekday'),                                  // 'Mon'..'Sun'
    bucket: bucketFor(hourIn(d, timezone)),
    timeLabel: `${get('hour')}:${get('minute')} ${get('dayPeriod')}`, // '10:30 AM'
  };
};

export const localDateKey = (startsAt, timezone = 'America/New_York') => {
  const d = startsAt instanceof Date ? startsAt : new Date(startsAt);
  if (isNaN(d.getTime())) return null;
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const g = (t) => p.find(x => x.type === t)?.value;
  return `${g('year')}-${g('month')}-${g('day')}`;
};

const cleanObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};

const cleanArray = (value) =>
  Array.isArray(value) ? value : [];

const firstNameFromProfile = (row) => {
  const display = (row?.display_name || row?.username || 'Mama').replace(/\./g, '').trim();
  return display.split(/\s+/)[0] || 'Mama';
};

export const fetchSeededMomProfiles = async () => {
  const res = await fetch('/api/dev/mom-profiles?limit=1000', { cache: 'no-store' });
  let body = {};
  try { body = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    throw new Error(body?.error || `Could not load seeded moms (${res.status})`);
  }
  return cleanArray(body.rows);
};

export const appStateFromMomProfile = (row) => {
  const firstName = firstNameFromProfile(row);
  const cityParts = [row.neighborhood, row.city].filter(Boolean);
  const location = cityParts.join(', ');
  const socialLinks = cleanObject(row.social_links);

  return {
    account: {
      firstName,
      username: row.username || `seed-${row.id}`,
      auth_user_id: row.auth_user_id || `seed-${row.id || row.username || firstName.toLowerCase()}`,
      method: 'seed',
      isSeed: true,
      seedMomId: row.id,
    },
    profile: {
      kidsAges: cleanObject(row.kids_ages),
      momTypes: cleanArray(row.mom_types),
      values: cleanArray(row.values),
      interests: cleanArray(row.interests),
      photos: cleanArray(row.photos),
      bio: row.bio || '',
      socialLinks,
      verified: {
        instagram: !!socialLinks.instagram,
        facebook: !!socialLinks.facebook,
        photo: !!row.verified,
      },
    },
    prefs: {
      slots: cleanArray(row.free_slots),
      places: cleanArray(row.places),
    },
    location,
    distance: row.distance_miles ?? null,
    locationGeo: row.place_id ? {
      id: row.place_id,
      label: row.neighborhood || row.city || 'Tampa Bay',
      city: row.city || null,
      neighborhood: row.neighborhood || null,
      county: row.county || null,
      lat: row.home_lat ?? null,
      lng: row.home_lng ?? null,
    } : null,
  };
};

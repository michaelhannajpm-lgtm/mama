// Client for the public Local Favorite API.
export const fetchLocalFavorite = async (city = 'Tampa') => {
  const res = await fetch(`/api/local-favorite?city=${encodeURIComponent(city)}`,
    { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`local-favorite ${res.status}`);
  const data = await res.json();
  return data?.favorite || null;
};

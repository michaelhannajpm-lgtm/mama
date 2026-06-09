// Lazy Google Maps JS loader. The browser key must be VITE_GOOGLE_MAPS_API_KEY
// (Vite only exposes VITE_* to the client) with the Maps JavaScript API enabled.
let mapsPromise = null;

export const mapsKey = () => import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
export const mapsKeyPresent = () => !!mapsKey();

export const loadGoogleMaps = () => {
  if (mapsPromise) return mapsPromise;
  const key = mapsKey();
  if (!key) { mapsPromise = Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY not set')); return mapsPromise; }
  if (typeof window !== 'undefined' && window.google?.maps) { mapsPromise = Promise.resolve(window.google.maps); return mapsPromise; }
  mapsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
    s.async = true; s.defer = true;
    s.onload = () => (window.google?.maps ? resolve(window.google.maps) : reject(new Error('Google Maps failed to initialize')));
    s.onerror = () => reject(new Error('Google Maps script failed to load'));
    document.head.appendChild(s);
  });
  return mapsPromise;
};

// Hand-curated area-name → {lat, lng} mapping for Tampa-area neighborhoods.
// Used by scripts/seed-supabase.mjs to backfill place + mom geolocations
// without calling a live geocoder.
//
// Coordinates are approximate centroids (good enough for distance bucketing).

export const AREA_COORDS = {
  // Tampa
  'Hyde Park':         { lat: 27.9355, lng: -82.4795 },
  'Seminole Heights':  { lat: 27.9967, lng: -82.4576 },
  'Downtown':          { lat: 27.9466, lng: -82.4584 },
  'South Tampa':       { lat: 27.9106, lng: -82.5079 },
  'Tampa Heights':     { lat: 27.9663, lng: -82.4636 },
  'Channelside':       { lat: 27.9419, lng: -82.4452 },
  'Davis Islands':     { lat: 27.9032, lng: -82.4574 },
  'West Tampa':        { lat: 27.9525, lng: -82.4970 },
  'New Tampa':         { lat: 28.1247, lng: -82.3590 },
  'University of Tampa': { lat: 27.9466, lng: -82.4642 },
  'Carrollwood':       { lat: 28.0553, lng: -82.5074 },
  'Westchase':         { lat: 28.0556, lng: -82.6112 },
  'Ybor City':         { lat: 27.9666, lng: -82.4376 },
  'Sulphur Springs':   { lat: 28.0233, lng: -82.4524 },
  'East Tampa':        { lat: 27.9659, lng: -82.4153 },
  'West Shore':        { lat: 27.9573, lng: -82.5193 },
  'Port Tampa':        { lat: 27.8633, lng: -82.5370 },
  'Citrus Park':       { lat: 28.0744, lng: -82.5712 },
  'Courtney Campbell': { lat: 27.9638, lng: -82.5944 },
  'Bayshore':          { lat: 27.9219, lng: -82.4906 },

  // Nearby
  'St. Petersburg, FL':{ lat: 27.7676, lng: -82.6403 },
  'Clearwater, FL':    { lat: 27.9659, lng: -82.8001 },
  'Dunedin':           { lat: 28.0197, lng: -82.7873 },
};

// Fallback if an area is unknown — Tampa city center.
export const DEFAULT_COORDS = { lat: 27.9506, lng: -82.4572 };

export const lookupCoords = (area) => AREA_COORDS[area] || DEFAULT_COORDS;

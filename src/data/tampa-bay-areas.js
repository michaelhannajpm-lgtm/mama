// Bundled Tampa Bay area dataset — 5 counties: Hillsborough, Pinellas, Pasco,
// Hernando, Manatee. Mock source for the neighborhood picker; the response
// shape matches what a Google Place Details lookup will later return, so
// src/lib/places.js can swap to a real /api/places/* proxy with no change here.
// Coordinates are city/neighborhood centroids (approximate, sufficient for
// prototype matching + nearest-area resolution).

export const TAMPA_BAY_AREAS = [
  // --- Hillsborough ---
  { id: 'tampa',            label: 'Tampa',             city: 'Tampa',        neighborhood: null,               county: 'Hillsborough', lat: 27.95, lng: -82.46 },
  { id: 'south-tampa',      label: 'South Tampa',       city: 'Tampa',        neighborhood: 'South Tampa',      county: 'Hillsborough', lat: 27.92, lng: -82.49 },
  { id: 'hyde-park',        label: 'Hyde Park',         city: 'Tampa',        neighborhood: 'Hyde Park',        county: 'Hillsborough', lat: 27.94, lng: -82.47 },
  { id: 'seminole-heights', label: 'Seminole Heights',  city: 'Tampa',        neighborhood: 'Seminole Heights', county: 'Hillsborough', lat: 27.99, lng: -82.45 },
  { id: 'ybor-city',        label: 'Ybor City',         city: 'Tampa',        neighborhood: 'Ybor City',        county: 'Hillsborough', lat: 27.96, lng: -82.43 },
  { id: 'new-tampa',        label: 'New Tampa',         city: 'Tampa',        neighborhood: 'New Tampa',        county: 'Hillsborough', lat: 28.13, lng: -82.35 },
  { id: 'westchase',        label: 'Westchase',         city: 'Tampa',        neighborhood: 'Westchase',        county: 'Hillsborough', lat: 28.06, lng: -82.61 },
  { id: 'town-n-country',   label: "Town 'n' Country",  city: 'Tampa',        neighborhood: "Town 'n' Country", county: 'Hillsborough', lat: 28.01, lng: -82.58 },
  { id: 'carrollwood',      label: 'Carrollwood',       city: 'Tampa',        neighborhood: 'Carrollwood',      county: 'Hillsborough', lat: 28.05, lng: -82.50 },
  { id: 'brandon',          label: 'Brandon',           city: 'Brandon',      neighborhood: null,               county: 'Hillsborough', lat: 27.94, lng: -82.29 },
  { id: 'riverview',        label: 'Riverview',         city: 'Riverview',    neighborhood: null,               county: 'Hillsborough', lat: 27.86, lng: -82.33 },
  { id: 'plant-city',       label: 'Plant City',        city: 'Plant City',   neighborhood: null,               county: 'Hillsborough', lat: 28.02, lng: -82.11 },
  { id: 'valrico',          label: 'Valrico',           city: 'Valrico',      neighborhood: null,               county: 'Hillsborough', lat: 27.94, lng: -82.24 },
  { id: 'fishhawk',         label: 'FishHawk',          city: 'Lithia',       neighborhood: 'FishHawk',         county: 'Hillsborough', lat: 27.85, lng: -82.21 },
  { id: 'apollo-beach',     label: 'Apollo Beach',      city: 'Apollo Beach', neighborhood: null,               county: 'Hillsborough', lat: 27.77, lng: -82.41 },
  { id: 'ruskin',           label: 'Ruskin',            city: 'Ruskin',       neighborhood: null,               county: 'Hillsborough', lat: 27.72, lng: -82.43 },
  { id: 'wimauma',          label: 'Wimauma',           city: 'Wimauma',      neighborhood: null,               county: 'Hillsborough', lat: 27.71, lng: -82.30 },
  { id: 'sun-city-center',  label: 'Sun City Center',   city: 'Sun City Center', neighborhood: null,            county: 'Hillsborough', lat: 27.71, lng: -82.35 },
  { id: 'lutz',             label: 'Lutz',              city: 'Lutz',         neighborhood: null,               county: 'Hillsborough', lat: 28.15, lng: -82.46 },
  { id: 'citrus-park',      label: 'Citrus Park',       city: 'Tampa',        neighborhood: 'Citrus Park',      county: 'Hillsborough', lat: 28.07, lng: -82.57 },
  { id: 'temple-terrace',   label: 'Temple Terrace',    city: 'Temple Terrace', neighborhood: null,             county: 'Hillsborough', lat: 28.04, lng: -82.39 },
  { id: 'seffner',          label: 'Seffner',           city: 'Seffner',      neighborhood: null,               county: 'Hillsborough', lat: 27.99, lng: -82.28 },
  { id: 'dover',            label: 'Dover',             city: 'Dover',        neighborhood: null,               county: 'Hillsborough', lat: 27.99, lng: -82.22 },

  // --- Pinellas ---
  { id: 'st-petersburg',    label: 'St. Petersburg',    city: 'St. Petersburg', neighborhood: null,             county: 'Pinellas', lat: 27.77, lng: -82.64 },
  { id: 'clearwater',       label: 'Clearwater',        city: 'Clearwater',   neighborhood: null,               county: 'Pinellas', lat: 27.97, lng: -82.80 },
  { id: 'largo',            label: 'Largo',             city: 'Largo',        neighborhood: null,               county: 'Pinellas', lat: 27.91, lng: -82.79 },
  { id: 'pinellas-park',    label: 'Pinellas Park',     city: 'Pinellas Park', neighborhood: null,              county: 'Pinellas', lat: 27.84, lng: -82.70 },
  { id: 'dunedin',          label: 'Dunedin',           city: 'Dunedin',      neighborhood: null,               county: 'Pinellas', lat: 28.02, lng: -82.77 },
  { id: 'palm-harbor',      label: 'Palm Harbor',       city: 'Palm Harbor',  neighborhood: null,               county: 'Pinellas', lat: 28.08, lng: -82.76 },
  { id: 'tarpon-springs',   label: 'Tarpon Springs',    city: 'Tarpon Springs', neighborhood: null,             county: 'Pinellas', lat: 28.15, lng: -82.76 },
  { id: 'seminole',         label: 'Seminole',          city: 'Seminole',     neighborhood: null,               county: 'Pinellas', lat: 27.84, lng: -82.79 },
  { id: 'safety-harbor',    label: 'Safety Harbor',     city: 'Safety Harbor', neighborhood: null,              county: 'Pinellas', lat: 28.00, lng: -82.69 },
  { id: 'oldsmar',          label: 'Oldsmar',           city: 'Oldsmar',      neighborhood: null,               county: 'Pinellas', lat: 28.03, lng: -82.66 },
  { id: 'gulfport',         label: 'Gulfport',          city: 'Gulfport',     neighborhood: null,               county: 'Pinellas', lat: 27.75, lng: -82.70 },
  { id: 'st-pete-beach',    label: 'St. Pete Beach',    city: 'St. Pete Beach', neighborhood: null,             county: 'Pinellas', lat: 27.73, lng: -82.74 },
  { id: 'treasure-island',  label: 'Treasure Island',   city: 'Treasure Island', neighborhood: null,            county: 'Pinellas', lat: 27.77, lng: -82.77 },
  { id: 'madeira-beach',    label: 'Madeira Beach',     city: 'Madeira Beach', neighborhood: null,              county: 'Pinellas', lat: 27.80, lng: -82.79 },
  { id: 'indian-rocks-beach', label: 'Indian Rocks Beach', city: 'Indian Rocks Beach', neighborhood: null,      county: 'Pinellas', lat: 27.88, lng: -82.85 },

  // --- Pasco ---
  { id: 'new-port-richey',  label: 'New Port Richey',   city: 'New Port Richey', neighborhood: null,            county: 'Pasco', lat: 28.24, lng: -82.72 },
  { id: 'port-richey',      label: 'Port Richey',       city: 'Port Richey',  neighborhood: null,               county: 'Pasco', lat: 28.27, lng: -82.72 },
  { id: 'wesley-chapel',    label: 'Wesley Chapel',     city: 'Wesley Chapel', neighborhood: null,              county: 'Pasco', lat: 28.24, lng: -82.33 },
  { id: 'zephyrhills',      label: 'Zephyrhills',       city: 'Zephyrhills',  neighborhood: null,               county: 'Pasco', lat: 28.23, lng: -82.18 },
  { id: 'land-o-lakes',     label: "Land O' Lakes",     city: "Land O' Lakes", neighborhood: null,              county: 'Pasco', lat: 28.22, lng: -82.46 },
  { id: 'dade-city',        label: 'Dade City',         city: 'Dade City',    neighborhood: null,               county: 'Pasco', lat: 28.36, lng: -82.20 },
  { id: 'hudson',           label: 'Hudson',            city: 'Hudson',       neighborhood: null,               county: 'Pasco', lat: 28.36, lng: -82.69 },
  { id: 'holiday',          label: 'Holiday',           city: 'Holiday',      neighborhood: null,               county: 'Pasco', lat: 28.19, lng: -82.74 },
  { id: 'trinity',          label: 'Trinity',           city: 'Trinity',      neighborhood: null,               county: 'Pasco', lat: 28.18, lng: -82.66 },
  { id: 'odessa',           label: 'Odessa',            city: 'Odessa',       neighborhood: null,               county: 'Hillsborough', lat: 28.19, lng: -82.59 },

  // --- Hernando ---
  { id: 'brooksville',      label: 'Brooksville',       city: 'Brooksville',  neighborhood: null,               county: 'Hernando', lat: 28.56, lng: -82.39 },
  { id: 'spring-hill',      label: 'Spring Hill',       city: 'Spring Hill',  neighborhood: null,               county: 'Hernando', lat: 28.48, lng: -82.53 },
  { id: 'weeki-wachee',     label: 'Weeki Wachee',      city: 'Weeki Wachee', neighborhood: null,               county: 'Hernando', lat: 28.52, lng: -82.57 },
  { id: 'hernando-beach',   label: 'Hernando Beach',    city: 'Hernando Beach', neighborhood: null,             county: 'Hernando', lat: 28.47, lng: -82.66 },

  // --- Manatee ---
  { id: 'bradenton',        label: 'Bradenton',         city: 'Bradenton',    neighborhood: null,               county: 'Manatee', lat: 27.50, lng: -82.57 },
  { id: 'palmetto',         label: 'Palmetto',          city: 'Palmetto',     neighborhood: null,               county: 'Manatee', lat: 27.52, lng: -82.57 },
  { id: 'lakewood-ranch',   label: 'Lakewood Ranch',    city: 'Lakewood Ranch', neighborhood: null,             county: 'Manatee', lat: 27.41, lng: -82.40 },
  { id: 'ellenton',         label: 'Ellenton',          city: 'Ellenton',     neighborhood: null,               county: 'Manatee', lat: 27.52, lng: -82.52 },
  { id: 'parrish',          label: 'Parrish',           city: 'Parrish',      neighborhood: null,               county: 'Manatee', lat: 27.59, lng: -82.42 },
  { id: 'anna-maria',       label: 'Anna Maria',        city: 'Anna Maria',   neighborhood: null,               county: 'Manatee', lat: 27.53, lng: -82.73 },
  { id: 'holmes-beach',     label: 'Holmes Beach',      city: 'Holmes Beach', neighborhood: null,               county: 'Manatee', lat: 27.50, lng: -82.71 },
  { id: 'longboat-key',     label: 'Longboat Key',      city: 'Longboat Key', neighborhood: null,               county: 'Manatee', lat: 27.41, lng: -82.66 },
];

// One-tap "Popular areas" shown in the picker's empty state. Each must be a
// real id above so it resolves to a full AreaEntry.
export const POPULAR_AREA_IDS = [
  'south-tampa', 'westchase', 'brandon', 'st-petersburg', 'wesley-chapel', 'riverview',
];

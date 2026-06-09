// Config-driven source registry. Adding a source must not require touching
// ingestion control flow. Each Google query maps to a PRIMARY app category.
export const SOURCES = [
  {
    id: 'google-places-tampa',
    name: 'Google Places — Tampa family',
    type: 'google_places',
    city: 'Tampa, FL',
    county: 'Hillsborough',
    enabled: true,
    cadenceHours: 168,
    parserVersion: 'v1',
    // locationBias circle ~ Tampa city center, 25km radius.
    bias: { lat: 27.9506, lng: -82.4572, radiusM: 25000 },
    queries: [
      { q: "children's museum",         category: 'fun' },
      { q: 'playground',                category: 'fun' },
      { q: 'public library',            category: 'fun' },
      { q: 'aquarium',                  category: 'fun' },
      { q: 'zoo',                       category: 'fun' },
      { q: 'family friendly cafe',      category: 'fun' },
      { q: 'trampoline park',           category: 'fun' },
      { q: 'swim school for kids',      category: 'sports' },
      { q: 'gymnastics for kids',       category: 'sports' },
      { q: 'youth soccer',              category: 'sports' },
      { q: 'kids martial arts',         category: 'sports' },
      { q: 'pediatrician',              category: 'health' },
      { q: 'pediatric dentist',         category: 'health' },
      { q: 'prenatal yoga',             category: 'wellness' },
      { q: 'preschool',                 category: 'schools' },
      { q: 'daycare',                   category: 'childcare' },
      { q: "children's art classes",    category: 'extracurricular' },
      { q: 'kids music classes',        category: 'extracurricular' },
      { q: 'summer camp for kids',      category: 'camps' },
    ],
  },
];

export const getSource = (id) => SOURCES.find(s => s.id === id) || null;

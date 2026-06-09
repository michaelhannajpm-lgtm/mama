// Reshape flat DB place rows into the client structures the app already uses:
//   PLACES (object keyed by primary category) and TOP_PICKS.
const CATEGORY_ORDER = ['fun','sports','wellness','schools','childcare','extracurricular','camps','health'];

export const groupPlaces = (rows, { withTopPicks = false } = {}) => {
  const grouped = {};
  for (const cat of CATEGORY_ORDER) grouped[cat] = [];
  for (const row of rows) {
    const cat = grouped[row.category] ? row.category : 'fun';
    grouped[cat].push(row);
  }
  if (!withTopPicks) return grouped;

  const topPicks = rows
    .filter(r => typeof r.rating === 'number' && r.rating > 0)
    .sort((a, b) => (b.rating - a.rating) || ((b.review_count || 0) - (a.review_count || 0)))
    .slice(0, 5)
    .map(r => ({ placeId: r.slug, rating: r.rating, reviews: r.review_count || 0, badge: r.badge || 'Top rated' }));
  return { ...grouped, topPicks };
};

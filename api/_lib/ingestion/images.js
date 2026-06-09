import sharp from 'sharp';

// Brand palette ends (coral/sage/saffron families) for deterministic gradients.
const PAIRS = [
  ['#E96B7D', '#D9A441'], ['#7E9678', '#B5C9AB'], ['#D9A441', '#E96B7D'],
  ['#B98EB6', '#E96B7D'], ['#D7997D', '#D9A441'], ['#5A7E55', '#7E9678'],
];

const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

export const gradientForName = (name) => PAIRS[hash(name || '') % PAIRS.length];

const escapeXml = (s) => (s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

export const makeGradientPng = async (name, { w = 800, h = 600 } = {}) => {
  const [c1, c2] = gradientForName(name);
  const label = escapeXml((name || '').slice(0, 40));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <text x="40" y="${h - 48}" font-family="Georgia, serif" font-size="40"
      fill="#ffffff" opacity="0.92">${label}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
};

// Upload a generated PNG to the public Storage bucket; returns its public URL.
export const uploadGeneratedPng = async ({ supabaseUrl, serviceRoleKey, slug, buffer }) => {
  const path = `generated/${slug}.png`;
  const r = await fetch(`${supabaseUrl}/storage/v1/object/place-photos/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey,
      'Content-Type': 'image/png', 'x-upsert': 'true',
    },
    body: buffer,
  });
  if (!r.ok && r.status !== 200) {
    const t = await r.text().catch(() => '');
    throw new Error(`storage upload ${r.status}: ${t.slice(0, 150)}`);
  }
  return `${supabaseUrl}/storage/v1/object/public/place-photos/${path}`;
};

#!/usr/bin/env node
// Render public/og-image.svg → public/og-image.png at 1200×630.
// Uses sharp's libvips backend; system fonts are discovered automatically.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = resolve(root, 'public', 'og-image.svg');
const pngPath = resolve(root, 'public', 'og-image.png');

const svg = readFileSync(svgPath);
const png = await sharp(svg, { density: 300 })
  .resize(1200, 630, { fit: 'cover' })
  .png({ compressionLevel: 9, quality: 92 })
  .toBuffer();

writeFileSync(pngPath, png);
console.log(`Wrote ${pngPath} (${png.length} bytes)`);

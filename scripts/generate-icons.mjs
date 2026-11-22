import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

await mkdir('resources', { recursive: true });
await mkdir('public/price-checker', { recursive: true });
await sharp('public/app-icon.svg')
  .resize(1024, 1024, { fit: 'contain' })
  .png()
  .toFile('resources/icon.png');

// Generate installable Price Checker icons from its own brand mark.
const source = sharp('public/price-checker/app-icon.svg');
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  await source.clone().resize(size, size, { fit: 'contain', background: '#071B31' }).png().toFile(`public/price-checker/${name}`);
}
console.log('Generated Ekhaya launcher source and Price Checker PWA icon set.');

import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const manifest = JSON.parse(await readFile('public/price-checker/manifest.webmanifest', 'utf8'));
const expected = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
  ['apple-touch-icon.png', 180]
];

if (manifest.scope !== '/price-checker/' || manifest.start_url !== '/price-checker/' || manifest.display !== 'standalone') {
  throw new Error('Price Checker manifest scope, start_url or display mode is invalid.');
}
if (!manifest.icons.some((icon) => icon.purpose === 'maskable' && icon.src.endsWith('icon-maskable-512.png'))) {
  throw new Error('Manifest is missing its dedicated maskable icon.');
}
for (const [name, size] of expected) {
  const path = `public/price-checker/${name}`;
  const metadata = await sharp(path).metadata();
  if (metadata.width !== size || metadata.height !== size) {
    throw new Error(`${name} must be ${size}x${size}; received ${metadata.width}x${metadata.height}.`);
  }
}
const sw = await readFile('public/price-checker/sw.js', 'utf8');
if (!sw.includes('OFFLINE_PATH') || !sw.includes('request.method !== "GET"') || !sw.includes('functions/')) {
  throw new Error('Service worker is missing offline fallback or API exclusion safeguards.');
}
if (sw.includes('caches.put(request') && !sw.includes('/_next/static/')) {
  throw new Error('Unexpected broad request caching detected.');
}
console.log('Price Checker PWA manifest, icon dimensions and service-worker safeguards verified.');

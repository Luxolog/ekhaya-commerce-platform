import { access, readFile } from 'node:fs/promises';
import sharp from 'sharp';

const manifestPath = 'public/price-checker/manifest.webmanifest';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
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
  const publicPath = `public/price-checker/${name}`;
  const exportPath = `out/price-checker/${name}`;
  const metadata = await sharp(publicPath).metadata();
  if (metadata.width !== size || metadata.height !== size) {
    throw new Error(`${name} must be ${size}x${size}; received ${metadata.width}x${metadata.height}.`);
  }
  await access(exportPath);
}
await access('out/price-checker/manifest.webmanifest');
await access('out/price-checker/sw.js');
await access('out/price-checker/offline.html');
await access('out/download/index.html');

const rootHtml = await readFile('out/index.html', 'utf8');
if (rootHtml.includes('rel="manifest"')) {
  throw new Error('The main Ekhaya Technologies homepage must not become a PWA.');
}
const sw = await readFile('public/price-checker/sw.js', 'utf8');
if (!sw.includes('OFFLINE_PATH') || !sw.includes('request.method !== "GET"') || !sw.includes('functions/')) {
  throw new Error('Service worker is missing offline fallback or API exclusion safeguards.');
}
console.log('Price Checker PWA export, manifest, icon dimensions, offline fallback and cache boundaries verified.');

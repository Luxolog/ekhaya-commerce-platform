import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const source = 'public/price-checker/app-icon.svg';
const output = 'public/price-checker';

await mkdir('resources', { recursive: true });
await mkdir(output, { recursive: true });

await sharp('public/app-icon.svg')
  .resize(1024, 1024, { fit: 'contain' })
  .png()
  .toFile('resources/icon.png');

await sharp(source).resize(192, 192).png().toFile(`${output}/icon-192.png`);
await sharp(source).resize(512, 512).png().toFile(`${output}/icon-512.png`);
await sharp(source).resize(180, 180).png().toFile(`${output}/apple-touch-icon.png`);
await sharp(source)
  .resize(410, 410, { fit: 'contain' })
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#071B31' })
  .png()
  .toFile(`${output}/icon-maskable-512.png`);

console.log('Generated Price Checker PWA icons (192, 512, Apple touch and maskable) and Android launcher source.');

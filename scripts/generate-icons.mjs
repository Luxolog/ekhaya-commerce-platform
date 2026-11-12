import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

await mkdir('resources', { recursive: true });
await sharp('public/app-icon.svg')
  .resize(1024, 1024, { fit: 'contain' })
  .png()
  .toFile('resources/icon.png');
console.log('Generated Ekhaya Technologies 1024px launcher source icon.');

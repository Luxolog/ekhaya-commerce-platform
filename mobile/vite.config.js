import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({root:resolve(process.cwd(),'mobile'),base:'./',build:{outDir:resolve(process.cwd(),'mobile-dist'),emptyOutDir:true,target:'es2022'}});

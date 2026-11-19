import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// Relative assets work on both /Christmas_tree/ (GitHub Pages) and root domains.
export default defineConfig({ base: './', plugins: [react(), tailwindcss()] });

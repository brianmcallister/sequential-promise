import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the build works under the /sequential-promise/ subpath on GitHub Pages.
  base: './',
});

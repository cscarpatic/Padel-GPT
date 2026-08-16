import { defineConfig } from 'vite';

function resolveBase() {
  if (process.env.VITE_BASE_PATH) return process.env.VITE_BASE_PATH;
  const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
  if (process.env.GITHUB_ACTIONS === 'true' && repository && !repository.endsWith('.github.io')) {
    return `/${repository}/`;
  }
  return '/';
}

export default defineConfig({
  base: resolveBase(),
  build: {
    target: 'es2022',
    cssMinify: 'lightningcss',
    reportCompressedSize: true
  }
});

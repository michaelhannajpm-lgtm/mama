import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Stamp the bundle with the moment this version was published. Every push to
// GitHub triggers a Vercel build, so the last commit's date is effectively the
// publish time. Fall back to the build clock if git history isn't reachable
// (shouldn't happen on Vercel, but keeps local/edge builds safe).
let publishedAt;
try {
  publishedAt = execSync('git log -1 --format=%cI').toString().trim();
} catch {
  publishedAt = new Date().toISOString();
}

export default defineConfig({
  plugins: [react()],
  define: {
    __PUBLISHED_AT__: JSON.stringify(publishedAt),
  },
  server: {
    port: 5173,
    open: true,
  },
});

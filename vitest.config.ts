import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // change to 'jsdom' if testing DOM
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.ts'],
  },
});

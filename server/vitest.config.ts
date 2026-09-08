import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    globalSetup: ['./src/__tests__/global-setup.ts'],
    // Tests always run against a throwaway local SQLite file so they never
    // touch the development (or production) database.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
    },
    pool: 'forks',
    fileParallelism: false,
  },
});

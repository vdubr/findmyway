import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    // Kopie repa v .claude/worktrees by se jinak spouštěly taky
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});

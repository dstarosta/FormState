import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  clean: true,
  inlineOnly: ['fast-equals'],
  minify: true,
  sourcemap: 'hidden',
});

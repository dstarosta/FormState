import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  clean: true,
  dts: {
    enabled: false,
  },
  inlineOnly: ['fast-equals'],
  minify: true,
  sourcemap: 'hidden',
  treeshake: true,
});

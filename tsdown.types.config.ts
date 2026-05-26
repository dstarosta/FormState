import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  checks: {
    pluginTimings: false,
  },
  clean: true,
  dts: {
    emitDtsOnly: true,
    sourcemap: true,
  },
  platform: 'neutral',
});

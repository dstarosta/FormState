import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  checks: {
    pluginTimings: false,
  },
  clean: false,
  dts: {
    emitDtsOnly: true,
  },
  platform: 'neutral',
});

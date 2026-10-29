import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  checks: {
    bundlerTimings: false,
  },
  clean: true,
  dts: {
    emitDtsOnly: true,
    sourcemap: true,
  },
  platform: 'neutral',
});

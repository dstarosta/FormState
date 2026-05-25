import { defineConfig } from 'tsdown';
import pluginBabel from '@rollup/plugin-babel';

export default defineConfig({
  plugins: [
    pluginBabel({
      babelHelpers: 'bundled',
      parserOpts: {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      },
      plugins: ['babel-plugin-react-compiler'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    }),
  ],
  clean: false,
  dts: {
    enabled: false,
  },
  entry: {
    index: 'src/index.ts',
    schema: 'src/form-schema.tsx',
    'use-form-state': 'src/use-form-state.ts',
    'form-provider': 'src/form-provider.tsx',
    'masked-input': 'src/masked-input.tsx',
    'secure-input': 'src/secure-input.tsx',
    'state-manager': 'src/helpers/state-manager.ts',
    'date-formatter': 'src/helpers/date-formatter.ts',
    'form-builder': 'src/helpers/form-builder.tsx',
    'form-reset-blocker': 'src/helpers/form-reset-blocker.tsx',
    'class-helper': 'src/helpers/class-helper.ts',
    'value-converter': 'src/helpers/value-converter.ts',
  },
  format: ['esm'],
  minify: {
    compress: true,
    mangle: true,
  },
  platform: 'neutral',
  publint: true,
  sourcemap: 'hidden',
  target: 'es2022',
  treeshake: true,
});

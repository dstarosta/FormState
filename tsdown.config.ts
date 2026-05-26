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
    'form-state': 'src/index.ts',
    'form-schema': 'src/form-schema.tsx',
    'masked-input': 'src/masked-input.tsx',
    'secure-input': 'src/secure-input.tsx',
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
  outputOptions: {
    codeSplitting: {
      minSize: 0,
      groups: [{ name: 'element-values', test: /element-values/ }],
    },
  },
});

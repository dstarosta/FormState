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
  entry: 'src/index.ts',
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

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
  entry: 'src/index.ts',
  clean: true,
  deps: {
    onlyBundle: ['fast-equals'],
  },
  dts: {
    enabled: false,
  },
  minify: true,
  sourcemap: 'hidden',
  treeshake: true,
});

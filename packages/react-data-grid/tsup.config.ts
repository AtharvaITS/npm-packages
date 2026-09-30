import { defineConfig } from 'tsup';
import { readFileSync, writeFileSync } from 'node:fs';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  async onSuccess() {
    const css = ['src/styles/tokens.css', 'src/styles/grid.css']
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    writeFileSync('dist/styles.css', css);
  },
});

import resolve from '@rollup/plugin-node-resolve';
import {defineConfig} from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

const commonPlugins = [
  resolve({
    preferBuiltins: false,
    extensions: ['.js', '.ts']
  }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false
  }),
];

const minifiedPlugins = [
  ...commonPlugins,
  terser({
    compress: {
      drop_console: true,
      drop_debugger: true,
    },
    mangle: {
      toplevel: true,
    },
  }),
];

export default defineConfig([
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    plugins: commonPlugins,
    external: []
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.min.cjs',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    plugins: minifiedPlugins,
    external: []
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    },
    plugins: commonPlugins,
    external: []
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.min.esm.js',
      format: 'esm',
      sourcemap: true
    },
    plugins: minifiedPlugins,
    external: []
  },
  {
    input: 'src/index.ts',
    output: {
      file: packageJson.types,
      format: 'esm'
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist',
        emitDeclarationOnly: true
      })
    ]
  }
]);

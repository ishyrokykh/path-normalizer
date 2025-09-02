import resolve from '@rollup/plugin-node-resolve';
import {defineConfig} from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

export default defineConfig([
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      resolve({
        preferBuiltins: false,
        extensions: ['.js', '.ts']
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
    ],
    external: []
  },
  {
    input: 'src/index.ts',
    output: {
      file: packageJson.module,
      format: 'esm',
      sourcemap: true
    },
    plugins: [
      resolve({
        preferBuiltins: false,
        extensions: ['.js', '.ts']
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
    ],
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

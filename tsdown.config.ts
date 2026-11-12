import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/models/*.ts', 'src/ai-sdk/*.ts', 'src/tanstack/*.ts'],
  format: 'esm',
  dts: true,
  tsconfig: 'tsconfig.build.json',
  clean: true,
  unbundle: true,
});

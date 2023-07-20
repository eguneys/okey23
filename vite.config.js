import glsl from 'vite-plugin-glsl'
import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  base: './',
  plugins: [glsl()],
  build: {
    minify: 'terser',
    terserOptions: {
      mangle: {
        module: true,
        properties: {
          keep_quoted: 'strict',
          reserved: ['make', 'try_make_platform', 'try_make_renderer', 'from_image', 'hex', '_tweens', 'create_transform', 'create_translation_x', 'create_rotation', 'create_translation']
        }
      }
    },
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      plugins: [
        visualizer({ filename: 'build-analysis.html', open: true, bundle: true }),
      ],
      output: {
        entryFileNames: 'assets/[name].min.js',
      }
    }
  }
})

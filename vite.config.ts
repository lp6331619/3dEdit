/*
 * @Author: sorry 247076126@qq.com
 * @Date: 2024-10-12 14:14:11
 * @LastEditors: Teemor 232957726@qq.com
 * @LastEditTime: 2025-04-14 16:28:07
 * @FilePath: \3DThreeEdit\vite.config.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import UnoCSS from 'unocss/vite'
import { OUTPUT_DIR, brotliSize, chunkSizeWarningLimit, terserOptions, rollupOptions } from './build/constant'
import viteCompression from 'vite-plugin-compression'
import { viteMockServe } from 'vite-plugin-mock'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

function pathResolve(dir: string) {
  return resolve(process.cwd(), '.', dir)
}

export default defineConfig({
  base: '/',
  // 路径重定向
  resolve: {
    alias: [
      {
        find: /\/#\//,
        replacement: pathResolve('types')
      },
      {
        find: '@',
        replacement: pathResolve('src')
      },
      {
        find: 'vue-i18n',
        replacement: 'vue-i18n/dist/vue-i18n.cjs.js' //解决i8n警告
      }
    ],
    dedupe: ['vue']
  },
  // 全局 css 注册
  css: {
    preprocessorOptions: {
      scss: {
        javascriptEnabled: true,
        additionalData: `@import "src/styles/common/style.scss";`
      }
    }
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // 排除 iconify 图标影子组件编译报错
          isCustomElement: tag =>
            tag.startsWith('iconify-icon') ||
            tag.startsWith('TresGridHelper') ||
            tag.startsWith('TresAxesHelper') ||
            tag.startsWith('TresPerspectiveCamera') ||
            tag.startsWith('TresAmbientLight') ||
            tag.startsWith('TresDirectionalLight') ||
            tag.startsWith('TresMesh') ||
            tag.startsWith('TresSphereGeometry') ||
            tag.startsWith('TresPlaneGeometry')
        }
      }
    }),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'typescript', 'json', 'html']
    }),
    viteMockServe({
      mockPath: '/src/api/mock',
      // 开发打包开关
      localEnabled: true,
      // 生产打包开关
      prodEnabled: true,
      // 打开后，可以读取 ts 文件模块。 请注意，打开后将无法监视.js 文件
      supportTs: true,
      // 监视文件更改
      watchFiles: true
    }),
    UnoCSS({
      hmrTopLevelAwait: false
    }),
    // 压缩
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'gzip',
      ext: '.gz'
    })
  ],
  server: {
    proxy: {
      '/api': {
        // target: 'http://192.168.100.5:6001/', // 目标服务器地址
        target: 'http://47.96.172.251:6001/',
        changeOrigin: true, // 是否修改请求头中的 Origin 字段
        rewrite: path => {
          return path.replace(/^\/api/, '')
        }
      }
    }
  },
  build: {
    target: 'es2020',
    outDir: OUTPUT_DIR,
    // minify: 'terser', // 如果需要用terser混淆，可打开这两行
    // terserOptions: terserOptions,
    rollupOptions: rollupOptions,
    reportCompressedSize: brotliSize,
    chunkSizeWarningLimit: chunkSizeWarningLimit
  }
})

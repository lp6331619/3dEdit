/*
 * @Author: sorry 247076126@qq.com
 * @Date: 2024-10-12 14:14:10
 * @LastEditors: sorry 247076126@qq.com
 * @LastEditTime: 2024-10-15 17:06:52
 * @FilePath: \3DThreeEdit\src\main.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { createApp } from 'vue'
import App from './App.vue'
import router, { setupRouter } from '@/router'
import i18n from '@/i18n/index'
import Tres from '@tresjs/core'
import { setupStore } from '@/store'
import { request } from '@/api/index'
import { setupNaive, setupDirectives, setupCustomComponents, initFunction } from '@/plugins'
import { GoAppProvider } from '@/components/GoAppProvider/index'
import { setHtmlTheme } from '@/utils'
import { addCollection } from 'iconify-icon'
import ElementPlus from 'element-plus'
import { registryRequest } from 'swagger-api/share'
import uimIcons from '@iconify/json/json/uim.json'
import lineMdIcons from '@iconify/json/json/line-md.json'
import wiIcons from '@iconify/json/json/wi.json'
import VueVirtualScroller from 'vue-virtual-scroller'
// 引入全局样式
import '@/styles/pages/index.scss'
// 引入动画
import 'animate.css/animate.min.css'
// 引入标尺
import 'vue3-sketch-ruler/lib/style.css'
import 'uno.css'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
// 注册图标
addCollection(uimIcons)
addCollection(lineMdIcons)
addCollection(wiIcons)
registryRequest(request)

// 在应用初始化时设置全局变量
if (typeof window !== 'undefined') {
  // 添加渲染循环控制变量
  window._tresCanvaThrottled = false
  window.transformBusy = false
  window._lastRenderTime = 0
  window.requestAnimationFrameThrottled = false
  window._modelLoadLastUpdate = 0

  // 添加优化的requestAnimationFrame，避免重复调用
  const originalRAF = window.requestAnimationFrame
  window._rafCallbacks = new Map()

  // 替换默认的requestAnimationFrame，添加防抖功能
  window.requestAnimationFrame = function (callback) {
    // 检查是否已存在相同的回调
    for (const [id, cb] of window._rafCallbacks.entries()) {
      if (cb.toString() === callback.toString()) {
        // 已存在相同回调，取消旧的并创建新的
        window.cancelAnimationFrame(id)
        break
      }
    }

    // 创建新的动画帧请求
    const rafId = originalRAF.call(window, time => {
      // 执行回调
      callback(time)
      // 执行完后从映射中移除
      window._rafCallbacks.delete(rafId)
    })

    // 保存回调引用
    window._rafCallbacks.set(rafId, callback)

    return rafId
  }
}

async function appInit() {
  const goAppProvider = createApp(GoAppProvider)

  const app = createApp(App)

  // 注册全局常用的 naive-ui 组件
  setupNaive(app)

  // 注册全局自定义指令
  setupDirectives(app)

  // 注册全局自定义组件
  setupCustomComponents(app)

  // 挂载状态管理
  setupStore(app)

  // 解决路由守卫，Axios中可使用，Dialog，Message 等全局组件
  goAppProvider.mount('#appProvider', true)

  // 挂载路由
  setupRouter(app)

  // 路由准备就绪后挂载APP实例
  await router.isReady()

  // Store 准备就绪后处理主题色
  setHtmlTheme()
  app.use(ElementPlus)
  // 语言注册
  app.use(i18n)
  // tresjs注册
  app.use(Tres)
  // 虚拟滚动
  app.use(VueVirtualScroller)
  // 挂载到页面
  app.mount('#app', true)

  // 挂载到 window
  window['$vue'] = app
}

appInit().then(() => {
  initFunction()
})

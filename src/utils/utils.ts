import { h } from 'vue'
import { NIcon } from 'naive-ui'
import screenfull from 'screenfull'
import throttle from 'lodash/throttle'
import Image_404 from '../assets/images/exception/image-404.png'
import html2canvas from 'html2canvas'
import { downloadByA } from './file'
import { toString } from './type'
import cloneDeep from 'lodash/cloneDeep'
import { WinKeyboard } from '@/enums/editPageEnum'
import { RequestHttpIntervalEnum, RequestParamsObjType } from '@/enums/httpEnum'
import { CreateComponentType, CreateComponentGroupType } from '@/packages/index.d'
import { excludeParseEventKeyList, excludeParseEventValueList } from '@/enums/eventEnum'

/**
 * * 判断是否是开发环境
 * @return { Boolean }
 */
export const isDev = () => {
  return import.meta.env.DEV
}

/**
 * * 生成一个不重复的ID
 * @param { Number } randomLength
 */
export const getUUID = (randomLength = 10) => {
  return 'id_' + Number(Math.random().toString().substring(2, randomLength) + Date.now()).toString(36)
}

/**
 * * render 图标
 *  @param icon 图标
 *  @param set 设置项
 */
export const renderIcon = (icon: any, set = {}) => {
  return () => h(NIcon, set, { default: () => h(icon) })
}
/**
 * * render 语言
 *  @param lang 语言标识
 *  @param set 设置项
 *  @param tag 要渲染成的标签
 */
export const renderLang = (lang: string, set = {}, tag = 'span') => {
  return () => h(tag, set, { default: () => window['$t'](lang) })
}

/**
 * * 获取错误处理图片，默认 404 图
 * @returns url
 */
export const requireErrorImg = () => {
  return Image_404
}

/**
 * * 全屏操作函数
 * @param isFullscreen
 * @param isEnabled
 * @returns
 */
export const screenfullFn = (isFullscreen?: boolean, isEnabled?: boolean) => {
  // 是否是全屏
  if (isFullscreen) return screenfull.isFullscreen

  // 是否支持全屏
  if (isEnabled) return screenfull.isEnabled

  if (screenfull.isEnabled) {
    screenfull.toggle()
    return
  }
  // TODO lang
  window['$message'].warning('您的浏览器不支持全屏功能！')
}

/**
 * 修改元素位置
 * @param target 对象
 * @param x X轴
 * @param y Y轴
 * @param z Z轴
 */
export const setComponentPosition = (
  target: CreateComponentType | CreateComponentGroupType,
  x?: number,
  y?: number
) => {
  x && (target.attr.x = x)
  y && (target.attr.y = y)
  target.attr.z = 0
}

/**
 * * 设置元素属性
 * @param HTMLElement 元素
 * @param key 键名
 * @param value 键值
 */
export const setDomAttribute = <K extends keyof CSSStyleDeclaration, V extends CSSStyleDeclaration[K]>(
  HTMLElement: HTMLElement,
  key: K,
  value: V
) => {
  if (HTMLElement) {
    HTMLElement.style[key] = value
  }
}

/**
 * * 判断是否是 mac
 * @returns boolean
 */
export const isMac = () => {
  return /macintosh|mac os x/i.test(navigator.userAgent)
}

/**
 * * file转url
 */
export const fileToUrl = (file: File): string => {
  const Url = URL || window.URL || window.webkitURL
  const ImageUrl = Url.createObjectURL(file)
  return ImageUrl
}

/**
 * * file转base64
 */
export const fileTobase64 = (file: File, callback: Function) => {
  let reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = function (e: ProgressEvent<FileReader>) {
    if (e.target) {
      let base64 = e.target.result
      callback(base64)
    }
  }
}

/**
 * * 挂载监听
 */
// eslint-disable-next-line no-undef
export const addEventListener = <K extends keyof WindowEventMap>(
  target: HTMLElement | Document,
  type: K,
  listener: any,
  delay?: number,
  // eslint-disable-next-line no-undef
  options?: boolean | AddEventListenerOptions | undefined
) => {
  if (!target) return
  target.addEventListener(
    type,
    throttle(listener, delay || 300, {
      leading: true,
      trailing: false
    }),
    options
  )
}

/**
 * * 卸载监听
 */
// eslint-disable-next-line no-undef
export const removeEventListener = <K extends keyof WindowEventMap>(
  target: HTMLElement | Document,
  type: K,
  listener: any
) => {
  if (!target) return
  target.removeEventListener(type, listener)
}

/**
 * * 截取画面为图片并下载
 * @param html 需要截取的 DOM
 */
export const canvasCut = (html: HTMLElement | null, callback?: Function) => {
  if (!html) {
    window['$message'].error('导出失败！')
    if (callback) callback()
    return
  }

  html2canvas(html, {
    backgroundColor: null,
    allowTaint: true,
    useCORS: true
  }).then((canvas: HTMLCanvasElement) => {
    window['$message'].success('导出成功！')
    downloadByA(canvas.toDataURL(), undefined, 'png')
    if (callback) callback()
  })
}

/**
 * * 函数过滤器
 * @param data 数据值
 * @param res 返回顶级对象
 * @param funcStr 函数字符串
 * @param isToString 是否转为字符串
 * @param errorCallBack 错误回调函数
 * @param successCallBack 成功回调函数
 * @returns
 */
export const newFunctionHandle = (
  data: any,
  res: any,
  funcStr?: string,
  isToString?: boolean,
  errorCallBack?: Function,
  successCallBack?: Function
) => {
  try {
    if (!funcStr) return data
    const fn = new Function('data', 'res', funcStr)
    const fnRes = fn(cloneDeep(data), cloneDeep(res))
    const resHandle = isToString ? toString(fnRes) : fnRes
    // 成功回调
    successCallBack && successCallBack(resHandle)
    return resHandle
  } catch (error) {
    // 失败回调
    errorCallBack && errorCallBack(error)
    return '函数执行错误'
  }
}

/**
 * * 处理请求事件单位
 * @param num 时间间隔
 * @param unit RequestHttpIntervalEnum
 * @return number 秒数
 */
export const intervalUnitHandle = (num: number, unit: RequestHttpIntervalEnum) => {
  switch (unit) {
    // 秒
    case RequestHttpIntervalEnum.SECOND:
      return num * 1000
    // 分
    case RequestHttpIntervalEnum.MINUTE:
      return num * 1000 * 60
    // 时
    case RequestHttpIntervalEnum.HOUR:
      return num * 1000 * 60 * 60
    // 天
    case RequestHttpIntervalEnum.DAY:
      return num * 1000 * 60 * 60 * 24
    default:
      return num * 1000
  }
}

/**
 * * 对象转换 cookie 格式
 * @param obj
 * @returns string
 */
export const objToCookie = (obj: RequestParamsObjType) => {
  if (!obj) return ''

  let str = ''
  for (const key in obj) {
    str += key + '=' + obj[key] + ';'
  }
  return str.substring(0, str.length - 1)
}

/**
 * * 设置按下键盘按键的底部展示
 * @param keyCode
 * @returns
 */
export const setKeyboardDressShow = (keyCode?: number) => {
  const code = new Map([
    [17, WinKeyboard.CTRL],
    [32, WinKeyboard.SPACE]
  ])

  const dom = document.getElementById('keyboard-dress-show')
  if (!dom) return
  if (!keyCode) {
    window.onKeySpacePressHold?.(false)
    dom.innerText = ''
    return
  }
  if (keyCode && code.has(keyCode)) {
    if (keyCode == 32) window.onKeySpacePressHold?.(true)
    dom.innerText = `按下了「${code.get(keyCode)}」键`
  }
}

/**
 * * JSON序列化，支持函数和 undefined
 * @param data
 */
export const JSONStringify = <T>(data: T) => {
  const seen = new Set()

  return JSON.stringify(data, (key, val) => {
    // 处理函数丢失问题
    if (typeof val === 'function') {
      return `${val}`
    }

    // 处理 undefined 丢失问题
    if (typeof val === 'undefined') {
      return null
    }

    // 处理循环引用
    if (val !== null && typeof val === 'object') {
      if (seen.has(val)) {
        return '[Circular]'
      }
      seen.add(val)
    }

    return val
  })
}
export const evalFn = (fn: string) => {
  var Fun = Function // 一个变量指向Function，防止前端编译工具报错
  return new Fun('return ' + fn)()
}

/**
 * * JSON反序列化，支持函数和 undefined
 * @param data
 */
export const JSONParse = (data: string) => {
  if (data.trim() === '') return
  return JSON.parse(data, (k, v) => {
    // // 过滤函数字符串
    // if (excludeParseEventKeyList.includes(k)) return v
    // // 过滤函数值表达式
    // if (typeof v === 'string') {
    //   const someValue = excludeParseEventValueList.some(excludeValue => v.indexOf(excludeValue) > -1)
    //   if (someValue) return v
    // }
    if (k !== 'formatter') {
      return v
    }
    // 还原函数值
    if (typeof v === 'string' && v.indexOf && (v.indexOf('function') > -1 || v.indexOf('=>') > -1)) {
      return evalFn(`(function(){return ${v}})()`)
    } else if (typeof v === 'string' && v.indexOf && v.indexOf('return ') > -1) {
      const baseLeftIndex = v.indexOf('(')
      if (baseLeftIndex > -1) {
        const newFn = `function ${v.substring(baseLeftIndex)}`
        return evalFn(`(function(){return ${newFn}})()`)
      }
    }
    return v
  })
}

/**
 * * 修改顶部标题
 * @param title
 */
export const setTitle = (title?: string) => {
  title && (document.title = title)
}
export function createError(msg, type = 2) {
  const error = new Error(msg)
  error.type = type
  return error
}
// 节流
export function throttle(func: Function, delay: any) {
  let timer = null
  return function () {
    if (!timer) {
      func.apply(this, arguments)
      timer = setTimeout(() => {
        timer = null
      }, delay)
    }
  }
}
// 防抖
export function debounce(func: Function, wait: number, immediate: boolean = false) {
  let timeout: any = null
  return function () {
    const context = this
    const args = arguments

    if (timeout) clearTimeout(timeout)

    if (immediate) {
      const callNow = !timeout
      timeout = setTimeout(() => {
        timeout = null
      }, wait)
      if (callNow) func.apply(context, args)
    } else {
      timeout = setTimeout(() => {
        func.apply(context, args)
      }, wait)
    }
  }
}

export const getVarType = (anything: any) => {
  return Object.prototype.toString.call(anything).slice(8, -1)
}
// 深拷贝
export function deepClone(obj: any) {
  // 申明一个容器 用于存放科隆的数据
  let warp: any
  // 读取类型
  const objType = getVarType(obj)
  // 判断读到的类型 并且以符合的存放格式存放数据
  if (objType === 'Object') {
    warp = {}
  } else if (objType === 'Array') {
    warp = []
  } else {
    return obj
  }
  //  循环数据内容
  for (const x in obj) {
    //  得到的数据内容
    const value = obj[x]
    // 判断 已经得到的内容里是否还有Object，Array
    //  因为 数据中可能出现 [1,2,[4,5,4,],47,97] 这种情况
    const valueType = getVarType(value)
    if (valueType === 'Object' || valueType === 'Array') {
      // 当出现上述情况是 使用递归函数进行再次运行
      warp[x] = deepClone(value)
    } else {
      // 如果没有出现上诉情况 直接克隆
      warp[x] = obj[x]
    }
  }
  return warp
}

export function inspectError(error, type = 2) {
  return error instanceof Error && (error.type & type) === type
}

export function isApiCode(pen, apiCode) {
  return pen.apiType === apiCode //|| pen.apiType === ApiTypeEnum.mixApi;
}

//获取摄像机的位置和lookAt
export function getCameraPositionLookAt(TresCanvasRef: any, distance: any) {
  const {
    context: {
      camera, // Three.js 的摄像机对象
      scene, // Three.js 的场景对象
      renderer // Three.js 的渲染器对象
    }
  } = TresCanvasRef
  const position = [camera.value.position.x, camera.value.position.y, camera.value.position.z]
  // 获取摄像机的世界方向（单位向量）
  const dir = camera.value.getWorldDirection(new THREE.Vector3())
  // dir 是一个单位向量，表示摄像机正前方的方向
  // 如果你想要一个“lookAt点”，可以用 position + dir * 距离
  const lookAt = [position[0] + dir.x * distance, position[1] + dir.y * distance, position[2] + dir.z * distance]
  return {
    lookAt,
    position
  }
}

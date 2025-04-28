/*
 * @Author: sorry 247076126@qq.com
 * @Date: 2024-10-12 14:14:11
 * @LastEditors: sorry 247076126@qq.com
 * @LastEditTime: 2024-11-19 14:36:02
 * @FilePath: \3DThreeEdit\src\settings\designSetting.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { LangEnum, PreviewScaleEnum } from '@/enums/styleEnum'
import { RequestHttpIntervalEnum } from '@/enums/httpEnum'
import designColor from './designColor.json'

// 默认语言
export const lang = LangEnum.ZH

// 水印文字
export const watermarkText = 'GoView 低代码平台'

// 分组名称
export const groupTitle = '分组'

// 主题配置
export const theme = {
  // 默认是否开启深色主题
  darkTheme: true,
  //默认主题色
  appTheme: '#409EFF',
  appThemeDetail: null
}
export const borderConfig = {
  rotation: [0, 0, 0, 'XYZ'],
  scale: [1, 1, 1],
}
//默认文字配置
export const defaultBorderText = {
  link: '',
  linkHead: 'http://',
  dataset: '我是文本',
  fontSize: 20,
  fontColor: '#ffffff',
  paddingX: 10,
  paddingY: 10,
  textAlign: 'center', // 水平对齐方式
  fontWeight: 'normal',
  position:[0,0,0],
  isDynamics: false, //是否使用动态数据
  dataList: [], //动态数据
  // 字间距
  letterSpacing: 5,
  writingMode: 'horizontal-tb',
  ...borderConfig,
}
//可以绑定数据的组件类型
export const setDataTypes = [
  'TextBarrage',
  'TextCommon',
  'Border01',
  'Border02',
  'Border03',
  'Border04',
  'Border05',
  'Border06',
  'Border07',
  'Border08',
  'Border09',
  'Border10',
  'Border11',
  'Border12',
  'Border13',
  'Image'
]
//只可以配置输出通道的组件
export const setDataTypesOut = ['Image']
// 图表初始配置(px)
export const chartInitConfig = {
  x: 50,
  y: 50,
  w: 400,
  h: 200,
  // 不建议动 offset
  offsetX: 0,
  offsetY: 0
}
//默认模型配置
export const defaultOption = {
  position: [0, 0, 0],
  castShadow: true
}
export const defaultChildren = [
  {
    type: 'BoxGeometry',
    config: {
      args: [1, 1, 1]
    }
  },
  {
    config: {
      //基础配置
      opacity: 0.01,
      visible: false,
      transparent: true,
      color: '#214A68',
      fog: true,
      wireframe: true

      // vertexColors: true 不支持 顶点着色
      // map: 'none'
      // gradientMap: 'threeTone'
      // alphaMap: 'none'
      // vertexColors: true,
      // wireframe: false
    },
    type: 'MeshToonMaterial'
  }
]
// dialog 图标的大小
export const dialogIconSize = '20'

// 侧边栏宽度
export const asideWidth = '270'

// 侧边栏折叠后的宽度，支持全部折叠会覆盖为 0
export const asideCollapsedWidth = 60

// 弹窗是否可以通过点击遮罩关闭
export const maskClosable = false

// 全局边框圆角
export const borderRadius = '4px'

// 轮播间隔
export const carouselInterval = 4000

// 工作台大屏背景图片大小限制（5M）
export const backgroundImageSize = 5

// 预览展示方式
export const previewScaleType = PreviewScaleEnum.FIT

// 编辑工作台同步到 JSON 的轮询间隔（5S）
export const editToJsonInterval = 5000

// 数据请求间隔
export const requestInterval = 30

// 数据请求间隔单位
export const requestIntervalUnit = RequestHttpIntervalEnum.SECOND

// 工作区域历史记录存储最大数量
export const editHistoryMax = 100

// 拖拽时蒙层的 z-index，需比所有图表高
export const canvasModelIndex = 9999

// 框选时蒙层的 z-index，需比所有图表高
export const selectBoxIndex = canvasModelIndex + 10

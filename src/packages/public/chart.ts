import merge from 'lodash/merge'
import pick from 'lodash/pick'
import { EchartsDataType } from '../index.d'
import { globalThemeJson } from '@/settings/chartThemes/index'
import type VChart from 'vue-echarts'

/**
 * * 合并 color 和全局配置项
 * @param option 配置
 * @param themeSetting 设置
 * @param excludes 排除元素
 * @returns object
 */
export const mergeTheme = <T, U>(option: T, themeSetting: U, includes: string[]) => {
  return (option = merge({}, pick(themeSetting, includes), option))
}

/**
 * * ECharts option 统一前置处理
 * @param option
 * @return option
 */
export const echartOptionProfixHandle = (option: any, includes: string[]) => {
  option['backgroundColor'] = 'rgba(0,0,0,0)'
  return mergeTheme(option, globalThemeJson, includes)
}

/**
 * * 设置数据
 * @param option
 * @return option
 */
export const setData = (option: any, data: EchartsDataType) => {
  option.dataset = data
  return option
}

/**
 * * 配置公共 setOption 方法
 * @param instance
 * @param data
 */
export const setOption = <T extends typeof VChart | undefined, D>(instance: T, data: D, notMerge = true) => {
  if (!instance) return
  const option = instance.getOption()
  option.dataset = null
  instance.setOption(data, {
    notMerge: notMerge
  })
}
/**
 * * 材质列表
 */
// MeshStandardMaterial (标准PBR材质)
// MeshPhysicalMaterial (物理材质，是StandardMaterial的扩展)
// MeshBasicMaterial (基础材质)
// MeshLambertMaterial (Lambert材质，用于非光泽表面)
// MeshPhongMaterial (Phong材质，用于光泽表面)
// MeshToonMaterial (卡通材质)
// MeshMatcapMaterial (MatCap材质)
// MeshNormalMaterial (法线材质)
// SpriteMaterial (精灵材质，用于粒子效果)
export const materialList = [
  {
    label: '基础网格材质',
    value: 'MeshBasicMaterial'
  },
  {
    label: '标准网格材质',
    value: 'MeshStandardMaterial'
  },
  {
    label: '卡通网格材质',
    value: 'MeshToonMaterial'
  },
  {
    label: '精灵材质',
    value: 'SpriteMaterial'
  },
  // {
  //   label: '深度网格材质',
  //   value: 'MeshDepthMaterial'
  // },
  // {
  //   label: '距离网格材质',
  //   value: 'MeshDistanceMaterial'
  // },
  {
    label: 'Lambert网格材质',
    value: 'MeshLambertMaterial'
  },
  {
    label: '材质捕捉网格材质',
    value: 'MeshMatcapMaterial'
  },
  {
    label: '法线网格材质',
    value: 'MeshNormalMaterial'
  },
  {
    label: 'Phong网格材质',
    value: 'MeshPhongMaterial'
  },
  {
    label: '物理网格材质',
    value: 'MeshPhysicalMaterial'
  }
]

export const materialTextureTypes = {
  MeshBasicMaterial: [
    { label: '颜色贴图', value: 'map' },
    { label: '透明度贴图', value: 'alphaMap' },
    { label: '环境遮蔽贴图', value: 'aoMap' }
  ],

  MeshStandardMaterial: [
    { label: '颜色贴图', value: 'map' },
    { label: '法线贴图', value: 'normalMap' },
    { label: '粗糙度贴图', value: 'roughnessMap' },
    { label: '金属度贴图', value: 'metalnessMap' },
    { label: '环境遮蔽贴图', value: 'aoMap' },
    { label: '位移贴图', value: 'displacementMap' }
  ],

  MeshToonMaterial: [
    { label: '颜色贴图', value: 'map' },
    { label: '渐变贴图', value: 'gradientMap' },
    { label: '透明度贴图', value: 'alphaMap' }
  ],

  MeshPhongMaterial: [
    { label: '颜色贴图', value: 'map' },
    { label: '法线贴图', value: 'normalMap' },
    { label: '高光贴图', value: 'specularMap' },
    { label: '透明度贴图', value: 'alphaMap' }
  ],

  MeshLambertMaterial: [
    { label: '颜色贴图', value: 'map' },
    { label: '透明度贴图', value: 'alphaMap' },
    { label: '环境遮蔽贴图', value: 'aoMap' }
  ],

  MeshMatcapMaterial: [
    { label: '颜色贴图', value: 'map' },
    { label: 'MatCap贴图', value: 'matcap' },
    { label: '法线贴图', value: 'normalMap' }
  ],

  MeshNormalMaterial: [{ label: '法线贴图', value: 'normalMap' }],

  MeshPhysicalMaterial: [
    { label: '颜色贴图', value: 'map' },
    { label: '法线贴图', value: 'normalMap' },
    { label: '粗糙度贴图', value: 'roughnessMap' },
    { label: '金属度贴图', value: 'metalnessMap' },
    { label: '清漆贴图', value: 'clearcoatMap' },
    { label: '清漆法线贴图', value: 'clearcoatNormalMap' },
    { label: '清漆粗糙度贴图', value: 'clearcoatRoughnessMap' },
    { label: '光泽贴图', value: 'sheenMap' },
    { label: '透射贴图', value: 'transmissionMap' }
  ]
}

export const textureKeys = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'alphaMap',
  'aoMap',
  'displacementMap',
  'gradientMap',
  'specularMap',
  'matcap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
  'sheenMap',
  'transmissionMap'
]

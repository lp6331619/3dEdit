/*
 * @Descripttion: 
 * @version: 1.0
 * @Author: Teemor
 * @Date: 2024-11-28 17:45:20
 * @LastEditors: Teemor
 * @LastEditTime: 2024-12-09 16:42:13
 */
// 特效配置
export const effectComposerConfig = {
  isColorCorrection: false,
  SAOProperty: {
    enabled: false,
    output: 0,
    saoBias: 1, //偏移
    saoIntensity: 1, //强度
    saoScale: 10, //比例
    saoKernelRadius: 100, //内核半径
    saoMinResolution: 1, //最小分辨率
    saoBlur: true, //模糊
    saoBlurRadius: 200, //模糊半径
    saoBlurStdDev: 150,
    saoBlurDepthCutoff: 0.01
  },
  SSAOProperty: {
    enabled: false,
    output: 0,
    kernelRadius: 8,
    minDistance: 0.005,
    maxDistance: 0.1
  },
  BloomPass: {
    enabled: false,
    threshold: 0,
    strength: 0.972,
    radius: 0.21
  },
  HueSaturation: {
    enabled: false,
    hue: 0,
    saturation: 0
  },
  FilmPass: {
    enabled: false,
    intensity: 0,
    grayscale: false
  },
  DotScreenPass: {
    enabled: false,
    centerX: 0,
    centerY: 0,
    angle: 0,
    scale: 0
  },
  GlitchPass: {
    enabled: false,
    goWild: true
  },
  explosion:{
    speed: 1,
      distances: 3000,
      explode: false,
      disintegrate: false
  }
}
// 轮廓线配置
export const outlinePassListConfig = [
  {
    name: [],
    attrs: {
      visibleEdgeColor: '#ff0000',
      edgeThickness: 4,
      edgeStrength: 6,
      pulsePeriod: 2
    }
  }
]

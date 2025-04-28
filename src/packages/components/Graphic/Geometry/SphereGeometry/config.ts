import { PublicConfigClass } from '@/packages/public'
import { CreateComponentType } from '@/packages/index.d'
import { SphereGeometryConfig } from './index'
import { chartInitConfig } from '@/settings/designSetting'
import {borderConfig}  from '@/settings/designSetting'
import cloneDeep from 'lodash/cloneDeep'

export enum FontWeightEnum {
  NORMAL = '常规',
  BOLD = '加粗'
}

export const FontWeightObject = {
  [FontWeightEnum.NORMAL]: 'normal',
  [FontWeightEnum.BOLD]: 'bold'
}
export const option = {
  dataset: '',
  position: [0, 0, 0],
  castShadow: true,
  ...borderConfig
}
export const children = [
  {
    type: 'SphereGeometry',
    config: {
      args: [1, 32, 32, 0, 6.283185307179586, 0, 3.1415926]
    }
  },
  {
    config: {
      opacity: 1,
      visible: true,
      transparent: true,
      color: '#214A68',
      fog: true,
      wireframe: false
    },
    type: 'MeshToonMaterial'
  }
]
export default class Config extends PublicConfigClass implements CreateComponentType {
  public key = SphereGeometryConfig.key
  public attr = { ...chartInitConfig, w: 500, h: 70, zIndex: -1 }
  public chartConfig = cloneDeep(SphereGeometryConfig)
  public option = cloneDeep(option)
  public preview = { overFlowHidden: true }
  public children = cloneDeep(children)
  public type = 'TresMesh'
  public name = SphereGeometryConfig.title
}

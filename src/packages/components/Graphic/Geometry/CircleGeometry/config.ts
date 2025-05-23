/*
 * @Author: sorry 247076126@qq.com
 * @Date: 2024-11-16 16:49:10
 * @LastEditors: sorry 247076126@qq.com
 * @LastEditTime: 2024-11-16 17:39:23
 * @FilePath: \3DThreeEdit\src\packages\components\Graphic\Geometry\CircleGeometry\config.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { PublicConfigClass } from '@/packages/public'
import { CreateComponentType } from '@/packages/index.d'
import { CircleGeometryConfig } from './index'
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
    type: 'CircleGeometry',
    config: {
      args: [2, 32, 4]
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
  public key = CircleGeometryConfig.key
  public attr = { ...chartInitConfig, w: 500, h: 70, zIndex: -1 }
  public chartConfig = cloneDeep(CircleGeometryConfig)
  public option = cloneDeep(option)
  public preview = { overFlowHidden: true }
  public children = cloneDeep(children)
  public type = 'TresMesh'
  public name = CircleGeometryConfig.title
}

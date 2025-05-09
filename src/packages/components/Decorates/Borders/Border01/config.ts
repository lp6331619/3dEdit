import { PublicConfigClass } from '@/packages/public'
import { CreateComponentType } from '@/packages/index.d'
import { Border01Config } from './index'
import { defaultBorderText } from '@/settings/designSetting'
import cloneDeep from 'lodash/cloneDeep'

export const option = {
  dur: 0.5,
  colors: ['#4fd2dd', '#235fa7'],
  backgroundColor: '#000',
  ...defaultBorderText
}

export default class Config extends PublicConfigClass implements CreateComponentType {
  public key = Border01Config.key
  public chartConfig = cloneDeep(Border01Config)
  public option = cloneDeep(option)
  public type = 'Html'
}

<!--
 * @Author: sorry 247076126@qq.com
 * @Date: 2024-11-05 15:00:07
 * @LastEditors: Teemor 232957726@qq.com
 * @LastEditTime: 2025-04-25 11:46:15
 * @FilePath: \3DThreeEdit\src\packages\components\Graphic\Geometry\BoxGeometry\config.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <collapse-item name="材质" :expanded="true">
    <setting-item-box name="材质类型" :alone="true">
      <setting-item>
        <n-select v-model:value="childrenData[1].type" size="small" :options="materialList"  @update:value="handleMaterialChange"/>
      </setting-item>
    </setting-item-box>
    <Config :childrenData="childrenData" />
    <!-- <component :is="type" :childrenData="childrenData" /> -->
    <MeshBasicMaterial v-if="type == 'MeshBasicMaterial'" :childrenData="childrenData" />
    <MeshStandardMaterial v-if="type == 'MeshStandardMaterial'" :childrenData="childrenData" />
    <MeshToonMaterial v-if="type == 'MeshToonMaterial'" :childrenData="childrenData" />
    <MeshDepthMaterial v-if="type == 'MeshDepthMaterial'" :childrenData="childrenData" />
    <MeshLambertMaterial v-if="type == 'MeshLambertMaterial'" :childrenData="childrenData" />
    <MeshMatcapMaterial v-if="type == 'MeshMatcapMaterial'" :childrenData="childrenData" />
    <MeshNormalMaterial v-if="type == 'MeshNormalMaterial'" :childrenData="childrenData" />
    <MeshPhongMaterial v-if="type == 'MeshPhongMaterial'" :childrenData="childrenData" />
    <MeshPhysicalMaterial v-if="type == 'MeshPhysicalMaterial'" :childrenData="childrenData" />
  </collapse-item>
  <collapse-item name="贴图" :expanded="true">
    <setting-item-box name="材质贴图" :alone="true">
      <setting-item>
        <n-upload
          accept="image/*"
          :custom-request="handleUpload"
          :max="1"
          list-type="image-card"
          :file-list="fileList"
          @remove="clearImg"
          @update:file-list="handleUpdateFileList"
        > 点击上传
        </n-upload>
      </setting-item>
    </setting-item-box>
        <!-- 根据当前材质类型显示对应的贴图选项 -->
    <setting-item-box name="贴图类型">
      <setting-item>
        <n-select 
          v-model:value="childrenData[1].textureType" 
          :options="getTextureTypesByMaterial" 
          @update:value="handleTextureChange"
        />
      </setting-item>
      <n-button @click="applyTexture" :disabled="!files">应用贴图</n-button>
    </setting-item-box>
  </collapse-item>
</template>
<script setup lang="ts">
import { PropType, computed, defineAsyncComponent ,ref, onMounted} from 'vue'
import { storedFileUploadFile } from 'swagger-api/export-api/scada-config'
import { swatchesColors } from '@/settings/chartThemes/index'
import { materialList ,materialTextureTypes,textureKeys} from '@/packages/public/chart'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { deepClone } from '@/utils'
import { CollapseItem, SettingItemBox, SettingItem } from '@/components/Pages/ChartItemSetting'
const chartEditStore = useChartEditStore()
const props = defineProps({
  optionData: {
    type: Object,
    required: true
  },
  childrenData: {
    type: Array,
    required: true
  }
})
const Config = defineAsyncComponent(() => import('../components/Config.vue'))
const MeshBasicMaterial = defineAsyncComponent(() => import('../components/MeshBasicMaterial.vue'))
const MeshStandardMaterial = defineAsyncComponent(() => import('../components/MeshStandardMaterial.vue'))
const MeshToonMaterial = defineAsyncComponent(() => import('../components/MeshToonMaterial.vue'))
const MeshDepthMaterial = defineAsyncComponent(() => import('../components/MeshDepthMaterial.vue'))
const MeshLambertMaterial = defineAsyncComponent(() => import('../components/MeshLambertMaterial.vue'))
const MeshMatcapMaterial = defineAsyncComponent(() => import('../components/MeshMatcapMaterial.vue'))
const MeshNormalMaterial = defineAsyncComponent(() => import('../components/MeshNormalMaterial.vue'))
const MeshPhongMaterial = defineAsyncComponent(() => import('../components/MeshPhongMaterial.vue'))
const MeshPhysicalMaterial = defineAsyncComponent(() => import('../components/MeshPhysicalMaterial.vue'))
const type = computed(() => {
  return props.childrenData[1].type
})
// 根据当前材质类型获取对应的贴图选项
const getTextureTypesByMaterial = computed(() => {
  return materialTextureTypes[type.value] || []
})

const targetChart = chartEditStore.getTargetChart
const fileList = ref([])
const files = ref()
const handleUpload =  (f) => {
  const {file} = f
  files.value = file
  const newFile = {
    id: file.name,
    name: file.name,
    status: 'finished',
    url: URL.createObjectURL(file)
  }
  fileList.value = [newFile]
}
// 处理文件列表更新
const handleUpdateFileList = (files) => {
  fileList.value = files
  if(files.length){
    const [f] = files
    files.value = f.file
    // 如果是新上传的文件，这里会触发 custom-request
    if (files[files.length - 1].status === 'pending') {
      handleUpload({ file: files[files.length - 1].file })
    }
  }
}

const handleMaterialChange = (newMaterialType: string) => {
  // 创建新的数据副本
  const newChildrenData = deepClone(props.childrenData)
  // 在副本上进行修改
  // 默认选择该类型下第一个贴图类型
  newChildrenData[1].textureType = getTextureTypesByMaterial.value[0].value || undefined
  // 清空配置中的所有贴图
  if (newChildrenData[1].config) {
    textureKeys.forEach(key => {
      if (newChildrenData[1].config[key]) {
        delete newChildrenData[1].config[key]
      }
    })
      // 清空文件列表和已上传文件
    fileList.value = []
    files.value = undefined
    // 更新组件数据
    const { selectId = [] } = targetChart
    const [f] = selectId
     f&& chartEditStore.setComponentListAll(f, newChildrenData, 'children')
  }
}
const handleTextureChange = (newTextureType: string) => {
  // 创建新的数据副本
  const newChildrenData = deepClone(props.childrenData)
  // 在副本上进行修改
  newChildrenData[1].textureType = newTextureType
  // 清空配置中的所有贴图
  if (newChildrenData[1].config) {
    let url = ''
    textureKeys.forEach(key => {
      if (newChildrenData[1].config[key]) {
        url = newChildrenData[1].config[key]
        delete newChildrenData[1].config[key]
      }
    })
    newChildrenData[1].config[newTextureType] =  url
    // 更新组件数据
    const { selectId = [] } = targetChart
    const [f] = selectId
    f && chartEditStore.setComponentListAll(f, newChildrenData, 'children')
  }
}


const applyTexture = async()=>{
  if(!files.value || !files.value.size) return
  const {selectId=[]} = targetChart
  const [f] = selectId
  const res = await storedFileUploadFile({file:files.value})
  const config = deepClone(props.childrenData)
  // 使用选择的贴图类型
  const textureType = config[1].textureType || 'map'
  textureKeys.map(item=>{
    config[1].config[item] = item == textureType?res.data: undefined
  })
  f && chartEditStore.setComponentListAll(f,config ,'children')
}
// 删除图片
const clearImg = ()=>{
  fileList.value = []
  files.value = undefined
}



onMounted(()=>{
  const textureType = props.childrenData[1].textureType || 'map'
  fileList.value = props.childrenData[1].config?.[textureType] 
    ? [{
        id: 'c',
        name: '',
        status: 'finished',
        url: props.childrenData[1].config[textureType]
      }] 
    : []
  console.log(fileList.value,props.childrenData,123123)
  files.value = fileList.value.length ? props.childrenData[1].config[textureType] : undefined
})
</script>

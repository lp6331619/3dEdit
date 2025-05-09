<!--
 * @Author: sorry 247076126@qq.com
 * @Date: 2024-11-05 15:00:07
 * @LastEditors: Teemor 232957726@qq.com
 * @LastEditTime: 2025-05-08 16:56:07
 * @FilePath: \3DThreeEdit\src\packages\components\Graphic\Geometry\BoxGeometry\config.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <collapse-item name="材质" :expanded="true">
    <setting-item-box name="材质类型" :alone="true">
      <setting-item>
        <n-select v-model:value="material.type" size="small" :options="materialList"  @update:value="handleMaterialChange"/>
      </setting-item>
    </setting-item-box>
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
    <!-- <setting-item-box name="贴图类型">
      <setting-item>
        <n-select 
          v-model:value="material.textureType" 
          :options="getTextureTypesByMaterial" 
          @update:value="handleTextureChange"
        />
      </setting-item>
    </setting-item-box> -->
    <setting-item-box name="">
      <n-button @click="applyTexture" :disabled="!files">应用贴图</n-button>
    </setting-item-box>
  </collapse-item>
</template>
<script setup lang="ts">
import { PropType, computed, defineAsyncComponent ,ref, onMounted, defineEmits} from 'vue'
import { storedFileUploadFile } from 'swagger-api/export-api/scada-config'
import { swatchesColors } from '@/settings/chartThemes/index'
import { option } from './config'
import { materialList ,materialTextureTypes,textureKeys} from '@/packages/public/chart'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { deepClone } from '@/utils'
import { CollapseItem, SettingItemBox, SettingItem } from '@/components/Pages/ChartItemSetting'
const chartEditStore = useChartEditStore()
const props = defineProps({
  material: {
    type: Object as PropType<{
      type: string;
      [key: string]: any;
    }>,
    required: true
  },
})

const type = computed(() => {
  return props.material?.type
})

// 根据当前材质类型获取对应的贴图选项
const getTextureTypesByMaterial = computed(() => {
  return materialTextureTypes[type.value as keyof typeof materialTextureTypes] || []
})

const targetChart = chartEditStore.getTargetChart
const fileList = ref<Array<{
  id: string;
  name: string;
  status: string;
  url: string;
}>>([])
const files = ref<File>()

const emit = defineEmits(['update:material'])

const handleUpload = (f: { file: File }) => {
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
const handleUpdateFileList = (files: any[]) => {
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
  const material = deepClone(props.material)
  // 在副本上进行修改
  if (material) {
    // 设置默认贴图类型
    // material.textureType = getTextureTypesByMaterial.value[0]?.value || 'map'
    // 清空配置中的所有贴图
    textureKeys.forEach(key => {
      if (material[key]) {
        delete material[key]
      }
    })
    material.type = newMaterialType
    // 清空文件列表和已上传文件
    fileList.value = []
    files.value = undefined
    // 通知父组件更新材质
    emit('update:material', material)
  }
}

const handleTextureChange = (newTextureType: string) => {
  // 创建新的数据副本
  const material = deepClone(props.material)
  // 在副本上进行修改
  material.textureType = newTextureType
  // 清空配置中的所有贴图
  textureKeys.forEach(key => {
    if (material[key]) {
      delete material[key]
    }
  })
  // 通知父组件更新材质
  emit('update:material', material)
}

const applyTexture = async() => {
  if(!files.value || !files.value.size) return
  const res = await storedFileUploadFile({file:files.value})
  const material = deepClone(props.material)
  // 使用选择的贴图类型
  const textureType = 'map'
  // 更新贴图
  material[textureType] = res.data
  // 通知父组件更新材质
  emit('update:material', material)
}

// 删除图片
const clearImg = () => {
  fileList.value = []
  files.value = undefined
}

onMounted(() => {
  const textureType = 'map'
  fileList.value = props.material[textureType] 
    ? [{
        id: 'c',
        name: '',
        status: 'finished',
        url: props.material[textureType]
      }] 
    : []
  files.value = fileList.value.length ? props.material[textureType] : undefined
})
</script>

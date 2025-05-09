<!--
 * @Author: sorry 247076126@qq.com
 * @Date: 2024-11-05 15:00:07
 * @LastEditors: Teemor 232957726@qq.com
 * @LastEditTime: 2025-05-08 16:56:07
 * @FilePath: \3DThreeEdit\src\packages\components\Graphic\Geometry\BoxGeometry\config.vue
 * @Description: 3D模型Mesh配置组件，提供材质属性和贴图编辑功能
 * 
 * 贴图处理流程:
 * 1. 用户上传贴图文件 -> handleUpload -> fileList显示预览
 * 2. 用户点击"应用贴图" -> applyTexture -> 上传到服务器 -> 获取URL
 * 3. 更新材质 -> emit('update:material') -> 触发父组件更新
 * 4. 父组件(ChartSetting)接收更新 -> handleMaterialUpdate -> 应用贴图并保存到模型配置
 * 5. 切换Mesh后，从缓存或模型配置中恢复贴图
-->
<template>
  <collapse-item name="材质" :expanded="true">
    <setting-item-box name="材质类型" :alone="true">
      <setting-item>
        <n-select v-model:value="material.type" size="small" :options="materialList" @update:value="handleMaterialChange"/>
      </setting-item>
    </setting-item-box>
    
    <!-- 基本材质属性 -->
    <setting-item-box name="基本属性">
      <setting-item name="颜色">
        <n-color-picker
          v-model:value="materialConfig.color"
          :show-alpha="false"
          @update:value="updateMaterial"
        />
      </setting-item>
      <setting-item name="透明度">
        <n-slider
          v-model:value="materialConfig.opacity"
          :min="0"
          :max="1"
          :step="0.01"
          @update:value="updateMaterial"
        />
      </setting-item>
      <setting-item name="金属度" v-if="supportsMetal">
        <n-slider
          v-model:value="materialConfig.metalness"
          :min="0"
          :max="1"
          :step="0.01"
          @update:value="updateMaterial"
        />
      </setting-item>
      <setting-item name="粗糙度" v-if="supportsRoughness">
        <n-slider
          v-model:value="materialConfig.roughness"
          :min="0"
          :max="1"
          :step="0.01"
          @update:value="updateMaterial"
        />
      </setting-item>
    </setting-item-box>
  </collapse-item>
 
  <collapse-item name="贴图" :expanded="true">
    <!-- 颜色贴图 -->
    <setting-item-box name="颜色贴图" :alone="true">
      <setting-item>
        <div class="texture-preview-container" v-if="fileList.length > 0 && fileList[0].url">
          <img class="texture-preview-image" :src="fileList[0].url" alt="贴图预览" />
          <div class="texture-actions">
            <n-button size="small" @click="clearImg">移除</n-button>
            <n-button size="small" @click="handlePreviewTexture(fileList[0].url)">预览</n-button>
          </div>
        </div>
        <n-upload
          v-if="fileList.length === 0"
          accept="image/*"
          :custom-request="handleUpload"
          :max="1"
          list-type="image-card"
          :file-list="fileList"
          @remove="clearImg"
          @update:file-list="handleUpdateFileList"
          @preview="(file: any) => handlePreviewTexture(file.url)"
        > 
          点击上传
        </n-upload>
      </setting-item>
    </setting-item-box>
    
    <setting-item-box name="">
      <n-button @click="applyTexture" :disabled="!files">应用贴图</n-button>
    </setting-item-box>
  </collapse-item>
</template>

<script setup lang="ts">
import { PropType, computed, defineAsyncComponent, ref, onMounted, reactive, watch, nextTick } from 'vue'
import { storedFileUploadFile } from 'swagger-api/export-api/scada-config'
import { swatchesColors } from '@/settings/chartThemes/index'
import { option } from './config'
import { materialList, materialTextureTypes, textureKeys } from '@/packages/public/chart'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { deepClone } from '@/utils'
import { CollapseItem, SettingItemBox, SettingItem } from '@/components/Pages/ChartItemSetting'
import * as THREE from 'three'

const chartEditStore = useChartEditStore()

// 添加贴图缓存，按UUID存储不同mesh的贴图
const textureCache: Record<string, {
  map: string;
  file?: File;
}> = reactive({})

const props = defineProps({
  material: {
    type: Object as PropType<{
      type: string;
      [key: string]: any;
    }>,
    required: true
  },
})

const emit = defineEmits(['update:material'])

// 当前材质类型
const type = computed(() => {
  return props.material?.type || 'MeshStandardMaterial'
})

// 判断材质是否支持特定属性
const supportsMetal = computed(() => {
  return type.value === 'MeshStandardMaterial' || type.value === 'MeshPhysicalMaterial'
})

const supportsRoughness = computed(() => {
  return type.value === 'MeshStandardMaterial' || type.value === 'MeshPhysicalMaterial'
})

const supportsNormalMap = computed(() => {
  return ['MeshStandardMaterial', 'MeshPhysicalMaterial', 'MeshPhongMaterial', 'MeshNormalMaterial'].includes(type.value)
})

const supportsRoughnessMap = computed(() => {
  return ['MeshStandardMaterial', 'MeshPhysicalMaterial'].includes(type.value)
})

// 材质配置
const materialConfig = reactive({
  color: '#ffffff',
  opacity: 1,
  metalness: 0,
  roughness: 0.5,
})

// 文件上传相关
const fileList = ref<Array<{
  id: string;
  name: string;
  status: string;
  url: string;
}>>([])
const files = ref<File>()

// 初始化材质配置
watch(() => props.material, (newMaterial) => {
  if (newMaterial) {
    console.log('材质变更:', newMaterial)
    // 获取当前mesh的UUID
    const uuid = props.material.uuid || 'defaultId'
    
    // 提取颜色
    if (newMaterial.color) {
      if (typeof newMaterial.color === 'string') {
        materialConfig.color = newMaterial.color
      } else if (newMaterial.color.getHexString) {
        materialConfig.color = '#' + newMaterial.color.getHexString()
      }
    }
    
    // 提取其他属性
    materialConfig.opacity = newMaterial.opacity ?? 1
    materialConfig.metalness = newMaterial.metalness ?? 0
    materialConfig.roughness = newMaterial.roughness ?? 0.5
    
    // 获取贴图URL (按优先级依次尝试多个来源)
    let textureUrl = null;
    
    // 1. 检查材质是否有mapUrl字段
    if (newMaterial.mapUrl) {
      console.log('从材质的mapUrl字段获取贴图URL:', newMaterial.mapUrl)
      textureUrl = newMaterial.mapUrl;
    }
    // 2. 检查材质的userData中是否有mapUrl
    else if (newMaterial.userData && newMaterial.userData.mapUrl) {
      console.log('从材质的userData.mapUrl获取贴图URL:', newMaterial.userData.mapUrl)
      textureUrl = newMaterial.userData.mapUrl;
    }
    // 3. 检查材质的map是否是Texture对象，并查找其userData中的url
    else if (newMaterial.map && newMaterial.map.userData && newMaterial.map.userData.url) {
      console.log('从材质的map.userData.url获取贴图URL:', newMaterial.map.userData.url)
      textureUrl = newMaterial.map.userData.url;
    }
    // 4. 如果map是字符串形式的URL
    else if (newMaterial.map && typeof newMaterial.map === 'string') {
      console.log('从材质的map字段(字符串)获取贴图URL:', newMaterial.map)
      textureUrl = newMaterial.map;
    }
    
    // 如果找到了贴图URL
    if (textureUrl) {
      // 初始化文件列表，使用找到的URL
      fileList.value = [{
        id: 'current-texture',
        name: 'texture.png',
        status: 'finished',
        url: textureUrl
      }]
      
      // 保存到缓存
      textureCache[uuid] = {
        map: textureUrl
      }
      
      console.log('成功恢复贴图URL:', textureUrl)
    } else {
      // 没有找到贴图URL
      console.log('未找到贴图URL')
      fileList.value = []
    }
    
    // 文件对象不缓存，只在上传时使用
    files.value = undefined
  }
}, { immediate: true, deep: true })

// 材质类型变更
const handleMaterialChange = (newMaterialType: string) => {
  // 创建新的材质数据
  const newMaterial = {
    ...props.material,
    type: newMaterialType,
    color: materialConfig.color,
    opacity: materialConfig.opacity,
    transparent: materialConfig.opacity < 1,
  }
  
  // 根据材质类型添加特定属性
  if (['MeshStandardMaterial', 'MeshPhysicalMaterial'].includes(newMaterialType)) {
    // @ts-ignore
    newMaterial.metalness = materialConfig.metalness
    // @ts-ignore
    newMaterial.roughness = materialConfig.roughness
  }
  
  // 通知父组件更新材质
  emit('update:material', newMaterial)
}

// 处理文件上传
const handleUpload = (f: { file: File }) => {
  const {file} = f
  files.value = file
  
  // 暂存到本地预览
  const objectUrl = URL.createObjectURL(file)
  console.log('创建本地预览URL:', objectUrl)
  
  // 清空之前的文件列表
  fileList.value = []
  
  // 添加新文件到列表
  fileList.value.push({
    id: file.name,
    name: file.name,
    status: 'finished',
    url: objectUrl
  })
  
  console.log('文件已上传到本地预览，待应用')
}

// 处理文件列表更新
const handleUpdateFileList = (fileArray: any[]) => {
  // 更新文件列表
  fileList.value = fileArray
  console.log('文件列表已更新:', fileArray)
  
  if(fileArray.length){
    const [f] = fileArray
    if (f.file) {
      files.value = f.file
      
      // 如果是新上传的文件，这里会触发 custom-request
      if (fileArray[fileArray.length - 1].status === 'pending') {
        handleUpload({ file: fileArray[fileArray.length - 1].file })
      }
    }
  } else {
    // 清空files.value，因为文件列表为空
    files.value = undefined
  }
}

// 应用贴图
const applyTexture = async() => {
  if(!files.value || !files.value.size) {
    console.warn('没有可用的文件，请先上传贴图')
    return
  }
  
  try {
    // 上传文件到服务器并获取URL
    const res = await storedFileUploadFile({file:files.value})
    
    if (!res.data) {
      console.error('贴图上传失败: 未获取到URL')
      return
    }
    
    const textureUrl = res.data
    console.log('贴图上传成功, URL:', textureUrl)
    
    // 获取当前mesh的UUID
    const uuid = props.material.uuid || 'defaultId'
    
    // 更新贴图缓存
    textureCache[uuid] = {
      map: textureUrl
    }
    
    console.log('贴图已缓存:', uuid)
    
    // 确保文件列表中显示当前贴图
    fileList.value = [{
      id: 'uploaded-texture',
      name: files.value?.name || 'texture.png',
      status: 'finished',
      url: textureUrl
    }]
    
    // 创建新的材质数据
    const newMaterial = {
      ...props.material,
      map: textureUrl,        // 原始map字段保持字符串URL
      mapUrl: textureUrl      // 额外添加mapUrl字段存储网络图片地址
    } as any;
    
    // 确保userData存在
    if (!newMaterial.userData) {
      newMaterial.userData = {};
    }
    
    // 保存到userData
    newMaterial.userData.mapUrl = textureUrl;
    
    // 通知父组件更新材质，父组件将处理userData
    console.log('贴图URL已设置:', textureUrl)
    emit('update:material', newMaterial)
  } catch (error) {
    console.error('贴图上传失败:', error)
  }
}

// 清除图片
const clearImg = () => {
  fileList.value = []
  files.value = undefined
  
  // 获取当前mesh的UUID
  const uuid = props.material.uuid || 'defaultId'
  
  // 从缓存中删除
  if (textureCache[uuid]) {
    delete textureCache[uuid]
    console.log('已从缓存中删除贴图:', uuid)
  }
  
  // 创建新的材质数据，移除贴图
  const newMaterial = {
    ...props.material
  }
  
  // 移除贴图
  delete newMaterial.map
  delete newMaterial.mapUrl // 同时移除mapUrl字段
  
  // 通知父组件更新材质
  emit('update:material', newMaterial)
}

// 更新材质属性
const updateMaterial = () => {
  // 创建新的材质数据
  const newMaterial = {
    ...props.material,
    type: type.value,
    color: materialConfig.color,
    opacity: materialConfig.opacity,
    transparent: materialConfig.opacity < 1,
  }
  
  // 根据材质类型添加特定属性
  if (['MeshStandardMaterial', 'MeshPhysicalMaterial'].includes(type.value)) {
    // @ts-ignore
    newMaterial.metalness = materialConfig.metalness
    // @ts-ignore
    newMaterial.roughness = materialConfig.roughness
  }
  
  // 通知父组件更新材质
  emit('update:material', newMaterial)
}

// 组件挂载时初始化
onMounted(() => {
  const textureType = 'map'
  console.log('组件挂载，当前材质:', props.material)
  
  if (props.material[textureType]) {
    console.log('初始化贴图预览:', props.material[textureType])
    fileList.value = [{
      id: 'current',
      name: 'texture.png',
      status: 'finished',
      url: props.material.mapUrl
    }]
    
    // 保存到贴图缓存
    const uuid = props.material.uuid || 'defaultId'
    textureCache[uuid] = {
      map: props.material[textureType]
    }
  } else {
    fileList.value = []
  }
  files.value = undefined
})

// 处理贴图预览
const handlePreviewTexture = (url: string) => {
  if (!url) return
  
  window.open(url, '_blank')
}
</script>

<style lang="scss" scoped>
.texture-upload {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.texture-preview-container {
  width: 100%;
  margin-bottom: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f5f5;
}

.texture-preview-image {
  width: 100%;
  height: auto;
  max-height: 150px;
  object-fit: contain;
  display: block;
  background-color: #ffffff;
}

.texture-actions {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: #f5f5f5;
}
</style>

<script lang="ts">
export default {
  name: 'MeshConfig'
}
</script>

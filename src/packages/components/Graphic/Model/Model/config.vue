<!--
 * @Author: sorry 247076126@qq.com
 * @Date: 2024-11-05 15:00:07
 * @LastEditors: Teemor 232957726@qq.com
 * @LastEditTime: 2025-05-09 17:30:30
 * @FilePath: \3DThreeEdit\src\packages\components\Graphic\Geometry\BoxGeometry\config.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <div v-if="currentModelObject">
    <setting-item-box name="模型配置">
      <n-tabs type="line">
        <n-tab-pane name="材质" tab="材质">
          <!-- 材质编辑器 -->
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
          <setting-item name="金属度">
            <n-slider
              v-model:value="materialConfig.metalness"
              :min="0"
              :max="1"
              :step="0.01"
              @update:value="updateMaterial"
            />
          </setting-item>
          <setting-item name="粗糙度">
            <n-slider
              v-model:value="materialConfig.roughness"
              :min="0"
              :max="1"
              :step="0.01"
              @update:value="updateMaterial"
            />
          </setting-item>
          
          <!-- 贴图编辑器 -->
          <setting-item name="颜色贴图">
            <div class="texture-upload">
              <img v-if="materialConfig.mapUrl" :src="materialConfig.mapUrl" class="texture-preview" />
              <n-upload
                accept="image/*"
                :default-upload="false"
                @change="handleMapUpload"
              >
                <n-button>{{ materialConfig.mapUrl ? '更换贴图' : '上传贴图' }}</n-button>
              </n-upload>
              <n-button v-if="materialConfig.mapUrl" @click="clearTexture('map')">清除</n-button>
            </div>
          </setting-item>
          
          <setting-item name="法线贴图">
            <div class="texture-upload">
              <img v-if="materialConfig.normalMapUrl" :src="materialConfig.normalMapUrl" class="texture-preview" />
              <n-upload
                accept="image/*"
                :default-upload="false"
                @change="handleNormalMapUpload"
              >
                <n-button>{{ materialConfig.normalMapUrl ? '更换贴图' : '上传贴图' }}</n-button>
              </n-upload>
              <n-button v-if="materialConfig.normalMapUrl" @click="clearTexture('normalMap')">清除</n-button>
            </div>
          </setting-item>
          
          <setting-item name="粗糙度贴图">
            <div class="texture-upload">
              <img v-if="materialConfig.roughnessMapUrl" :src="materialConfig.roughnessMapUrl" class="texture-preview" />
              <n-upload
                accept="image/*"
                :default-upload="false"
                @change="handleRoughnessMapUpload"
              >
                <n-button>{{ materialConfig.roughnessMapUrl ? '更换贴图' : '上传贴图' }}</n-button>
              </n-upload>
              <n-button v-if="materialConfig.roughnessMapUrl" @click="clearTexture('roughnessMap')">清除</n-button>
            </div>
          </setting-item>
        </n-tab-pane>
        <n-tab-pane name="变换" tab="变换">
          <!-- 位置编辑器 -->
          <setting-item name="位置 X">
            <n-input-number
              v-model:value="transformConfig.position.x"
              :step="0.1"
              size="small"
              @update:value="updateTransform"
            />
          </setting-item>
          <setting-item name="位置 Y">
            <n-input-number
              v-model:value="transformConfig.position.y"
              :step="0.1"
              size="small"
              @update:value="updateTransform"
            />
          </setting-item>
          <setting-item name="位置 Z">
            <n-input-number
              v-model:value="transformConfig.position.z"
              :step="0.1"
              size="small"
              @update:value="updateTransform"
            />
          </setting-item>
          
          <!-- 旋转编辑器 -->
          <setting-item name="旋转 X">
            <n-input-number
              v-model:value="transformConfig.rotation.x"
              :step="0.1"
              size="small"
              @update:value="updateTransform"
            />
          </setting-item>
          <setting-item name="旋转 Y">
            <n-input-number
              v-model:value="transformConfig.rotation.y"
              :step="0.1"
              size="small"
              @update:value="updateTransform"
            />
          </setting-item>
          <setting-item name="旋转 Z">
            <n-input-number
              v-model:value="transformConfig.rotation.z"
              :step="0.1"
              size="small"
              @update:value="updateTransform"
            />
          </setting-item>
          
          <!-- 缩放编辑器 -->
          <setting-item name="缩放 X">
            <n-input-number
              v-model:value="transformConfig.scale.x"
              :step="0.1"
              size="small"
              @update:value="updateTransform"
            />
    </setting-item>
          <setting-item name="缩放 Y">
            <n-input-number
              v-model:value="transformConfig.scale.y"
              :step="0.1"
              size="small"
              @update:value="updateTransform"
            />
    </setting-item>
          <setting-item name="缩放 Z">
            <n-input-number
              v-model:value="transformConfig.scale.z"
              :step="0.1"
              size="small"
              @update:value="updateTransform"
            />
    </setting-item>
        </n-tab-pane>
      </n-tabs>
  </setting-item-box> 
  </div>
</template>

<script setup lang="ts">
import { PropType, defineAsyncComponent, computed, ref, watch, reactive, nextTick } from 'vue'
import { swatchesColors } from '@/settings/chartThemes/index'
import { materialList } from '../../../../public/chart'
import { option, FontWeightEnum, FontWeightObject } from './config'
import { CollapseItem, SettingItemBox, SettingItem } from '@/components/Pages/ChartItemSetting'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { deepClone } from '@/utils'
import * as THREE from 'three'

const chartEditStore = useChartEditStore()
const getModelList = chartEditStore.getModelList
const currentModel = computed(() => chartEditStore.getCurrentModel)
const selectId = computed(() => chartEditStore.getTargetChart.selectId)

// 贴图缓存，按UUID存储不同mesh的贴图
const textureCache = reactive<Record<string, Record<string, any>>>({})

// 当前选中的模型对象
const currentModelObject = computed(() => {
  if (!currentModel.value?.id || !selectId.value?.length) return null
  
  // 获取模型列表中的当前模型
  const model = getModelList[currentModel.value.id]
  if (!model) return null
  
  // 递归查找当前选择的对象
  const findByUUID = (obj: any, targetUUID: string): any => {
    if (!obj) return null
    
    // 判断当前对象
    if (obj.uuid === targetUUID) {
      return obj
    }
    
    // 递归查找子对象
    if (Array.isArray(obj.children)) {
      for (const child of obj.children) {
        const found: any = findByUUID(child, targetUUID)
        if (found) return found
      }
    }
    
    return null
  }
  
  // 使用第一个选择的ID
  const [firstId] = selectId.value
  return findByUUID(model, firstId)
})

// 材质配置
const materialConfig = reactive({
  color: '#ffffff',
  opacity: 1,
  metalness: 0,
  roughness: 0.5,
  mapUrl: '',
  normalMapUrl: '',
  roughnessMapUrl: '',
  map: null as THREE.Texture | null,
  normalMap: null as THREE.Texture | null,
  roughnessMap: null as THREE.Texture | null
})

// 变换配置
const transformConfig = reactive({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 }
})

// 加载贴图
const loadTexture = (file: File): Promise<{texture: THREE.Texture, url: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const url = e.target?.result as string
      const textureLoader = new THREE.TextureLoader()
      textureLoader.load(
        url,
        (texture) => {
          // 设置纹理参数
          texture.wrapS = THREE.RepeatWrapping
          texture.wrapT = THREE.RepeatWrapping
          texture.needsUpdate = true
          resolve({ texture, url })
        },
        undefined,
        (error) => {
          console.error('加载贴图失败:', error)
          reject(error)
        }
      )
    }
    reader.readAsDataURL(file)
  })
}

// 处理贴图上传
const handleMapUpload = async (options: { file: File }) => {
  try {
    const { texture, url } = await loadTexture(options.file)
    materialConfig.map = texture
    materialConfig.mapUrl = url
    updateMaterial()
  } catch (error) {
    console.error('处理贴图上传失败:', error)
  }
}

const handleNormalMapUpload = async (options: { file: File }) => {
  try {
    const { texture, url } = await loadTexture(options.file)
    materialConfig.normalMap = texture
    materialConfig.normalMapUrl = url
    updateMaterial()
  } catch (error) {
    console.error('处理法线贴图上传失败:', error)
  }
}

const handleRoughnessMapUpload = async (options: { file: File }) => {
  try {
    const { texture, url } = await loadTexture(options.file)
    materialConfig.roughnessMap = texture
    materialConfig.roughnessMapUrl = url
    updateMaterial()
  } catch (error) {
    console.error('处理粗糙度贴图上传失败:', error)
  }
}

// 清除贴图
const clearTexture = (mapType: string) => {
  switch (mapType) {
    case 'map':
      materialConfig.map = null
      materialConfig.mapUrl = ''
      break
    case 'normalMap':
      materialConfig.normalMap = null
      materialConfig.normalMapUrl = ''
      break
    case 'roughnessMap':
      materialConfig.roughnessMap = null
      materialConfig.roughnessMapUrl = ''
      break
  }
  updateMaterial()
}

// 从当前材质中获取贴图URL
const getTextureDataURL = (texture: THREE.Texture | null): string => {
  if (!texture || !texture.image) return ''
  
  // 创建临时canvas获取贴图URL
  const canvas = document.createElement('canvas')
  canvas.width = texture.image.width
  canvas.height = texture.image.height
  const context = canvas.getContext('2d')
  context?.drawImage(texture.image, 0, 0)
  
  return canvas.toDataURL('image/png')
}

// 监听当前选中的对象变化，更新材质和变换配置
watch(currentModelObject, (newObj) => {
  if (!newObj) return

  // 获取当前mesh的UUID
  const uuid = newObj.uuid
  console.log('切换到新的Mesh:', uuid)

  // 检查是否有缓存的贴图配置
  if (textureCache[uuid]) {
    console.log('使用缓存的贴图配置')
    // 使用缓存的贴图数据
    Object.assign(materialConfig, textureCache[uuid])
  } else {
    console.log('创建新的贴图配置')
    // 重置材质配置
    materialConfig.map = null
    materialConfig.normalMap = null
    materialConfig.roughnessMap = null
    materialConfig.mapUrl = ''
    materialConfig.normalMapUrl = ''
    materialConfig.roughnessMapUrl = ''

    // 如果当前材质有贴图，保存并缓存它们
    if (newObj.material) {
      // 提取并保存纹理贴图
      if (newObj.material.map) {
        materialConfig.map = newObj.material.map
        materialConfig.mapUrl = getTextureDataURL(newObj.material.map)
      }
      
      if (newObj.material.normalMap) {
        materialConfig.normalMap = newObj.material.normalMap
        materialConfig.normalMapUrl = getTextureDataURL(newObj.material.normalMap)
      }
      
      if (newObj.material.roughnessMap) {
        materialConfig.roughnessMap = newObj.material.roughnessMap
        materialConfig.roughnessMapUrl = getTextureDataURL(newObj.material.roughnessMap)
      }

      // 缓存贴图配置
      textureCache[uuid] = {
        map: materialConfig.map,
        normalMap: materialConfig.normalMap,
        roughnessMap: materialConfig.roughnessMap,
        mapUrl: materialConfig.mapUrl,
        normalMapUrl: materialConfig.normalMapUrl,
        roughnessMapUrl: materialConfig.roughnessMapUrl
      }
    }
  }
  
  // 更新材质配置
  if (newObj.material) {
    materialConfig.color = '#' + newObj.material.color.getHexString()
    materialConfig.opacity = newObj.material.opacity || 1
    materialConfig.metalness = newObj.material.metalness || 0
    materialConfig.roughness = newObj.material.roughness || 0.5
  }
  
  // 更新变换配置
  transformConfig.position.x = newObj.position.x
  transformConfig.position.y = newObj.position.y
  transformConfig.position.z = newObj.position.z
  
  transformConfig.rotation.x = newObj.rotation.x
  transformConfig.rotation.y = newObj.rotation.y
  transformConfig.rotation.z = newObj.rotation.z
  
  transformConfig.scale.x = newObj.scale.x
  transformConfig.scale.y = newObj.scale.y
  transformConfig.scale.z = newObj.scale.z
}, { immediate: true })

// 更新材质
const updateMaterial = () => {
  if (!currentModelObject.value || !currentModelObject.value.material) return
  
  let material = currentModelObject.value.material
  
  // 如果材质不支持贴图，需要更换材质类型
  if (!(material instanceof THREE.MeshStandardMaterial) && (materialConfig.map || materialConfig.normalMap || materialConfig.roughnessMap)) {
    // 创建新的标准材质
    const newMaterial = new THREE.MeshStandardMaterial({
      color: material.color,
      opacity: material.opacity,
      transparent: material.transparent
    })
    
    // 复制其他材质属性
    if ('metalness' in material) newMaterial.metalness = material.metalness
    if ('roughness' in material) newMaterial.roughness = material.roughness
    
    // 替换材质
    currentModelObject.value.material.dispose() // 释放旧材质
    currentModelObject.value.material = newMaterial
    material = newMaterial
  }
  
  if (materialConfig.color) {
    material.color.set(materialConfig.color)
  }
  
  material.opacity = materialConfig.opacity
  material.transparent = materialConfig.opacity < 1
  
  // 设置金属度和粗糙度（如果材质支持）
  if ('metalness' in material) material.metalness = materialConfig.metalness
  if ('roughness' in material) material.roughness = materialConfig.roughness
  
  // 应用贴图
  if ('map' in material) {
    material.map = materialConfig.map
  }
  
  if ('normalMap' in material) {
    material.normalMap = materialConfig.normalMap
  }
  
  if ('roughnessMap' in material) {
    material.roughnessMap = materialConfig.roughnessMap
  }
  
  // 确保材质更新
  material.needsUpdate = true
  
  // 更新模型配置
  updateModelConfig()
  
  // 缓存当前贴图配置
  if (currentModelObject.value) {
    const uuid = currentModelObject.value.uuid
    textureCache[uuid] = {
      map: materialConfig.map,
      normalMap: materialConfig.normalMap,
      roughnessMap: materialConfig.roughnessMap,
      mapUrl: materialConfig.mapUrl,
      normalMapUrl: materialConfig.normalMapUrl,
      roughnessMapUrl: materialConfig.roughnessMapUrl
    }
  }
}

// 更新变换
const updateTransform = () => {
  if (!currentModelObject.value) return
  
  const obj = currentModelObject.value
  
  // 更新位置
  obj.position.set(
    transformConfig.position.x,
    transformConfig.position.y,
    transformConfig.position.z
  )
  
  // 更新旋转
  obj.rotation.set(
    transformConfig.rotation.x,
    transformConfig.rotation.y,
    transformConfig.rotation.z
  )
  
  // 更新缩放
  obj.scale.set(
    transformConfig.scale.x,
    transformConfig.scale.y,
    transformConfig.scale.z
  )
  
  // 更新模型配置
  updateModelConfig()
}

// 更新模型配置
const updateModelConfig = () => {
  if (!currentModel.value?.id || !currentModelObject.value) return
  
  // 获取当前模型的UUID
  const uuid = currentModelObject.value.uuid
  
  // 如果当前模型选项中没有配置，初始化它
  if (!currentModel.value.option) {
    currentModel.value.option = {}
  }
  
  // 初始化材质和变换配置
  if (!currentModel.value.option.materials) {
    currentModel.value.option.materials = {}
  }
  
  if (!currentModel.value.option.transforms) {
    currentModel.value.option.transforms = {}
  }
  
  if (!currentModel.value.option.textures) {
    currentModel.value.option.textures = {}
  }
  
  // 更新材质配置
  currentModel.value.option.materials[uuid] = {
    color: materialConfig.color,
    opacity: materialConfig.opacity,
    metalness: materialConfig.metalness,
    roughness: materialConfig.roughness
  }
  
  // 更新贴图配置
  currentModel.value.option.textures[uuid] = {
    mapUrl: materialConfig.mapUrl,
    normalMapUrl: materialConfig.normalMapUrl,
    roughnessMapUrl: materialConfig.roughnessMapUrl
  }
  
  // 更新变换配置
  currentModel.value.option.transforms[uuid] = {
    position: { ...transformConfig.position },
    rotation: { ...transformConfig.rotation },
    scale: { ...transformConfig.scale }
  }
}

const props = defineProps({
  optionData: {
    type: Object as PropType<typeof option>,
    required: true
  },
})
</script>

<style lang="scss" scoped>
.setting-group {
  margin-bottom: 12px;
}

.texture-upload {
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  .texture-preview {
    width: 100%;
    max-height: 100px;
    object-fit: contain;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    margin-bottom: 8px;
  }
}
</style>

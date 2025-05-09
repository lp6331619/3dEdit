<!--
 * @Author: sorry 247076126@qq.com
 * @Date: 2024-10-12 14:14:11
 * @LastEditors: Teemor 232957726@qq.com
 * @LastEditTime: 2025-05-08 17:20:40
 * @FilePath: \3DThreeEdit\src\views\chart\ContentConfigurations\components\ChartSetting\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <div class="go-chart-configurations-setting" v-if="targetData">
    <!-- 名称 -->
    <name-setting2 v-if="currentModel && currentMesh" :chartConfig="currentMesh"></name-setting2>

    <name-setting v-if="!currentModel" :chartConfig="targetData.chartConfig"></name-setting>
    <!-- 尺寸 -->
    <size-setting
      v-if="targetData.type != 'TresMesh' && !targetData.isGroup && targetData.type != 'GLTFModel' && !currentModel"
      :isGroup="targetData.isGroup"
      :chartAttr="targetData.attr"
    ></size-setting>
    <!-- 位置 -->
    <position-setting v-if="!currentModel" :position="targetData.option?.position" :canvasConfig="chartEditStore.getEditCanvasConfig" />
    <!-- 滤镜 -->
    <!-- <styles-setting :isGroup="targetData.isGroup" :chartStyles="targetData.styles"></styles-setting> -->
    
    <!-- 自定义配置项 -->
     <div v-if="currentModel && currentMesh && currentMesh.type=='Mesh'">
      <MeshConfig :material="currentMesh.material" @update:material="handleMaterialUpdate" />
     </div>
    <component
      v-else
      :is="targetData?.chartConfig?.conKey"
      :optionData="targetData.option"
      :childrenData="targetData.children || []"
    ></component>

    <div v-if="targetData.type=='GLTFModel' || currentMesh">
      <template v-if="currentModel">
        <n-button  @click="submitEditModel">
          保存
        </n-button>
        <n-button class="go-ml-2" @click="cancelEditModel">
          取消编辑
        </n-button>
      </template>
      <n-button v-else @click="editModel">
        编辑模型
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed,shallowRef,watch } from 'vue'
import { NameSetting,NameSetting2, PositionSetting, SizeSetting, StylesSetting } from '@/components/Pages/ChartItemSetting'
import { useTargetData } from '../hooks/useTargetData.hook'
import MeshConfig from '@/packages/components/Graphic/Model/Mesh/config.vue'
import { deepClone } from '@/utils'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import * as THREE from 'three'
const { targetData, chartEditStore } = useTargetData()
const getModeList = chartEditStore.getModelList
const currentModel = computed(() => chartEditStore.getCurrentModel)
const targetChart = chartEditStore.getTargetChart
const editModel = () => {
  chartEditStore.setCurrentModel(deepClone(targetData.value))
}
const findByUUID = (obj:any, targetUUID:string): any => {
  if (!obj) return null;
  // 先判断当前对象
  if (obj.uuid === targetUUID) {
    return obj;
  }
  // 如果有 children，递归查找
  if (Array.isArray(obj.children)) {
    for (const child of obj.children) {
      const found: any = findByUUID(child, targetUUID);
      if (found) return found;
    }
  }
  return null;
}
//当前选择的
const currentMesh = shallowRef<any>(null)
const selectId = computed(() => chartEditStore.getTargetChart.selectId)
watch(selectId, (e) => {
  if(!currentModel.value?.id) return
  const obj = getModeList[currentModel.value.id]
  const [f] = e
  const mesh = findByUUID(obj, f)
  currentMesh.value = mesh
  console.log(mesh, 1111)
}, {
  immediate: true
})
const cancelEditModel = () => {
  chartEditStore.setCurrentModel(undefined)
}
const handleMaterialUpdate = (newMaterial: any) => {
  if (!currentModel.value?.id || !currentMesh.value) return
  
  console.log('更新材质:', newMaterial)
  
  // 获取当前模型对象
  const obj = getModeList[currentModel.value.id]
  const [meshUUID] = selectId.value
  
  // 初始化模型option如果不存在
  if (!currentModel.value.option) {
    currentModel.value.option = {}
  }
  
  // 初始化贴图配置
  if (!currentModel.value.option.textures) {
    currentModel.value.option.textures = {}
  }
  
  if (!currentModel.value.option.textures[meshUUID]) {
    currentModel.value.option.textures[meshUUID] = {}
  }
  
  // 初始化材质配置
  if (!currentModel.value.option.materials) {
    currentModel.value.option.materials = {}
  }
  
  // 更新材质
  if (currentMesh.value) {
    // 处理颜色
    if (newMaterial.color) {
      if (typeof newMaterial.color === 'string') {
        currentMesh.value.material.color.set(newMaterial.color)
      }
    }
    
    // 处理透明度
    if (newMaterial.opacity !== undefined) {
      currentMesh.value.material.opacity = newMaterial.opacity
      currentMesh.value.material.transparent = newMaterial.opacity < 1
    }
    
    // 处理其他属性
    if (newMaterial.metalness !== undefined && 'metalness' in currentMesh.value.material) {
      currentMesh.value.material.metalness = newMaterial.metalness
    }
    
    if (newMaterial.roughness !== undefined && 'roughness' in currentMesh.value.material) {
      currentMesh.value.material.roughness = newMaterial.roughness
    }
    
    // 处理贴图
    if (newMaterial.map) {
      console.log(`处理贴图:`, typeof newMaterial.map === 'string' ? newMaterial.map : '(Texture对象)')
      
      // 如果map是字符串URL
      if (typeof newMaterial.map === 'string') {
        // 保存URL到模型配置
        if (newMaterial.mapUrl) {
          // 优先使用mapUrl字段作为存储URL
          currentModel.value.option.textures[meshUUID].mapUrl = newMaterial.mapUrl
        } else {
          // 如果没有mapUrl，使用map字段的值
          currentModel.value.option.textures[meshUUID].mapUrl = newMaterial.map
        }
        
        // 加载贴图
        const applyTexture = (url: string) => {
          console.log(`开始加载贴图:`, url)
          
          // 创建纹理加载器
          const textureLoader = new THREE.TextureLoader()
          textureLoader.setCrossOrigin('anonymous') // 设置跨域
          
          textureLoader.load(
            url,
            (texture) => {
              console.log('贴图加载成功')
              // 设置纹理参数
              texture.wrapS = THREE.RepeatWrapping
              texture.wrapT = THREE.RepeatWrapping
              texture.needsUpdate = true
              
              // 保存URL到texture的userData
              texture.userData = texture.userData || {}
              texture.userData.url = url
              
              // 应用纹理到材质
              currentMesh.value.material.map = texture
              currentMesh.value.material.needsUpdate = true
            },
            undefined,
            (error) => {
              console.error('贴图加载失败:', error)
              // 尝试备用方法
              tryBackupMethod(url)
            }
          )
        }
        
        // 备用加载方法
        const tryBackupMethod = (url: string) => {
          console.log('尝试备用方法加载贴图')
          const img = new Image()
          img.crossOrigin = 'anonymous'
          
          img.onload = () => {
            console.log('通过Image元素成功加载图片')
            const texture = new THREE.Texture(img)
            
            // 保存URL到texture的userData
            texture.userData = texture.userData || {}
            texture.userData.url = url
            
            texture.needsUpdate = true
            
            currentMesh.value.material.map = texture
            currentMesh.value.material.needsUpdate = true
          }
          
          img.onerror = () => {
            console.error('备用方法也无法加载图片')
            createFallbackTexture()
          }
          
          img.src = url
        }
        
        // 创建备用纹理
        const createFallbackTexture = () => {
          console.log('创建纯色纹理作为备用')
          try {
            const canvas = document.createElement('canvas')
            canvas.width = 1
            canvas.height = 1
            const ctx = canvas.getContext('2d')
            ctx!.fillStyle = currentMesh.value.material.color.getStyle()
            ctx!.fillRect(0, 0, 1, 1)
            
            const fallbackTexture = new THREE.CanvasTexture(canvas)
            currentMesh.value.material.map = fallbackTexture
            currentMesh.value.material.needsUpdate = true
            console.log('应用纯色纹理作为备用')
          } catch (e) {
            console.error('创建备用纹理失败:', e)
          }
        }
        
        // 执行贴图加载
        const textureUrl = newMaterial.mapUrl || newMaterial.map
        applyTexture(textureUrl)
      } 
      // 如果map已经是Texture对象，直接使用
      else {
        console.log('直接使用已创建的Texture对象')
        
        // 如果同时有mapUrl，保存到配置和texture的userData
        if (newMaterial.mapUrl) {
          currentModel.value.option.textures[meshUUID].mapUrl = newMaterial.mapUrl
          
          // 保存URL到texture的userData以便日后恢复
          newMaterial.map.userData = newMaterial.map.userData || {}
          newMaterial.map.userData.url = newMaterial.mapUrl
        }
        
        // 直接应用texture
        currentMesh.value.material.map = newMaterial.map
        currentMesh.value.material.needsUpdate = true
      }
    } else if (currentMesh.value.material.map) {
      // 如果要移除贴图
      currentMesh.value.material.map = null
      currentMesh.value.material.needsUpdate = true
      
      // 从配置中移除
      if (currentModel.value.option.textures[meshUUID]) {
        delete currentModel.value.option.textures[meshUUID].mapUrl
      }
    }
  }
  
  // 保存材质属性
  currentModel.value.option.materials[meshUUID] = {
    color: newMaterial.color || (currentMesh.value.material.color.getHexString ? 
           '#' + currentMesh.value.material.color.getHexString() : 
           currentMesh.value.material.color),
    opacity: currentMesh.value.material.opacity,
    transparent: currentMesh.value.material.transparent
  }
  
  // 保存mapUrl到材质配置
  if (newMaterial.mapUrl) {
    currentModel.value.option.materials[meshUUID].mapUrl = newMaterial.mapUrl
  } else if (typeof newMaterial.map === 'string') {
    currentModel.value.option.materials[meshUUID].mapUrl = newMaterial.map
  } else if (newMaterial.map && newMaterial.map.userData && newMaterial.map.userData.url) {
    currentModel.value.option.materials[meshUUID].mapUrl = newMaterial.map.userData.url
  }
  
  // 保存金属度和粗糙度（如果有）
  if ('metalness' in currentMesh.value.material) {
    currentModel.value.option.materials[meshUUID].metalness = currentMesh.value.material.metalness
  }
  
  if ('roughness' in currentMesh.value.material) {
    currentModel.value.option.materials[meshUUID].roughness = currentMesh.value.material.roughness
  }
  
  // 更新全局模型列表
  chartEditStore.setModelList(currentModel.value.id, obj)
}
const submitEditModel = () => {
  if (!currentModel.value?.id) return
  // 更新模型列表
  chartEditStore.setModelList(currentModel.value.id, getModeList[currentModel.value.id])
  
  // 更新组件列表
  // 使用类型断言处理 targetChart
  const targetChartAny = targetChart as any;
  if (targetChartAny && targetChartAny.componentList) {
    const index = targetChartAny.componentList.findIndex((item: any) => item.id === currentModel.value.id)
    if (index !== -1) {
      targetChartAny.componentList[index] = {
        ...targetChartAny.componentList[index],
        option: currentModel.value.option
      }
    }
  } else {
    console.warn('无法更新组件列表: componentList 不存在')
  }
  
  // 导出模型为GLTF
  exportToGLTF(getModeList[currentModel.value.id])
  
  // 清除当前编辑状态
  chartEditStore.setCurrentModel(undefined)
}

// 导出GLTF模型
const exportToGLTF = (model: any) => {
  if (!model) return
  const exporter = new GLTFExporter()
  
  // 在导出前，处理自定义字段
  processModelForExport(model)
  
  // 导出模型
  exporter.parse(
    model,
    (gltf: ArrayBuffer | { [key: string]: any }) => {
      // 将导出的模型数据保存为文件
      if (gltf instanceof ArrayBuffer) {
        const blob = new Blob([gltf], { type: 'application/octet-stream' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `model_${Date.now()}.glb` // 使用.glb作为二进制格式
        link.click()
        URL.revokeObjectURL(link.href)
      } else {
        // 处理JSON格式，确保mapUrl字段存在
        addCustomPropertiesToJSON(gltf)
        
        const output = JSON.stringify(gltf);
        const blob = new Blob([output], { type: 'application/json' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `model_${Date.now()}.gltf` // 使用.gltf作为JSON格式
        link.click()
        URL.revokeObjectURL(link.href)
      }
    },
    (error) => {
      console.error('导出GLTF模型出错:', error)
    },
    { 
      binary: true,
      embedImages: true, // 嵌入图片
      forceIndices: true, // 强制索引，提高效率
      onlyVisible: false, // 导出不可见对象
      includeCustomExtensions: true // 包含自定义扩展
    }
  )
}

// 处理模型，确保自定义字段可以被导出
const processModelForExport = (model: any) => {
  model.traverse((object: any) => {
    // 如果是Mesh对象且有材质
    if (object.isMesh && object.material) {
      // 获取材质
      const material = object.material
      
      // 当前模型的配置
      const meshConfig = currentModel.value?.option?.materials?.[object.uuid]
      
      // 如果有mapUrl字段，添加到userData中确保导出
      if (meshConfig && meshConfig.mapUrl) {
        if (!material.userData) material.userData = {}
        material.userData.mapUrl = meshConfig.mapUrl
        
        // 同时添加到对象的userData以确保导出
        if (!object.userData) object.userData = {}
        object.userData.materialMapUrl = meshConfig.mapUrl
        
        console.log(`为对象添加mapUrl到userData:`, object.uuid, meshConfig.mapUrl)
      }
    }
  })
}

// 处理JSON数据，添加自定义属性
const addCustomPropertiesToJSON = (gltfJson: any) => {
  // 如果导出格式是JSON，检查并添加自定义字段
  if (typeof gltfJson === 'object' && currentModel.value?.option) {
    // 添加模型配置到extras字段
    if (!gltfJson.extras) gltfJson.extras = {}
    gltfJson.extras.modelConfig = currentModel.value.option
    
    console.log('将模型配置添加到GLTF的extras字段:', currentModel.value.option)
  }
}
</script>

<style lang="scss" scoped>
@include go('chart-configurations-setting') {
}
</style>

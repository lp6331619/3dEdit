<!--
 * @Author: sorry 247076126@qq.com
 * @Date: 2024-10-12 14:14:11
 * @LastEditors: Teemor 232957726@qq.com
 * @LastEditTime: 2025-05-09 17:49:08
 * @FilePath: \3DThreeEdit\src\views\chart\ContentConfigurations\components\ChartSetting\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <div class="go-chart-configurations-setting" v-if="targetData">
    <!-- 名称 -->
    <name-setting2
      v-if="currentModel && currentMesh && currentMesh.name !== undefined"
      :chartConfig="currentMesh"
    ></name-setting2>

    <name-setting v-if="!currentModel" :chartConfig="targetData.chartConfig"></name-setting>
    <!-- 尺寸 -->
    <size-setting
      v-if="
        targetData &&
        targetData.attr &&
        targetData.type != 'TresMesh' &&
        !targetData.isGroup &&
        targetData.type != 'GLTFModel' &&
        !currentModel
      "
      :isGroup="targetData.isGroup || false"
      :chartAttr="targetData.attr"
    ></size-setting>
    <!-- 位置 -->
    <position-setting
      v-if="!currentModel && targetData.option?.position"
      :position="targetData.option?.position"
      :canvasConfig="chartEditStore.getEditCanvasConfig"
    />
    <!-- 滤镜 -->
    <!-- <styles-setting :isGroup="targetData.isGroup" :chartStyles="targetData.styles"></styles-setting> -->
    <!-- 自定义配置项 -->
    <div v-if="currentModel && currentMesh && currentMesh.type == 'Mesh'">
      <MeshConfig :material="currentMesh.material" @update:material="handleMaterialUpdate" />
     </div>
    <component
      v-else-if="targetData?.chartConfig?.conKey"
      :is="targetData?.chartConfig?.conKey"
      :optionData="targetData.option || {}"
      :childrenData="targetData.children || []"
    ></component>

    <div
      v-if="
        targetData &&
        // @ts-ignore - 忽略类型检查，在运行时targetData确实有type属性
        (targetData.type == 'GLTFModel' || currentMesh)
      "
    >
      <template v-if="currentModel">
        <n-button type="primary" :loading="loading" :disabled="loading" size="medium" @click="submitEditModel">
          {{ loading ? '保存中...' : '保存' }}
        </n-button>
        <!-- <n-button 
          :loading="loading" 
          :disabled="loading" 
          class="go-ml-2" 
          @click="cancelEditModel"
        >
          取消编辑
        </n-button> -->
      </template>
      <n-button v-else @click="editModel"> 编辑模型 </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType, computed, shallowRef, watch, ref, nextTick } from 'vue'
import {
  NameSetting,
  NameSetting2,
  PositionSetting,
  SizeSetting,
  StylesSetting
} from '@/components/Pages/ChartItemSetting'
import { useTargetData } from '../hooks/useTargetData.hook'
import MeshConfig from '@/packages/components/Graphic/Model/Mesh/config.vue'
import { deepClone } from '@/utils'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import * as THREE from 'three'
import { netWorkInternal ,stopNetWorkInternal} from '@/hooks/netWorkInternal.hook'
import { storedFileUploadFile } from 'swagger-api/export-api/scada-config'
import { useMessage } from 'naive-ui'
const { targetData, chartEditStore } = useTargetData()
const getModeList = chartEditStore.getModelList
const currentModel = computed(() => chartEditStore.getCurrentModel)
const targetChart = chartEditStore.getTargetChart
const loading = ref(false)
const message = useMessage()
const editModel = () => {
  chartEditStore.setCurrentModel(deepClone(targetData.value))
  chartEditStore.setTransformControlsStateEnabled(false)
  chartEditStore.setAllHide(targetData.value.id)
  stopNetWorkInternal()
}

const messageBox = ref({
  loadingInstance: null
})
const findByUUID = (obj: any, targetUUID: string): any => {
  if (!obj) return null
  // 先判断当前对象
  if (obj.uuid === targetUUID) {
    return obj
  }
  // 如果有 children，递归查找
  if (Array.isArray(obj.children)) {
    for (const child of obj.children) {
      const found: any = findByUUID(child, targetUUID)
      if (found) return found
    }
  }
  return null
}
//当前选择的
const currentMesh = shallowRef<any>(null)
const selectId = computed(() => chartEditStore.getTargetChart.selectId)
watch(
  selectId,
  e => {
    if (!currentModel.value?.id) return
  const obj = getModeList[currentModel.value.id]
  const [f] = e
  const mesh = findByUUID(obj, f)
  currentMesh.value = mesh
  },
  {
  immediate: true
  }
)
const cancelEditModel = () => {
  try {
    console.log('开始清理编辑状态...')

    // 先清除当前选中的mesh，避免在currentModel被清除后出现引用错误
    currentMesh.value = null

    // 安全地清除选中状态
    try {
      // 清除当前选择的模型部件
      chartEditStore.setTargetSelectChart(undefined)
    } catch (selectError) {
      console.warn('清除模型选择状态时出错:', selectError)
    }

    // 使用更长的延迟，确保UI组件有足够时间处理状态变化
    setTimeout(() => {
      try {
        console.log('清除模型编辑状态')
        // 清除当前模型编辑状态
        chartEditStore.setCurrentModel(undefined)
      } catch (modelError) {
        console.error('清除模型编辑状态时出错:', modelError)
      }
    }, 50) // 使用更长的延迟
  } catch (error) {
    console.error('取消编辑时出错:', error)
    // 如果出错，尝试强制重置状态
  chartEditStore.setCurrentModel(undefined)
    chartEditStore.setTargetSelectChart(undefined)
  }
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

    // 处理贴图 - 这部分是关键的改进区域
    if (newMaterial.map) {
      console.log(`处理贴图:`, typeof newMaterial.map === 'string' ? newMaterial.map : '(Texture对象)')

      // 保存URL到各个位置
      const textureUrl = typeof newMaterial.map === 'string' ? newMaterial.map : newMaterial.mapUrl || ''

      if (textureUrl) {
        // 保存到配置中
        // 确保textures[meshUUID]存在
        if (!currentModel.value.option.textures[meshUUID]) {
          currentModel.value.option.textures[meshUUID] = {}
        }
        currentModel.value.option.textures[meshUUID].mapUrl = textureUrl

        // 确保materials[meshUUID]存在
        if (!currentModel.value.option.materials[meshUUID]) {
          currentModel.value.option.materials[meshUUID] = {}
        }
        currentModel.value.option.materials[meshUUID].mapUrl = textureUrl

        console.log(`保存贴图URL到配置:`, meshUUID, textureUrl)

        // 加载贴图
        const applyTexture = (url: string) => {
          console.log(`开始加载贴图:`, url)

          // 创建纹理加载器
          const textureLoader = new THREE.TextureLoader()
          textureLoader.setCrossOrigin('anonymous') // 设置跨域

          textureLoader.load(
            url,
            texture => {
              console.log('贴图加载成功')
              // 设置纹理参数
              texture.wrapS = THREE.RepeatWrapping
              texture.wrapT = THREE.RepeatWrapping
              texture.needsUpdate = true

              // 保存URL到texture的userData
              texture.userData = texture.userData || {}
              texture.userData.url = url

              // 保存到材质的userData
              if (!currentMesh.value.material.userData) {
                currentMesh.value.material.userData = {}
              }
              currentMesh.value.material.userData.mapUrl = url

              // 应用纹理到材质
              currentMesh.value.material.map = texture
              currentMesh.value.material.needsUpdate = true

              // 不再需要查找模型组件实例，已使用双向绑定同步贴图

              console.log('贴图已应用并保存到各个位置')
            },
            undefined,
            error => {
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

            // 保存到材质的userData
            if (!currentMesh.value.material.userData) {
              currentMesh.value.material.userData = {}
            }
            currentMesh.value.material.userData.mapUrl = url

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
        applyTexture(textureUrl)
      }
    } else if (currentMesh.value.material.map) {
      // 如果要移除贴图
      currentMesh.value.material.map = null
      currentMesh.value.material.needsUpdate = true

      // 从配置中移除
      if (currentModel.value.option.textures[meshUUID]) {
        delete currentModel.value.option.textures[meshUUID].mapUrl
      }
      if (currentModel.value.option.materials[meshUUID]) {
        delete currentModel.value.option.materials[meshUUID].mapUrl
      }

      // 从材质的userData中移除
      if (currentMesh.value.material.userData) {
        delete currentMesh.value.material.userData.mapUrl
      }

      console.log('已移除贴图')
    }
  }

  // 保存材质属性
  currentModel.value.option.materials[meshUUID] = {
    color:
      newMaterial.color ||
      (currentMesh.value.material.color.getHexString
        ? '#' + currentMesh.value.material.color.getHexString()
        : currentMesh.value.material.color),
    opacity: currentMesh.value.material.opacity,
    transparent: currentMesh.value.material.transparent
  }

  // 保存mapUrl到材质配置
  if (newMaterial.mapUrl) {
    // 确保materials[meshUUID]存在
    if (!currentModel.value.option.materials[meshUUID]) {
      currentModel.value.option.materials[meshUUID] = {}
    }
    currentModel.value.option.materials[meshUUID].mapUrl = newMaterial.mapUrl
  } else if (typeof newMaterial.map === 'string') {
    // 确保materials[meshUUID]存在
    if (!currentModel.value.option.materials[meshUUID]) {
      currentModel.value.option.materials[meshUUID] = {}
    }
    currentModel.value.option.materials[meshUUID].mapUrl = newMaterial.map
  } else if (newMaterial.map && newMaterial.map.userData && newMaterial.map.userData.url) {
    // 确保materials[meshUUID]存在
    if (!currentModel.value.option.materials[meshUUID]) {
      currentModel.value.option.materials[meshUUID] = {}
    }
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

// 分析模型结构的辅助函数
const analyzeModelStructure = (model: any, depth = 0, maxDepth = 3): string => {
  // 如果深度超过最大值，不再继续递归
  if (depth > maxDepth) {
    return '  '.repeat(depth) + '... (更多层级省略)\n'
  }

  // 基本缩进
  const indent = '  '.repeat(depth)

  // 获取对象类型和名称信息
  const typeStr = model.type || 'Unknown'
  const nameStr = model.name ? `"${model.name}"` : '(无名称)'
  const idStr = model.uuid ? `[${model.uuid.substring(0, 8)}]` : ''

  // 当前对象的信息
  let result = `${indent}${typeStr} ${nameStr} ${idStr}\n`

  // 递归处理子对象
  if (model.children && model.children.length > 0) {
    model.children.forEach((child: any) => {
      result += analyzeModelStructure(child, depth + 1, maxDepth)
    })
  }

  return result
}

const submitEditModel = async () => {
  if (!currentModel.value?.id) {
    console.error('当前模型ID不存在，无法保存')
    message.error('当前模型ID不存在，无法保存')
    return
  }
  messageBox.value.loadingInstance = message.loading(
    `正在保存模型...`,
    { duration: 0 }
  )
  // 立即设置loading状态
  loading.value = true
  
  // 使用nextTick和setTimeout确保UI更新，让loading状态显示出来
  await nextTick()
  // 给浏览器一点时间去渲染UI更新
  await new Promise(resolve => setTimeout(resolve, 50))

  try {
    // 获取当前编辑的模型组件ID - 这是模型组件ID，不是mesh ID
    const modelComponentId = currentModel.value.id
    messageBox.value.loadingInstance.content = `准备导出模型 (ID: ${modelComponentId.substring(0, 8)})...`

    // 1. 确保模型数据存在
    const model = getModeList[modelComponentId]
    if (!model) {
      throw new Error('找不到模型数据')
    }

    // 检查模型是否为空
    messageBox.value.loadingInstance.content = `检查模型数据完整性...`
    if (!model.children || model.children.length === 0) {
      messageBox.value.loadingInstance?.destroy?.()
      message.error('模型无效：模型内容为空')
      loading.value = false
      return
    }
    
    // 更新模型列表 - 确保最新的变更已保存
    chartEditStore.setModelList(modelComponentId, model)
    messageBox.value.loadingInstance.content = `模型数据已更新，准备导出...`
    
    // 再次分割任务，确保UI可以刷新
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // 2. 克隆并清理模型 - 避免修改原始模型
    let exportModel = model.clone()
    
    // 预处理函数 - 专门用于删除之前导出产生的标记层级，并保留原始结构
    const removeExportLayers = (node: THREE.Object3D): boolean => {
      if (!node || !node.children || node.children.length === 0) return false;
      
      let hasModified = false;
      
      // 首先递归处理所有子节点，深度优先遍历
      // 使用一个副本，因为可能会修改children数组
      const children = [...node.children];
      for (let i = 0; i < children.length; i++) {
        const childHasModified = removeExportLayers(children[i]);
        if (childHasModified) hasModified = true;
      }
      
      // 查找特殊的导出标记层 - 包括ExportedModel和AuxScene
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        
        // 检查是否是导出层级标记
        if (child.name && (
            child.name.includes('AuxScene') || 
            child.name.includes('ExportedModel') ||
            child.name.includes('CleanedModel')
          )) {
          console.log('找到导出标记层:', child.name, '- 将提升其子对象');
          
          // 收集所有子对象
          const grandchildren = [...child.children];
          
          // 将子对象提升一级
          grandchildren.forEach(grandchild => {
            // 从标记层移除
            child.remove(grandchild);
            // 添加到当前节点
            node.add(grandchild);
          });
          
          // 移除空的标记层
          node.remove(child);
          console.log('已移除导出标记层，并保留了其中的', grandchildren.length, '个子对象');
          hasModified = true;
        }
        // 检查无名称的空组，通常是第二层嵌套
        else if (child.type === 'Group' && (!child.name || child.name === '') && child.children && child.children.length > 0) {
          // 如果无名空组里面有Object3D且其子对象为空，则是典型的嵌套问题
          let hasEmptyObject3D = false;
          
          for (let j = 0; j < child.children.length; j++) {
            const grandchild = child.children[j];
            if (grandchild.type === 'Object3D' && 
                (!grandchild.children || grandchild.children.length === 0)) {
              hasEmptyObject3D = true;
              break;
            }
          }
          
          if (hasEmptyObject3D) {
            console.log('检测到无名空组内有空的Object3D，准备提取内容');
            
            // 收集所有非空的子对象
            const validGrandchildren = [];
            child.children.forEach(grandchild => {
              if (!(grandchild.type === 'Object3D' && 
                    (!grandchild.children || grandchild.children.length === 0))) {
                validGrandchildren.push(grandchild);
              }
            });
            
            if (validGrandchildren.length > 0) {
              // 将有效子对象提升一级
              validGrandchildren.forEach(grandchild => {
                // 从当前层移除
                child.remove(grandchild);
                // 添加到上一级
                node.add(grandchild);
              });
              
              // 移除空的无名组
              node.remove(child);
              console.log('已移除无名空组和空Object3D，并提升了', validGrandchildren.length, '个有效子对象');
              hasModified = true;
            }
          }
        }
      }
      
      return hasModified;
    };
    
    // 执行预处理 - 移除导出标记层
    const hasRemovedLayers = removeExportLayers(exportModel);
    if (hasRemovedLayers) {
      messageBox.value.loadingInstance.content = `已优化模型结构，移除冗余层级...`
    }

    // 清理模型 - 只移除辅助对象，保留原始结构
    const cleanupModel = (node: THREE.Object3D) => {
      if (!node || !node.children || node.children.length === 0) return;
      
      // 首先检查是否有AuxScene层嵌套的情况
      let hasFixed = false;
      
      // 检查特殊情况：只有一个无名子对象，该子对象再包含AuxScene
      if (node.children.length === 1 && 
          node.children[0].type === 'Group' && 
          (!node.children[0].name || node.children[0].name === '')) {
        
        console.log('检测到可能有嵌套问题的结构:', node);
        
        // 检查内部子对象
        const innerGroup = node.children[0];
        
        // 查找内部是否有AuxScene或实际内容
        const auxSceneChildren: THREE.Object3D[] = [];
        const validChildren: THREE.Object3D[] = [];
        
        innerGroup.children.forEach(child => {
          if (child.name && child.name.includes('AuxScene')) {
            auxSceneChildren.push(child);
          } else {
            validChildren.push(child);
          }
        });
        
        if (auxSceneChildren.length > 0 && validChildren.length > 0) {
          console.log('检测到典型的AuxScene嵌套问题，将进行修复');
          
          // 移除当前子对象
          node.remove(innerGroup);
          
          // 添加有效子对象
          validChildren.forEach(child => {
            innerGroup.remove(child);
            node.add(child);
          });
          
          console.log('结构修复完成，从嵌套中提取了', validChildren.length, '个有效对象');
          hasFixed = true;
        }
      }
      
      // 如果没有修复嵌套问题，执行常规清理
      if (!hasFixed) {
        const objectsToRemove: THREE.Object3D[] = [];
        
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i]

          // 检查是否是AuxScene层或CleanedModel层
          if (child.name && (child.name.includes('AuxScene') || child.name.includes('CleanedModel'))) {
            objectsToRemove.push(child)
            console.log('将移除AuxScene或CleanedModel对象:', child.name)
          }
          // 检查是否是轮廓线
          else if (
            (child as any).isOutline ||
            (child.userData && (child.userData.isOutline || child.userData.isSelectionEffect)) ||
            (child.type === 'LineSegments' &&
              (child as any).material &&
              typeof (child as any).material.type === 'string' &&
              (child as any).material.type === 'LineBasicMaterial' &&
              (child as any).material.color &&
              (child as any).material.color.getHex &&
              (child as any).material.color.getHex() === 0x00ffff)
          ) {
            objectsToRemove.push(child)
            console.log('将移除轮廓线对象:', child.uuid)
          }
          // 检查是否是空的Object3D对象 - 这是关键修复
          else if (
            child.type === 'Object3D' && 
            Array.isArray(child.children) && 
            child.children.length === 0 &&
            !(child as any).isMesh
          ) {
            objectsToRemove.push(child)
            console.warn('将移除空的Object3D对象:', child.uuid)
          }
          // 检查是否存在Group > 空Object3D的嵌套结构
          else if (
            child.type === 'Group' && 
            child.children && 
            child.children.length > 0
          ) {
            // 查找是否有空的Object3D子对象
            let hasEmptyObject3D = false;
            let validGrandchildren: THREE.Object3D[] = [];
            
            // 检查所有子对象
            for (let j = 0; j < child.children.length; j++) {
              const grandchild = child.children[j];
              if (grandchild.type === 'Object3D' && 
                  (!grandchild.children || grandchild.children.length === 0) && 
                  !(grandchild as any).isMesh) {
                // 找到空的Object3D
                hasEmptyObject3D = true;
                objectsToRemove.push(grandchild);
                console.log('检测到Group内的空Object3D，将移除:', grandchild.uuid);
              } else {
                // 收集有效子对象
                validGrandchildren.push(grandchild);
              }
            }
            
            // 继续递归处理
            cleanupModel(child);
          }
          else {
            cleanupModel(child)
          }
        }
        
        for (const obj of objectsToRemove) {
          try {
            node.remove(obj);
          } catch (e) {
            console.warn('移除对象失败:', e);
          }
        }
      }
    };

    // 递归清理模型 - 只移除辅助对象，保留原始结构
    cleanupModel(exportModel)
    console.log('已清理模型，保留原始层级结构')

    // 重要：不进行扁平化处理，保留模型的原始层级结构
    // 这样导出后的模型会保持与原始模型相同的层级关系
    // 避免破坏原始模型的组织方式和命名结构

    // 再次检查exportModel是否有效
    if (!exportModel.children || exportModel.children.length === 0) {
      console.error('清理后的模型children数组为空，尝试恢复')

      // 尝试恢复：如果清理后模型为空，但原始模型不为空，直接使用克隆的原始模型
      if (model.children && model.children.length > 0) {
        console.log('使用未清理的原始模型进行恢复')
        // 重新克隆模型，但不进行清理
        exportModel = model.clone()

        // 添加警告信息，解释可能存在的问题
        message.warning('模型结构可能异常，已使用原始模型进行恢复')
      } else {
        // 如果恢复失败
        message.error('模型导出失败：清理后的模型内容为空')
        loading.value = false
        return
      }
    }

    // 3. 确保每个mesh都有正确的材质和贴图配置
    exportModel.traverse((obj: THREE.Object3D) => {
      if ((obj as any).isMesh) {
        const meshId = obj.uuid

        // 确保每个mesh都有userData对象
        if (!obj.userData) obj.userData = {}

        // 从全局配置中获取该mesh的配置
        const materialConfig =
          currentModel.value.option &&
          currentModel.value.option.materials &&
          currentModel.value.option.materials[meshId]

        const textureConfig =
          currentModel.value.option && currentModel.value.option.textures && currentModel.value.option.textures[meshId]

        // 保存材质信息到userData
        if (materialConfig) {
          obj.userData.material = { ...materialConfig }
        }

        // 保存贴图URL到userData
        if (textureConfig && textureConfig.mapUrl) {
          obj.userData.materialMapUrl = textureConfig.mapUrl
        }

        // 确保材质的userData中也有贴图URL
        if ((obj as any).material) {
          if (!(obj as any).material.userData) {
            ;(obj as any).material.userData = {}
          }

          // 复制贴图URL
          if (textureConfig && textureConfig.mapUrl) {
            ;(obj as any).material.userData.mapUrl = textureConfig.mapUrl
          } else if (materialConfig && materialConfig.mapUrl) {
            ;(obj as any).material.userData.mapUrl = materialConfig.mapUrl
          }
        }
      }
    })

    // 4. 保存全局配置信息到模型的userData中，便于导入时恢复
    if (!exportModel.userData) exportModel.userData = {}

    // 确保当前模型有option对象
    if (!currentModel.value.option) {
      currentModel.value.option = {}
    }

    // 复制完整的配置
    exportModel.userData.fullConfig = currentModel.value.option

    // 特别保存贴图和材质配置
    exportModel.userData.textures = currentModel.value.option.textures || {}
    exportModel.userData.materials = currentModel.value.option.materials || {}

    // 提取所有贴图URL到单独的列表，便于导入时使用
    exportModel.userData.textureURLs = {}
    if (currentModel.value.option.textures) {
      Object.keys(currentModel.value.option.textures).forEach(uuid => {
        const textureConfig = currentModel.value.option.textures[uuid]
        if (textureConfig && textureConfig.mapUrl) {
          exportModel.userData.textureURLs[uuid] = textureConfig.mapUrl
        }
      })
    }

    console.log('清理并准备导出的模型:', exportModel)

    // 5. 导出为GLTF格式
    // 再次确保UI能更新显示loading状态
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 20))
    
    messageBox.value.loadingInstance.content = `正在导出模型...`
    
    // 最终清理：递归检查并删除所有包含ExportedModel的对象
    const removeExportedModelLayers = (node: THREE.Object3D) => {
      if (!node || !node.children || node.children.length === 0) return;
      
      // 递归处理所有子节点前，先保存子节点副本，避免在遍历过程中修改原数组
      const childrenCopy = [...node.children];
      
      // 递归处理所有子节点
      childrenCopy.forEach(child => removeExportedModelLayers(child));
      
      // 检查当前节点下是否有包含ExportedModel的子节点
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        
        // 如果子节点名称包含ExportedModel
        if (child.name && child.name.includes('ExportedModel')) {
          console.log(`找到包含ExportedModel的层: "${child.name}"`);
          
          // 收集所有孙子节点
          const grandchildren = [...child.children];
          
          // 将孙子节点提升到当前节点下
          grandchildren.forEach(grandchild => {
            child.remove(grandchild);
            node.add(grandchild);
            console.log(`已将子对象 "${grandchild.name || '未命名'}" 提升一级`);
          });
          
          // 移除包含ExportedModel的空节点
          node.remove(child);
          console.log(`已删除包含ExportedModel的层 "${child.name}"`);
        }
      }
    };
    
    // 执行最终清理 - 删除所有包含ExportedModel的层
    removeExportedModelLayers(exportModel);
    console.log('已完成最终清理，删除了所有包含ExportedModel的层');
    
    const exportedGltf: any = await new Promise<any>((resolve, reject) => {
      // 最终导出安全检查
      if (!exportModel.children || exportModel.children.length === 0) {
        console.error('准备导出时发现模型为空，添加占位组')
        // 添加占位组，确保导出不会完全失败
        const placeholderGroup = new THREE.Group()
        placeholderGroup.name = "EmergencyPlaceholder"
        exportModel.add(placeholderGroup)
        message.warning('模型可能包含异常结构，已添加占位元素确保导出')
      }
      
      // 导出前重命名顶层对象，防止生成空名称组
      if (!exportModel.name) {
        exportModel.name = "ExportedModel_" + Date.now()
      } 
      
      // 确保模型结构不变，设置用户自定义标记防止额外嵌套
      exportModel.userData = exportModel.userData || {}
      exportModel.userData.preserveStructure = true
      
      const exporter = new GLTFExporter()
      exporter.parse(
        exportModel,
        (gltf) => resolve(gltf),
        (error) => reject(error),
        { 
          binary: true,            // 使用二进制格式
          embedImages: true,       // 嵌入图片
          includeCustomExtensions: true, // 包含自定义扩展
          onlyVisible: true,       // 只导出可见对象
          trs: false,               // 不分解变换矩阵
          truncateDrawRange: true, // 优化几何体数据范围
        }
      );
    })

    // 6. 创建File对象并上传
    let blob
    if (exportedGltf instanceof ArrayBuffer) {
      blob = new Blob([exportedGltf], { type: 'application/octet-stream' })
    } else {
      // 处理JSON格式，确保贴图URL等配置信息存在
      const jsonData = exportedGltf as any
      if (!jsonData.extras) jsonData.extras = {}

      // 保存完整的材质和贴图信息到extras
      jsonData.extras.modelConfig = currentModel.value.option
      jsonData.extras.textures = currentModel.value.option.textures || {}
      jsonData.extras.materials = currentModel.value.option.materials || {}
      jsonData.extras.textureURLs = exportModel.userData.textureURLs || {}

      const output = JSON.stringify(jsonData)
      blob = new Blob([output], { type: 'application/json' })
    }
    
    // 在文件上传前再次更新UI
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 20))

    messageBox.value.loadingInstance.content = `正在上传模型文件...`
    const file = new File([blob], `model_${Date.now()}.glb`, { type: blob.type })

    // 上传文件到服务器
    const res = await storedFileUploadFile({ file: file })
    if (!res.data) throw new Error('模型上传失败: 未获取到URL')

    const modelUrl = res.data
    messageBox.value.loadingInstance.content = `模型上传成功，正在更新组件配置...`

    // 7. 更新组件配置
    // 注意：这里使用modelComponentId，不使用targetChart.selectId
    // 因为targetChart.selectId是当前选中的mesh ID，而我们需要更新模型组件ID
    console.log('当前选中的mesh ID:', targetChart.selectId)
    console.log('使用的模型组件ID:', modelComponentId)

    // 更新组件配置
    chartEditStore.setComponentListAll(modelComponentId, modelUrl, 'meshConfig')

    // 8. 更新选中的组件ID
    chartEditStore.setTargetSelectChart(modelComponentId)

    // 9. 显示成功消息
    messageBox.value.loadingInstance?.destroy?.()
    message.success('模型导出并保存成功')

    // 10. 退出编辑模式
    // 使用延迟退出，确保UI更新完成
    setTimeout(() => {
      try {
        // 先退出编辑模式
        chartEditStore.setCurrentModel(undefined)
        
        // 最后关闭loading状态
        loading.value = false
      } catch (error) {
        console.error('退出编辑模式时出错:', error)
        loading.value = false
      }
    }, 500)
  } catch (error) {
    console.error('模型导出失败:', error)
    messageBox.value.loadingInstance?.destroy?.()
    message.error(`模型导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
    loading.value = false
  } finally {
    chartEditStore.setAllShow()
    netWorkInternal(2000)
  }
}
</script>

<style lang="scss" scoped>
@include go('chart-configurations-setting') {
}
</style>

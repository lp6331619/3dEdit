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
      v-if="targetData && targetData.attr && (
        // @ts-ignore - 忽略类型检查，在运行时targetData确实有type属性
        targetData.type != 'TresMesh' && 
        !targetData.isGroup && 
        // @ts-ignore - 忽略类型检查，在运行时targetData确实有type属性
        targetData.type != 'GLTFModel' && 
        !currentModel
      )"
      :isGroup="targetData.isGroup || false"
      :chartAttr="targetData.attr"
    ></size-setting>
    <!-- 位置 -->
    <position-setting v-if="!currentModel && targetData.option?.position" :position="targetData.option?.position" :canvasConfig="chartEditStore.getEditCanvasConfig" />
    <!-- 滤镜 -->
    <!-- <styles-setting :isGroup="targetData.isGroup" :chartStyles="targetData.styles"></styles-setting> -->
    
    <!-- 自定义配置项 -->
     <div v-if="currentModel && currentMesh && currentMesh.type=='Mesh'">
      <MeshConfig :material="currentMesh.material" @update:material="handleMaterialUpdate" />
     </div>
    <component
      v-else-if="targetData?.chartConfig?.conKey"
      :is="targetData?.chartConfig?.conKey"
      :optionData="targetData.option || {}"
      :childrenData="(
        // @ts-ignore - 忽略类型检查，在运行时targetData确实可能有children属性
        targetData.children || []
      )"
    ></component>

    <div v-if="targetData && (
      // @ts-ignore - 忽略类型检查，在运行时targetData确实有type属性
      targetData.type=='GLTFModel' || currentMesh
    )">
      <template v-if="currentModel">
        <n-button 
          type="primary" 
          :loading="loading" 
          :disabled="loading" 
          size="medium"
          @click="submitEditModel"
        >
          {{ loading ? '保存中...' : '保存' }}
        </n-button>
        <n-button 
          :loading="loading" 
          :disabled="loading" 
          class="go-ml-2" 
          @click="cancelEditModel"
        >
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
import { PropType, computed,shallowRef,watch ,ref} from 'vue'
import { NameSetting,NameSetting2, PositionSetting, SizeSetting, StylesSetting } from '@/components/Pages/ChartItemSetting'
import { useTargetData } from '../hooks/useTargetData.hook'
import MeshConfig from '@/packages/components/Graphic/Model/Mesh/config.vue'
import { deepClone } from '@/utils'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import * as THREE from 'three'
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
}, {
  immediate: true
})
const cancelEditModel = () => {
  try {
    console.log('开始清理编辑状态...');
    
    // 先清除当前选中的mesh，避免在currentModel被清除后出现引用错误
    currentMesh.value = null;
    
    // 安全地清除选中状态
    try {
      // 清除当前选择的模型部件
      chartEditStore.setTargetSelectChart(undefined);
    } catch (selectError) {
      console.warn('清除模型选择状态时出错:', selectError);
    }
    
    // 使用更长的延迟，确保UI组件有足够时间处理状态变化
    setTimeout(() => {
      try {
        console.log('清除模型编辑状态');
        // 清除当前模型编辑状态
        chartEditStore.setCurrentModel(undefined);
      } catch (modelError) {
        console.error('清除模型编辑状态时出错:', modelError);
      }
    }, 50); // 使用更长的延迟
  } catch (error) {
    console.error('取消编辑时出错:', error);
    // 如果出错，尝试强制重置状态
    chartEditStore.setCurrentModel(undefined);
    chartEditStore.setTargetSelectChart(undefined);
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
      const textureUrl = typeof newMaterial.map === 'string' ? 
                          newMaterial.map : 
                          (newMaterial.mapUrl || '');
      
      if (textureUrl) {
        // 保存到配置中
        // 确保textures[meshUUID]存在
        if (!currentModel.value.option.textures[meshUUID]) {
          currentModel.value.option.textures[meshUUID] = {};
        }
        currentModel.value.option.textures[meshUUID].mapUrl = textureUrl;
        
        // 确保materials[meshUUID]存在
        if (!currentModel.value.option.materials[meshUUID]) {
          currentModel.value.option.materials[meshUUID] = {};
        }
        currentModel.value.option.materials[meshUUID].mapUrl = textureUrl;
        
        console.log(`保存贴图URL到配置:`, meshUUID, textureUrl);
        
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
              
              // 保存到材质的userData
              if (!currentMesh.value.material.userData) {
                currentMesh.value.material.userData = {};
              }
              currentMesh.value.material.userData.mapUrl = url;
              
              // 应用纹理到材质
              currentMesh.value.material.map = texture
              currentMesh.value.material.needsUpdate = true
              
              // 不再需要查找模型组件实例，已使用双向绑定同步贴图
              
              console.log('贴图已应用并保存到各个位置');
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
            
            // 保存到材质的userData
            if (!currentMesh.value.material.userData) {
              currentMesh.value.material.userData = {};
            }
            currentMesh.value.material.userData.mapUrl = url;
            
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
        delete currentMesh.value.material.userData.mapUrl;
      }
      
      console.log('已移除贴图');
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
    // 确保materials[meshUUID]存在
    if (!currentModel.value.option.materials[meshUUID]) {
      currentModel.value.option.materials[meshUUID] = {};
    }
    currentModel.value.option.materials[meshUUID].mapUrl = newMaterial.mapUrl
  } else if (typeof newMaterial.map === 'string') {
    // 确保materials[meshUUID]存在
    if (!currentModel.value.option.materials[meshUUID]) {
      currentModel.value.option.materials[meshUUID] = {};
    }
    currentModel.value.option.materials[meshUUID].mapUrl = newMaterial.map
  } else if (newMaterial.map && newMaterial.map.userData && newMaterial.map.userData.url) {
    // 确保materials[meshUUID]存在
    if (!currentModel.value.option.materials[meshUUID]) {
      currentModel.value.option.materials[meshUUID] = {};
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
    return '  '.repeat(depth) + '... (更多层级省略)\n';
  }

  // 基本缩进
  const indent = '  '.repeat(depth);
  
  // 获取对象类型和名称信息
  const typeStr = model.type || 'Unknown';
  const nameStr = model.name ? `"${model.name}"` : '(无名称)';
  const idStr = model.uuid ? `[${model.uuid.substring(0, 8)}]` : '';
  
  // 当前对象的信息
  let result = `${indent}${typeStr} ${nameStr} ${idStr}\n`;
  
  // 递归处理子对象
  if (model.children && model.children.length > 0) {
    model.children.forEach((child: any) => {
      result += analyzeModelStructure(child, depth + 1, maxDepth);
    });
  }
  
  return result;
};

const submitEditModel = async () => {
  if (!currentModel.value?.id) {
    console.error('当前模型ID不存在，无法保存');
    message.error('当前模型ID不存在，无法保存');
    return;
  }
  
  // 立即设置loading状态
  loading.value = true;
  console.log('开始保存模型，loading状态:', loading.value);
  
  try {
    // 获取当前模型ID和数据
    const modelId = currentModel.value.id;
    console.log('当前模型ID:', modelId);
    
    const model = getModeList[modelId];
    if (!model) {
      console.error('找不到模型数据');
      message.error('找不到模型数据');
      loading.value = false;
      return;
    }
    
    // 确保模型配置完整
    if (!currentModel.value.option) {
      currentModel.value.option = {};
    }
    
    // 获取当前选中的组件ID (需确保有选中的组件)
    if (!targetChart.selectId || targetChart.selectId.length === 0) {
      console.error('未选中任何组件');
      message.error('未选中任何组件');
      loading.value = false;
      return;
    }
    
    const componentId = targetChart.selectId[0];
    console.log('当前组件ID:', componentId);
    
    // 更简单的保存方式 - 不使用setComponentListAll，直接更新store中的数据
    try {
      // 1. 更新模型列表数据
      chartEditStore.setModelList(modelId, model);
      console.log('已更新模型列表数据');
      
      // 2. 保存当前选中的组件状态
      chartEditStore.setTargetSelectChart(componentId);
      console.log('已保存当前选中的组件状态');
      
      // 3. 显示保存成功提示
      message.success('模型配置已保存');
      
      // 4. 退出编辑模式
      setTimeout(() => {
        try {
          // 清除当前编辑的模型
          chartEditStore.setCurrentModel(undefined);
          console.log('已清除当前编辑的模型');
          
          // 关闭loading状态
          loading.value = false;
          console.log('模型保存完成，已关闭loading状态');
        } catch (clearError) {
          console.error('清除编辑状态时出错:', clearError);
          loading.value = false;
        }
      }, 100);
    } catch (saveError) {
      console.error('保存到store时出错:', saveError);
      message.error(`保存到store时出错: ${saveError instanceof Error ? saveError.message : '未知错误'}`);
      loading.value = false;
    }
  } catch (error) {
    console.error('保存模型失败:', error);
    message.error(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
@include go('chart-configurations-setting') {
}
</style>

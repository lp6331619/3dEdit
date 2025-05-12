<!--
 * @Descripttion: 
 * @version: 1.0
 * @Author: Teemor
 * @Date: 2024-11-26 10:46:57
 * @LastEditors: Teemor 232957726@qq.com
 * @LastEditTime: 2025-05-09 17:19:54
-->
<template>
  <primitive v-if="modelGroup" :object="modelGroup" />
</template>
<script setup>
import { ref, watch, onMounted, shallowRef, nextTick, computed } from 'vue'
import { Group, Mesh, Color, MeshStandardMaterial, LineBasicMaterial, LineSegments, EdgesGeometry, Vector3 } from 'three'
import { useGLTF } from '@tresjs/cientos'
import { useTresContext, useRenderLoop } from '@tresjs/core'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import cloneDeep from 'lodash/cloneDeep'
import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { useMessage } from 'naive-ui'
const chartEditStore = useChartEditStore()
const getModelList = chartEditStore.getModelList
const emit = defineEmits(['change', 'update:value'])
const props = defineProps({
  url: String,
  styles: Object,
  data: Object,
  config: {
    type: Object,
    default: () => ({})
  }
})

const modelGroup = shallowRef(null)
const modelCache = ref({}) // 用于缓存模型原始状态
const isLoading = ref(false) // 加载状态标志
const message = useMessage()
const messageBox = ref(null)
// 保存当前添加的轮廓线
const currentOutlines = new Map();

// 当前选中的mesh ID
const selectedMeshId = computed(() => {
  const targetChart = chartEditStore.getTargetChart;
  if (targetChart.selectId && targetChart.selectId.length > 0) {
    return targetChart.selectId[0];
  }
  return null;
});

// 为mesh创建轮廓线
const createOutline = (mesh) => {
  if (!mesh || !mesh.geometry) return null;

  // 创建网格边缘 - 使用较大的阈值减少边缘线数量，提高性能
  const edges = new EdgesGeometry(mesh.geometry, 30); // 增加阈值到30度
  
  // 创建更简单的发光材质
  const outlineMaterial = new LineBasicMaterial({
    color: 0x00ffff,  // 青色鲜艳
    linewidth: 3,     // 尽量增加线宽
  });
  
  // 创建轮廓线
  const outline = new LineSegments(edges, outlineMaterial);
  
  // 复制mesh的变换
  outline.position.copy(mesh.position);
  outline.rotation.copy(mesh.rotation);
  outline.scale.copy(mesh.scale).multiplyScalar(1.10); // 使用更大的单层轮廓
  
  // 标记为轮廓线（双重标记以确保导出时能识别）
  outline.isOutline = true;
  outline.targetMesh = mesh;
  
  // 确保userData存在并添加标记
  if (!outline.userData) outline.userData = {};
  outline.userData.isOutline = true;
  outline.userData.isSelectionEffect = true;
  
  return outline;
};

// 移除所有轮廓线
const removeAllOutlines = () => {
  if (!modelGroup.value) return;
  
  // 移除已存在的轮廓线引用中的轮廓线
  currentOutlines.forEach((outline) => {
    if (outline.parent) {
      outline.parent.remove(outline);
    }
  });
  
  // 清空映射
  currentOutlines.clear();
  
  // 额外检查模型中的所有对象，移除任何可能遗留的轮廓线
  if (modelGroup.value) {
    const outlinesToRemove = [];
    
    // 遍历模型找出所有轮廓线对象
    modelGroup.value.traverse((obj) => {
      if (obj.isOutline || 
          (obj.userData && (obj.userData.isOutline || obj.userData.isSelectionEffect)) ||
          (obj.type === 'LineSegments' && obj.material && obj.material.type === 'LineBasicMaterial' && 
           obj.material.color && obj.material.color.getHex() === 0x00ffff)) {
        outlinesToRemove.push(obj);
      }
    });
    
    // 移除找到的所有轮廓线
    outlinesToRemove.forEach((outline) => {
      if (outline.parent) {
        console.log('移除额外发现的轮廓线:', outline.uuid);
        outline.parent.remove(outline);
      }
    });
    
    console.log(`额外清理了 ${outlinesToRemove.length} 个轮廓线对象`);
  }
};

// 创建轮廓脉冲动画 - 简化版本
const createPulseAnimation = (outline) => {
  if (!outline || !outline.targetMesh) return null;
  
  // 动画数据
  const animationData = { 
    scale: 1.10,     // 开始比例 
    direction: 0.005 // 每帧增长率
  };
  
  // 无需使用TWEEN，直接在渲染循环中简单处理
  outline.animationData = animationData;
  
  return animationData;
};

// 监听选中ID变化，更新mesh高亮状态
watch(selectedMeshId, (newId, oldId) => {
  if (!modelGroup.value) return;
  
  // 彻底移除所有现有轮廓线
  removeAllOutlines();
  
  // 如果有新选中的mesh，添加轮廓线
  if (newId) {
    // 确保不会重复添加轮廓线
    let meshFound = false;
    
    modelGroup.value.traverse((child) => {
      if (child.uuid === newId && child.isMesh) {
        meshFound = true;
        // 创建轮廓线
        const outline = createOutline(child);
        
        if (outline) {
          // 添加到模型组
          if (child.parent) {
            child.parent.add(outline);
          } else {
            modelGroup.value.add(outline);
          }
          
          // 保存轮廓线引用
          currentOutlines.set(child.uuid, outline);
          
          // 添加简单的脉冲动画
          createPulseAnimation(outline);
          
          console.log('为mesh添加了新的轮廓线:', child.uuid);
        }
      }
    });
    
    if (!meshFound) {
      console.warn('没有找到UUID为', newId, '的网格，无法添加轮廓线');
    }
  }
}, { immediate: true });

// 加载模型
const loadModel = async (url) => {
  if (!url) {
    console.error('模型URL为空，无法加载模型')
    return
  }
  
  // 设置加载状态
  isLoading.value = true
  
  try {
    const loader = new GLTFLoader()
    
    // 创建一个新的Group作为模型容器
    if (!modelGroup.value) {
      modelGroup.value = new Group()
    } else {
      // 清空现有模型组
      while(modelGroup.value.children.length > 0) {
        modelGroup.value.remove(modelGroup.value.children[0])
      }
    }
    
    loader.load(
      url,
      (gltf) => {
        try {
          console.log('模型加载成功:', gltf)
          
          // 提取模型根对象
          const model = gltf.scene
          
          if (!model) {
            console.error('模型加载失败：场景对象为空')
            isLoading.value = false
            return
          }
          
          console.log('原始加载模型结构:', model);
          
          // 检查模型层级结构并修复空的Object3D问题
          const fixEmptyObject3D = (parent) => {
            if (!parent || !parent.children) return false;
            
            let hasFixed = false;
            
            // 先处理子对象，深度优先
            for (let i = 0; i < parent.children.length; i++) {
              if (fixEmptyObject3D(parent.children[i])) {
                hasFixed = true;
              }
            }
            
            // 检查是否存在Object3D层级且children为空的情况
            for (let i = 0; i < parent.children.length; i++) {
              const child = parent.children[i];
              
              // 判断是否是Object3D且children为空数组，且不是关键元素
              if (child.type === 'Object3D' && 
                  Array.isArray(child.children) && 
                  child.children.length === 0 &&
                  !child.isMesh) {
                
                console.warn('检测到空的Object3D对象，将被移除:', child.uuid);
                parent.remove(child);
                i--; // 由于删除了元素，索引需要回退
                hasFixed = true;
              }
            }
            
            return hasFixed;
          };
          
          // 执行修复
          if (fixEmptyObject3D(model)) {
            console.log('已修复空的Object3D对象');
          }
          
          // 检查模型是否为空模型 (children数组为空)
          if (!model.children || model.children.length === 0) {
            console.warn('加载的模型children数组为空，这可能导致问题')
            // 添加一个占位符子对象，防止后续处理失败
            const placeholderGroup = new THREE.Group()
            placeholderGroup.name = "PlaceholderForEmptyModel"
            model.add(placeholderGroup)
            message.warning('加载的模型结构可能异常，已添加占位元素防止问题')
          }
          
          // 清理可能存在的AuxScene图层
          cleanupAuxScenes(model)
          
          // 添加模型到场景
          modelGroup.value.add(model)
          
          // 尝试从模型中获取贴图配置信息
          let extractedConfig = props.config || {}
          
          // 如果模型是从我们的应用导出的，尝试从extras中提取贴图配置
          if (gltf.parser && gltf.parser.json && gltf.parser.json.extras) {
            console.log('检测到模型中包含额外配置数据:', gltf.parser.json.extras)
            
            // 提取贴图和材质配置
            if (gltf.parser.json.extras.textures) {
              extractedConfig.textures = gltf.parser.json.extras.textures
              console.log('提取贴图配置:', extractedConfig.textures)
            }
            
            if (gltf.parser.json.extras.materials) {
              extractedConfig.materials = gltf.parser.json.extras.materials
              console.log('提取材质配置:', extractedConfig.materials)
            }
            
            // 合并其他配置
            if (gltf.parser.json.extras.modelConfig) {
              extractedConfig = {
                ...extractedConfig,
                ...gltf.parser.json.extras.modelConfig
              }
              console.log('合并模型配置:', gltf.parser.json.extras.modelConfig)
            }
            
            // 提取贴图URL列表
            if (gltf.parser.json.extras.textureURLs) {
              if (!extractedConfig.textures) extractedConfig.textures = {}
              
              // 将贴图URL列表合并到配置中
              Object.keys(gltf.parser.json.extras.textureURLs).forEach(uuid => {
                const url = gltf.parser.json.extras.textureURLs[uuid]
                if (!extractedConfig.textures[uuid]) extractedConfig.textures[uuid] = {}
                extractedConfig.textures[uuid].mapUrl = url
                console.log(`从模型中恢复贴图URL:`, uuid, url)
              })
            }
          }
          
          // 从模型的userData中提取贴图信息
          if (model.userData) {
            // 从全局textureURLs字段中提取
            if (model.userData.textureURLs) {
              if (!extractedConfig.textures) extractedConfig.textures = {}
              
              Object.keys(model.userData.textureURLs).forEach(uuid => {
                const url = model.userData.textureURLs[uuid]
                if (!extractedConfig.textures[uuid]) extractedConfig.textures[uuid] = {}
                extractedConfig.textures[uuid].mapUrl = url
                console.log(`从模型userData提取贴图URL:`, uuid, url)
              })
            }
            
            // 从完整配置中提取
            if (model.userData.fullConfig) {
              extractedConfig = {
                ...extractedConfig,
                ...model.userData.fullConfig
              }
              console.log('从userData合并完整配置:', model.userData.fullConfig)
            }
            
            // 从materials和textures字段提取
            if (model.userData.materials) {
              if (!extractedConfig.materials) extractedConfig.materials = {}
              extractedConfig.materials = {...extractedConfig.materials, ...model.userData.materials}
              console.log('从userData提取材质配置:', model.userData.materials)
            }
            
            if (model.userData.textures) {
              if (!extractedConfig.textures) extractedConfig.textures = {}
              extractedConfig.textures = {...extractedConfig.textures, ...model.userData.textures}
              console.log('从userData提取贴图配置:', model.userData.textures)
            }
          }
          
          // 遍历模型的所有子对象，提取各个对象的userData中的材质和贴图信息
          model.traverse(function(child) {
            if (child.isMesh && child.userData) {
              const uuid = child.uuid;
              
              // 从对象的userData.material中提取
              if (child.userData.material) {
                if (!extractedConfig.materials) extractedConfig.materials = {};
                if (!extractedConfig.materials[uuid]) extractedConfig.materials[uuid] = {};
                
                extractedConfig.materials[uuid] = {
                  ...extractedConfig.materials[uuid],
                  ...child.userData.material
                };
                
                console.log(`从对象userData提取材质配置:`, uuid);
              }
              
              // 从对象的userData.materialMapUrl中提取
              if (child.userData.materialMapUrl) {
                if (!extractedConfig.textures) extractedConfig.textures = {};
                if (!extractedConfig.textures[uuid]) extractedConfig.textures[uuid] = {};
                
                extractedConfig.textures[uuid].mapUrl = child.userData.materialMapUrl;
                console.log(`从对象userData提取贴图URL:`, uuid, child.userData.materialMapUrl);
              }
              
              // 从材质的userData中提取
              if (child.material && child.material.userData) {
                if (child.material.userData.mapUrl) {
                  if (!extractedConfig.textures) extractedConfig.textures = {};
                  if (!extractedConfig.textures[uuid]) extractedConfig.textures[uuid] = {};
                  
                  extractedConfig.textures[uuid].mapUrl = child.material.userData.mapUrl;
                  console.log(`从材质userData提取贴图URL:`, uuid, child.material.userData.mapUrl);
                }
              }
            }
          });
          
          // 将模型存储到全局状态
          chartEditStore.setModelList(props.data.id, modelGroup.value)
          console.log(getModelList, '模型文件')
          
          // 应用配置（优先使用提取的配置）
          const configToApply = {
            ...extractedConfig,
            ...props.config
          }
          
          updateModelWithConfig(configToApply)
        } catch (innerError) {
          console.error('处理模型时出错:', innerError)
        } finally {
          // 完成加载
          isLoading.value = false
        }
      },
      // 加载进度回调
      (xhr) => {
        // console.log(`模型加载进度: ${Math.floor((xhr.loaded / xhr.total) * 100)}%`)
        // message.success(`模型加载进度: ${Math.floor((xhr.loaded / xhr.total) * 100)}%`)
        // 使用naive-ui的message来展示加载进度，只显示一个信息，不断更新它
        const l = Math.floor((xhr.loaded / xhr.total) * 100)
        if (!messageBox.loadingInstance) {
          if(l==100)return
          messageBox.loadingInstance = message.loading(
            `模型加载进度: ${l}%`,
            { duration: 0 }
          )
        } else {
          if(l==100) {
            messageBox.loadingInstance.destroy();
            messageBox.loadingInstance = null;
          }else{
            messageBox.loadingInstance.content = `模型加载进度: ${l}%`
          }
        }
      
      },
      (error) => {
        console.error('加载模型失败:', error)
        isLoading.value = false
      }
    )
  } catch (error) {
    console.error('加载模型失败:', error)
    isLoading.value = false
  }
}

// 根据配置更新模型
const updateModelWithConfig = (config) => {
  if (!modelGroup.value) return
  
  // 添加防抖，避免短时间内多次调用导致性能问题
  if (window.updateModelDebounce) {
    clearTimeout(window.updateModelDebounce);
  }
  
  window.updateModelDebounce = setTimeout(() => {
    console.log('应用模型配置', config);
    
    // 创建材质映射以减少重复遍历查找
    const materialConfigs = config.materials || {};
    const textureConfigs = config.textures || {};
    
    // 创建贴图加载器单例
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous'); // 确保设置跨域处理
    
    // 贴图加载器缓存
    const textureCache = {};
    
    // 遍历模型的所有元素
    modelGroup.value.traverse((child) => {
      if (child.isMesh) {
        const meshId = child.uuid;
        const materialConfig = materialConfigs[meshId];
        const textureConfig = textureConfigs[meshId];
        
        // 如果没有配置，跳过此mesh
        if (!materialConfig && !textureConfig) {
          return;
        }
        
        // 应用材质配置
        if (materialConfig) {
          // 批量应用基本属性，减少触发材质更新的次数
          let needsUpdate = false;
          
          if (materialConfig.color) {
            child.material.color = new Color(materialConfig.color);
            needsUpdate = true;
          }
          
          if (materialConfig.opacity !== undefined) {
            child.material.opacity = materialConfig.opacity;
            child.material.transparent = materialConfig.opacity < 1;
            needsUpdate = true;
          }
          
          if (materialConfig.metalness !== undefined && 'metalness' in child.material) {
            child.material.metalness = materialConfig.metalness;
            needsUpdate = true;
          }
          
          if (materialConfig.roughness !== undefined && 'roughness' in child.material) {
            child.material.roughness = materialConfig.roughness;
            needsUpdate = true;
          }
          
          // 只在有更改时更新材质
          if (needsUpdate) {
            child.material.needsUpdate = true;
          }
        }
        
        // 应用贴图配置
        if (textureConfig) {
          // 如果材质不支持贴图但需要贴图，则替换为标准材质
          if (textureConfig.mapUrl || textureConfig.normalMapUrl || textureConfig.roughnessMapUrl) {
            // 检查当前材质是否支持贴图
            const supportTexture = child.material.type.includes('MeshStandard') || 
                                  child.material.type === 'MeshPhysicalMaterial' || 
                                  child.material.type === 'MeshPhongMaterial';
            
            if (!supportTexture) {
              console.log('材质不支持贴图，升级为MeshStandardMaterial');
              // 创建新的标准材质，保留原有的基本属性
              const newMaterial = new THREE.MeshStandardMaterial({
                color: child.material.color,
                opacity: child.material.opacity,
                transparent: child.material.transparent
              });
              
              // 释放旧材质
              child.material.dispose();
              // 应用新材质
              child.material = newMaterial;
            }
          }
          
          // 获取基础贴图URL (优先使用mapUrl)
          let baseTextureUrl = textureConfig.mapUrl || 
                              (materialConfig && materialConfig.mapUrl) ||
                              (child.material && child.material.map && 
                               child.material.map.userData && 
                               child.material.map.userData.url);
          
          // 应用基础贴图 - 使用缓存避免重复加载
          if (baseTextureUrl) {
            // 检查缓存中是否已存在这个贴图
            if (textureCache[baseTextureUrl]) {
              // 直接使用缓存的贴图
              console.log('使用缓存的贴图:', baseTextureUrl);
              child.material.map = textureCache[baseTextureUrl];
              child.material.needsUpdate = true;
              
              // 保存到材质的userData
              if (!child.material.userData) {
                child.material.userData = {};
              }
              child.material.userData.mapUrl = baseTextureUrl;
            } else {
              // 使用loadTexture函数加载贴图
              console.log('加载贴图:', baseTextureUrl);
              loadTexture(baseTextureUrl, 'map', child, textureLoader, textureCache);
            }
          }
          
          // 应用法线贴图
          if (textureConfig.normalMapUrl) {
            loadTexture(textureConfig.normalMapUrl, 'normalMap', child, textureLoader, textureCache);
          }
          
          // 应用粗糙度贴图
          if (textureConfig.roughnessMapUrl) {
            loadTexture(textureConfig.roughnessMapUrl, 'roughnessMap', child, textureLoader, textureCache);
          }
        }
      }
    });
  }, 50); // 50ms防抖延迟
}

// 优化的贴图加载函数
const loadTexture = (url, textureType, mesh, loader, cache) => {
  if (!url || !mesh) return;
  
  // 如果已经在缓存中，直接使用
  if (cache[url]) {
    mesh.material[textureType] = cache[url];
    mesh.material.needsUpdate = true;
    
    // 保存URL到材质的userData
    if (!mesh.material.userData) {
      mesh.material.userData = {};
    }
    mesh.material.userData[textureType + 'Url'] = url;
    return;
  }
  
  // 处理base64图片数据
  if (url.startsWith('data:image/')) {
    const img = new Image();
    img.onload = () => {
      const texture = new THREE.Texture(img);
      // 保存URL到userData
      texture.userData = { url };
      texture.needsUpdate = true;
      
      // 缓存贴图
      cache[url] = texture;
      
      // 应用贴图到材质
      if (mesh.material && textureType in mesh.material) {
        mesh.material[textureType] = texture;
        mesh.material.needsUpdate = true;
      }
      
      // 保存URL到材质的userData
      if (!mesh.material.userData) {
        mesh.material.userData = {};
      }
      mesh.material.userData[textureType + 'Url'] = url;
    };
    img.src = url;
    return;
  }
  
  // 使用TextureLoader加载贴图
  loader.load(
    url,
    (texture) => {
      // 设置纹理参数
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      
      // 保存URL到userData
      texture.userData = { url };
      texture.needsUpdate = true;
      
      // 缓存贴图
      cache[url] = texture;
      
      // 应用贴图到材质
      if (mesh.material && textureType in mesh.material) {
        mesh.material[textureType] = texture;
        mesh.material.needsUpdate = true;
      }
      
      // 保存URL到材质的userData
      if (!mesh.material.userData) {
        mesh.material.userData = {};
      }
      mesh.material.userData[textureType + 'Url'] = url;
    },
    undefined,
    (error) => {
      console.error(`加载${textureType}贴图失败:`, error);
      
      // 错误恢复：尝试使用Image元素加载
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvasTexture = new THREE.Texture(img);
        // 保存URL到userData
        canvasTexture.userData = { url };
        canvasTexture.needsUpdate = true;
        
        // 缓存贴图
        cache[url] = canvasTexture;
        
        // 应用贴图到材质
        if (mesh.material && textureType in mesh.material) {
          mesh.material[textureType] = canvasTexture;
          mesh.material.needsUpdate = true;
        }
        
        // 保存URL到材质的userData
        if (!mesh.material.userData) {
          mesh.material.userData = {};
        }
        mesh.material.userData[textureType + 'Url'] = url;
      };
      
      img.onerror = () => {
        console.error('备用方法也无法加载图片');
      };
      
      img.src = url;
    }
  );
};

// 重置模型到原始状态
const resetModel = () => {
  if (modelCache.value && props.data.id) {
    modelGroup.value = cloneDeep(modelCache.value)
    chartEditStore.setModelList(props.data.id, modelGroup.value)
  }
}

// 爆炸相关
const distance = ref(1) //距离
const speed = ref(3000) //时间
const twGroup = new TWEEN.Group()
const diguiexplode = function (obj) {
  obj.children?.forEach((child, index) => {
    const origin = cloneDeep(child.position)
    child.userData.explode = {
      state: false,
      explode: origin
    }
    if (child.isMesh) {
      const boundingBox = new THREE.Box3().setFromObject(child)
      const childCenter = new THREE.Vector3()
      boundingBox.getCenter(childCenter)
      const pos = childCenter.multiplyScalar(distance.value)
      twGroup.add(
        new TWEEN.Tween(origin)
          .to(pos, speed.value)
          .onUpdate(val => {
            child.position.copy(val)
          })
          .start()
          .onComplete(val => {})
      )
    }
    child.children?.length && diguiexplode(child)
  })
}
const diguidisintegrate = function (obj) {
  obj.children.forEach((child, index) => {
    if (child.isMesh) {
      const boundingBox = new THREE.Box3().setFromObject(child)
      const childCenter = new THREE.Vector3()
      boundingBox.getCenter(childCenter)
      // let pos = childCenter.multiplyScalar(2);
      twGroup.add(
        new TWEEN.Tween(childCenter)
          .to(new THREE.Vector3(0, 0, 0), speed.value)
          .onUpdate(val => {
            child.position.copy(val)
          })
          .start()
          .onComplete(val => {})
      )
    }

    child.children?.length && diguidisintegrate(child)
  })
}
// 还原
const disintegrate = function () {
  if (disintegrateBoos) return
  diguidisintegrate(modelGroup.value)
}
// 爆炸
const explode = function () {
  if (explodeBoos) return
  diguiexplode(modelGroup.value)
}
watch(
  () => props.url,
  async () => {
    if (props.url) {
      await loadModel(props.url)
    }
  },
  { deep: true, immediate: true }
)

// 刷新轮廓线 - 移除旧的并重新添加新的
const refreshOutlines = () => {
  // 首先移除所有现有轮廓线
  removeAllOutlines();
  
  // 如果有选中的mesh，重新添加轮廓线
  if (selectedMeshId.value) {
    // 使用定时器确保在删除轮廓线后再添加新的
    setTimeout(() => {
      const currentId = selectedMeshId.value;
      // 短暂切换状态触发watch
      selectedMeshId.value = null;
      
      // 再次短暂延迟，确保清除操作完成
      setTimeout(() => {
        selectedMeshId.value = currentId;
      }, 50);
    }, 50);
  }
};

// 监听配置变化
watch(
  () => props.config,
  (newConfig) => {
    if (newConfig && modelGroup.value) {
      // 先移除所有轮廓线，防止配置更新时产生冲突
      removeAllOutlines();
      
      // 应用新配置
      updateModelWithConfig(newConfig);
      
      // 配置更新后，刷新高亮效果
      refreshOutlines();
    }
  },
  { deep: true }
);

let explodeBoos = false
let disintegrateBoos = false
watch(
  () => props.styles,
  e => {
    const { explosion = {} } = e
    const { disintegrate: disintegrateBoo, explode: explodeBoo, distances, speed: speeds } = explosion
    explodeBoo && explode()
    disintegrateBoo && disintegrate()
    distance.value = distances
    speed.value = speeds
    explodeBoos = explodeBoo
    disintegrateBoos = disintegrateBoo
  },
  { deep: true, immediate: true }
)
const { onLoop } = useRenderLoop()
onLoop(({ delta }) => {
  // 使用requestAnimationFrame的节流机制，避免过于频繁的更新
  if (!window.requestAnimationFrameThrottled) {
    window.requestAnimationFrameThrottled = true;
    
    // 使用requestAnimationFrame包装更新，确保与浏览器渲染周期同步
    requestAnimationFrame(() => {
      // 更新爆炸动画组 - 只在有活动动画时更新
      if (twGroup && twGroup.getAll().length > 0) {
        twGroup.update();
      }
      
      // 只在有轮廓线时才进行更新
      if (currentOutlines.size > 0) {
        // 优化：使用forEach迭代而不是for循环，避免额外的索引计算
        currentOutlines.forEach((outline) => {
          if (outline && outline.targetMesh) {
            // 更新位置和旋转
            outline.position.copy(outline.targetMesh.position);
            outline.rotation.copy(outline.targetMesh.rotation);
            
            // 优化：只在有动画数据时更新动画
            if (outline.animationData) {
              const data = outline.animationData;
              
              // 简单的来回脉冲逻辑
              data.scale += data.direction;
              
              // 达到边界则反转方向
              if (data.scale >= 1.14) {
                data.scale = 1.14;
                data.direction = -0.005;
              } else if (data.scale <= 1.06) {
                data.scale = 1.06;
                data.direction = 0.005;
              }
              
              // 应用脉冲比例
              outline.scale.copy(outline.targetMesh.scale).multiplyScalar(data.scale);
            }
          }
        });
      }
      
      // 重置节流标志
      window.requestAnimationFrameThrottled = false;
    });
  }
})

// 清理AuxScene图层
const cleanupAuxScenes = (model) => {
  // 查找并列出所有的AuxScene图层和其他辅助对象
  const objectsToRemove = [];
  
  // 首先检查特殊情况：第一层只有一个无名组，里面再包含AuxScene和实际内容
  // 这通常是之前导出模型时产生的多余嵌套
  if (model.children.length === 1 && 
      model.children[0].type === 'Group' && 
      (!model.children[0].name || model.children[0].name === '')) {
    
    console.log('检测到导入模型可能有嵌套问题:');
    
    // 检查内部子对象
    const innerGroup = model.children[0];
    let hasAuxScene = false;
    
    // 扫描查找是否有典型的AuxScene
    innerGroup.traverse(obj => {
      if (obj.name && obj.name.includes('AuxScene')) {
        hasAuxScene = true;
      }
    });
    
    if (hasAuxScene) {
      console.log('确认存在典型的AuxScene嵌套问题，将进行修复');
      
      // 收集所有非AuxScene的子对象
      const validChildren = [];
      innerGroup.children.forEach(child => {
        if (!(child.name && child.name.includes('AuxScene'))) {
          validChildren.push(child);
        }
      });
      
      if (validChildren.length > 0) {
        console.log(`找到${validChildren.length}个有效子对象，将替换当前结构`);
        
        // 移除无名组
        model.remove(innerGroup);
        
        // 添加有效子对象到模型根节点
        validChildren.forEach(child => {
          innerGroup.remove(child);
          model.add(child);
        });
        
        console.log('导入模型结构已修复');
        
        // 已经处理了特殊情况，可以返回了
        return;
      }
    }
  }
  
  // 执行常规的清理过程
  model.traverse(function(object) {
    // 检查是否是辅助对象
    const shouldRemove = (
      // AuxScene或CleanedModel对象
      (object.name && (object.name.includes('AuxScene') || object.name.includes('CleanedModel'))) ||
      // 标记为临时占位的对象
      (object.name && object.name.includes('Placeholder') && object !== model) ||
      // 空容器对象 - 没有mesh子对象也没有任何特性的空组
      (object.type === 'Group' && 
       object.children.length === 0 && 
       object !== model &&
       !object.name) ||
      // 轮廓线对象
      (object.isOutline || 
       (object.userData && (object.userData.isOutline || object.userData.isSelectionEffect)) ||
       (object.type === 'LineSegments' && object.material && 
        object.material.type === 'LineBasicMaterial' && 
        object.material.color && object.material.color.getHex && 
        object.material.color.getHex() === 0x00ffff))
    );
    
    if (shouldRemove && object !== model) {
      objectsToRemove.push(object);
    }
  });
  
  if (objectsToRemove.length > 0) {
    console.log(`找到 ${objectsToRemove.length} 个需要移除的辅助对象`);
    
    // 从模型中移除辅助对象
    objectsToRemove.forEach(obj => {
      if (obj.parent) {
        obj.parent.remove(obj);
        console.log('从模型中移除辅助对象:', obj.name || obj.type);
      }
    });
  }
  
  // 添加保护：如果清理后模型为空，添加一个新的空组以避免问题
  if (!model.children || model.children.length === 0) {
    console.warn('清理后模型变为空，添加保护组');
    const safetyGroup = new THREE.Group();
    safetyGroup.name = "SafetyGroup";
    model.add(safetyGroup);
  }
}

defineExpose({
  loadModel,
  updateModelWithConfig,
  resetModel
})
</script>

<style lang="scss" scoped></style>

<!--
 * @Descripttion: 
 * @version: 1.0
 * @Author: Teemor
 * @Date: 2024-11-26 10:46:57
 * @LastEditors: Teemor 232957726@qq.com
 * @LastEditTime: 2025-05-08 15:17:59
-->
<template>
  <primitive v-if="modelGroup" :object="modelGroup" />
</template>
<script setup>
import { ref, watch, onMounted, shallowRef, nextTick, computed } from 'vue'
import { Group, Mesh, Color, MeshStandardMaterial } from 'three'
import { useGLTF } from '@tresjs/cientos'
import { useTresContext, useRenderLoop } from '@tresjs/core'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import cloneDeep from 'lodash/cloneDeep'
import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'

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

// 加载模型
const loadModel = async url => {
  try {
    const gltf = await useGLTF(url)
    if (gltf.scene) {
      // 保存原始模型数据的副本作为缓存
      modelCache.value = cloneDeep(gltf.scene)
      
      // 设置当前模型
      modelGroup.value = gltf.scene
      
      // 将模型存储到全局状态
      chartEditStore.setModelList(props.data.id, modelGroup.value)
      console.log(getModelList, '模型文件')
      
      // 应用配置
      if (props.config) {
        updateModelWithConfig(props.config)
      }
    }
  } catch (error) {
    console.error('加载模型失败:', error)
  }
}

// 根据配置更新模型
const updateModelWithConfig = (config) => {
  if (!modelGroup.value) return
  
  console.log('应用模型配置:', config)
  
  // 遍历模型的所有元素
  modelGroup.value.traverse((child) => {
    if (child.isMesh) {
      console.log('处理Mesh:', child.uuid)
      
      // 应用材质配置
      if (config.materials && config.materials[child.uuid]) {
        const materialConfig = config.materials[child.uuid]
        console.log('应用材质配置:', materialConfig)
        
        if (materialConfig.color) {
          child.material.color = new Color(materialConfig.color)
        }
        
        if (materialConfig.opacity !== undefined) {
          child.material.opacity = materialConfig.opacity
          child.material.transparent = materialConfig.opacity < 1
        }
        
        if (materialConfig.metalness !== undefined) {
          child.material.metalness = materialConfig.metalness
        }
        
        if (materialConfig.roughness !== undefined) {
          child.material.roughness = materialConfig.roughness
        }
        
        // 确保更新材质
        child.material.needsUpdate = true
      }
      
      // 应用贴图配置
      if (config.textures && config.textures[child.uuid]) {
        const textureConfig = config.textures[child.uuid]
        console.log('应用贴图配置:', textureConfig)
        
        // 如果材质不支持贴图但需要贴图，则替换为标准材质
        if (textureConfig && (textureConfig.mapUrl || textureConfig.normalMapUrl || textureConfig.roughnessMapUrl)) {
          // 检查当前材质是否支持贴图
          const supportTexture = child.material.type.includes('MeshStandard') || 
                                child.material.type === 'MeshPhysicalMaterial' || 
                                child.material.type === 'MeshPhongMaterial'
          
          if (!supportTexture) {
            console.log('材质不支持贴图，升级为MeshStandardMaterial')
            // 创建新的标准材质，保留原有的基本属性
            const newMaterial = new THREE.MeshStandardMaterial({
              color: child.material.color,
              opacity: child.material.opacity,
              transparent: child.material.transparent
            })
            
            // 释放旧材质
            child.material.dispose()
            // 应用新材质
            child.material = newMaterial
          }
        }
        
        // 加载并应用贴图的函数
        const applyTexture = (textureUrl, textureType) => {
          if (!textureUrl) {
            console.warn(`未提供${textureType}贴图URL，跳过加载`)
            return
          }
          
          console.log(`开始加载${textureType}贴图:`, textureUrl)
          
          // 处理base64图片数据
          if (textureUrl.startsWith('data:image/')) {
            console.log(`${textureType}贴图是Base64格式，直接创建纹理`)
            const img = new Image()
            img.onload = () => {
              const texture = new THREE.Texture(img)
              // 保存URL到userData
              texture.userData = { url: textureUrl }
              texture.needsUpdate = true
              
              // 应用贴图到材质
              if (child.material && textureType in child.material) {
                child.material[textureType] = texture
                child.material.needsUpdate = true
                console.log(`${textureType} Base64贴图应用成功`)
              }
            }
            img.src = textureUrl
            return
          }
          
          try {
            // 使用TextureLoader加载贴图
            const textureLoader = new THREE.TextureLoader()
            textureLoader.setCrossOrigin('anonymous') // 确保设置跨域处理
            
            textureLoader.load(
              textureUrl,
              (texture) => {
                console.log(`${textureType}贴图加载成功`)
                
                // 设置纹理参数
                texture.wrapS = THREE.RepeatWrapping
                texture.wrapT = THREE.RepeatWrapping
                
                // 保存URL到userData
                texture.userData = texture.userData || {}
                texture.userData.url = textureUrl
                
                texture.needsUpdate = true
                
                // 应用贴图到材质
                if (child.material && textureType in child.material) {
                  child.material[textureType] = texture
                  child.material.needsUpdate = true
                  console.log(`${textureType}贴图已应用成功`)
                } else {
                  console.warn(`材质不支持${textureType}贴图，尝试升级材质`)
                  
                  // 如果材质不支持贴图，尝试升级为标准材质
                  if (child.material && !(child.material instanceof THREE.MeshStandardMaterial)) {
                    console.log('自动升级为标准材质以支持贴图')
                    const newMaterial = new THREE.MeshStandardMaterial({
                      color: child.material.color,
                      opacity: child.material.opacity,
                      transparent: child.material.transparent
                    })
                    
                    // 释放旧材质
                    child.material.dispose()
                    // 应用新材质
                    child.material = newMaterial
                    
                    // 再次尝试应用贴图
                    if (textureType in child.material) {
                      child.material[textureType] = texture
                      child.material.needsUpdate = true
                      console.log(`${textureType}贴图在升级材质后应用成功`)
                    } else {
                      console.error(`升级材质后仍无法应用${textureType}贴图`)
                    }
                  }
                }
              },
              // 加载进度回调
              (xhr) => {
                console.log(`${textureType}贴图加载进度: ${Math.floor((xhr.loaded / xhr.total) * 100)}%`)
              },
              (error) => {
                console.error(`加载${textureType}贴图失败:`, error, textureUrl, '尝试备用方案')
                
                // 错误恢复：尝试使用Image元素加载
                const img = new Image()
                img.crossOrigin = 'anonymous' // 确保设置跨域
                
                img.onload = () => {
                  console.log('通过Image元素成功加载了图片')
                  const canvasTexture = new THREE.Texture(img)
                  
                  // 保存URL到userData
                  canvasTexture.userData = { url: textureUrl }
                  
                  canvasTexture.needsUpdate = true
                  
                  if (child.material && textureType in child.material) {
                    child.material[textureType] = canvasTexture
                    child.material.needsUpdate = true
                    console.log(`${textureType}贴图通过备用方法应用成功`)
                  }
                }
                
                img.onerror = () => {
                  console.error('备用方法也无法加载图片，尝试最终备用方案')
                  
                  // 最终备用方案：如果是颜色贴图，创建纯色纹理
                  if (textureType === 'map' && child.material) {
                    try {
                      console.log('使用颜色纹理作为最终备用')
                      const canvas = document.createElement('canvas')
                      canvas.width = 1
                      canvas.height = 1
                      const ctx = canvas.getContext('2d')
                      ctx.fillStyle = child.material.color.getStyle()
                      ctx.fillRect(0, 0, 1, 1)
                      
                      const backupTexture = new THREE.CanvasTexture(canvas)
                      child.material.map = backupTexture
                      child.material.needsUpdate = true
                      console.log('应用了纯色纹理作为最终备用')
                    } catch (backupError) {
                      console.error('所有备用方案都失败:', backupError)
                    }
                  }
                }
                
                img.src = textureUrl
              }
            )
          } catch (e) {
            console.error(`应用${textureType}贴图过程中发生错误:`, e)
          }
        }
        
        // 应用不同类型的贴图
        
        // 获取基础贴图URL (优先使用mapUrl，如果没有则尝试使用map)
        let baseTextureUrl = null
        
        // 1. 从textures配置中获取mapUrl
        if (textureConfig.mapUrl) {
          baseTextureUrl = textureConfig.mapUrl
          console.log('从textures配置中获取mapUrl:', baseTextureUrl)
        }
        
        // 2. 从materials配置中获取mapUrl
        if (!baseTextureUrl && config.materials && config.materials[child.uuid] && config.materials[child.uuid].mapUrl) {
          baseTextureUrl = config.materials[child.uuid].mapUrl
          console.log('从materials配置中获取mapUrl:', baseTextureUrl)
        }
        
        // 3. 如果仍然没有找到，但有map字段，则使用map
        if (!baseTextureUrl && typeof child.material.map === 'string') {
          baseTextureUrl = child.material.map
          console.log('使用材质的map字段作为URL:', baseTextureUrl)
        }
        
        // 4. 如果mesh材质已有map贴图且有userData.url，使用它
        if (!baseTextureUrl && child.material.map && child.material.map.userData && child.material.map.userData.url) {
          baseTextureUrl = child.material.map.userData.url
          console.log('从材质的map.userData中获取URL:', baseTextureUrl)
        }
        
        // 应用基础贴图
        if (baseTextureUrl) {
          applyTexture(baseTextureUrl, 'map')
        }
        
        // 应用其他类型的贴图
        if (textureConfig.normalMapUrl) {
          applyTexture(textureConfig.normalMapUrl, 'normalMap')
        }
        
        if (textureConfig.roughnessMapUrl) {
          applyTexture(textureConfig.roughnessMapUrl, 'roughnessMap')
        }
      }
      
      // 应用变换配置
      if (config.transforms && config.transforms[child.uuid]) {
        const transformConfig = config.transforms[child.uuid]
        console.log('应用变换配置:', transformConfig)
        
        if (transformConfig.position) {
          child.position.set(
            transformConfig.position.x || child.position.x,
            transformConfig.position.y || child.position.y,
            transformConfig.position.z || child.position.z
          )
        }
        
        if (transformConfig.rotation) {
          child.rotation.set(
            transformConfig.rotation.x || child.rotation.x,
            transformConfig.rotation.y || child.rotation.y,
            transformConfig.rotation.z || child.rotation.z
          )
        }
        
        if (transformConfig.scale) {
          child.scale.set(
            transformConfig.scale.x || child.scale.x,
            transformConfig.scale.y || child.scale.y,
            transformConfig.scale.z || child.scale.z
          )
        }
      }
    }
  })
}

// 重置模型到原始状态
const resetModel = () => {
  if (modelCache.value && props.data.id) {
    modelGroup.value = cloneDeep(modelCache.value)
    chartEditStore.setModelList(props.data.id, modelGroup.value)
  }
}

//爆炸相关
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

// 监听配置变化
watch(
  () => props.config,
  (newConfig) => {
    if (newConfig && modelGroup.value) {
      updateModelWithConfig(newConfig)
    }
  },
  { deep: true }
)

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
  twGroup?.update()
  //循环render
})
defineExpose({
  loadModel,
  updateModelWithConfig,
  resetModel
})
</script>

<style lang="scss" scoped></style>

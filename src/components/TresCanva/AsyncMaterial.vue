<script setup lang="ts">
import { ref, onMounted, PropType, watch } from 'vue'
import * as THREE from 'three'
import { useTexture } from '@tresjs/core';
import { materialList, textureKeys } from '@/packages/public/chart'

// 类型定义
interface MaterialConfig { [key: string]: any; }
interface MaterialItem { 
  type: string; 
  config: MaterialConfig; 
  key?: string | number;
  textureType?: string; 
}

const props = defineProps({
  item: { type: Object as PropType<MaterialItem>, required: true },
})

const materialData = ref({});
const componentKey = ref(0);

// 1. 添加贴图缓存
const textureCache = {};

const loadTextureWithCache = async (url) => {
  // 移除时间戳参数以便缓存
  const baseUrl = url.split('?')[0];
  
  if (!textureCache[baseUrl]) {
    console.log('加载新贴图:', baseUrl);
    const texture = await useTexture(url);
    
    // 优化贴图设置
    texture.generateMipmaps = false; // 禁用mipmap生成
    texture.minFilter = THREE.LinearFilter; // 使用简单过滤
    texture.anisotropy = 1; // 降低各向异性过滤
    
    textureCache[baseUrl] = texture;
  }
  
  return textureCache[baseUrl];
};

// 2. 清理和优化getData函数
const getData = async() => {
  if (!props.item || !props.item.config) return;
  
  let obj = {};
  let hasTextureChanges = false;
  
  // 检查是否需要更新贴图
  for (let key in props.item.config) {
    if (textureKeys.includes(key)) {
      const currentValue = props.item.config[key];
      const previousValue = materialData.value?.[key]?.source?.data?.src;
      
      if (currentValue && (!previousValue || !previousValue.includes(currentValue))) {
        obj[key] = currentValue;
        hasTextureChanges = true;
      }
    }
  }
  
  // 只在贴图真正变化时才更新
  if (hasTextureChanges) {
    console.log('贴图已变化，更新材质');
    
    // 加载所有贴图
    const newTextures = {};
    for (let key in obj) {
      if (textureKeys.includes(key) && obj[key]) {
        newTextures[key] = await loadTextureWithCache(obj[key]);
      }
    }
    
    // 更新材质
    materialData.value = {...props.item.config, ...newTextures};
    
    // 确保材质更新
    componentKey.value++;
  }
};

// 加载和准备材质数据
const prepareMaterial = async () => {
  try {
    // 基本检查
    if (!props.item || !props.item.config) {
      console.warn('缺少材质配置');
      return;
    }
    
    const config = { ...props.item.config };
    
    // 收集贴图配置
    const textureConfig = {};
    
    for (const key in config) {
      if (textureKeys.includes(key) && config[key]) {
        // 添加时间戳避免缓存
        if (typeof config[key] === 'string' && config[key].includes('http')) {
          textureConfig[key] = config[key] + (config[key].includes('?') ? '&' : '?') + 'v=' + Date.now();
        } else {
          textureConfig[key] = config[key];
        }
      }
    }
    
    // 加载贴图
    if (Object.keys(textureConfig).length > 0) {
      try {
        const textures = await useTexture(textureConfig);
        
        // 处理贴图
        for (const key in textures) {
          if (textures[key] && textures[key].isTexture) {
            // 设置贴图需要更新
            textures[key].needsUpdate = true;
            
            // 特别处理自发光贴图
            if (key === 'emissiveMap') {
              // 确保自发光贴图有正确的UV设置
              textures[key].wrapS = THREE.RepeatWrapping;
              textures[key].wrapT = THREE.RepeatWrapping;
            }
          }
        }
        
        // 合并配置
        materialData.value = {
          ...config,
          ...textures,
        };
        
        // 如果有自发光贴图，确保设置发光颜色
        if (textures.emissiveMap) {
          materialData.value.emissive = new THREE.Color(0xffffff);
          materialData.value.emissiveIntensity = 1.0;
        }
      } catch (error) {
        console.error('贴图加载错误:', error);
        materialData.value = config;
      }
    } else {
      materialData.value = config;
    }
    
    // 强制重新渲染
    componentKey.value++;
    
  } catch (error) {
    console.error('材质准备错误:', error);
  }
};

// 监听配置变化
watch(() => props.item, prepareMaterial, { deep: true, immediate: true });

// 初始化
onMounted(prepareMaterial);
</script>

<template>
  <component
    v-if="props.item && props.item.type"
    :is="'Tres' + props.item.type"
    :key="componentKey"
    v-bind="materialData"
  />
</template>
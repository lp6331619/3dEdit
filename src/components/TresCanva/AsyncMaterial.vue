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
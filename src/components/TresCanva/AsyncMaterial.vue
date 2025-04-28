<script setup lang="ts">
import { ref, onMounted, PropType, shallowRef, watch } from 'vue'
import * as THREE from 'three'
import { useTexture, useRenderLoop } from '@tresjs/core';
import { materialList ,materialTextureTypes,textureKeys} from '@/packages/public/chart'
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

// 使用 shallowRef 存储最终的材质属性
const materialProps = shallowRef<MaterialConfig>({});
const isReady = ref(false);

// 处理材质属性的函数
const updateMaterialProps = () => {
  console.log(`处理材质: ${props.item.type}`, props.item);
  // 检查 item 是否是材质类型
  let types = materialList.map((item)=>{
    return item.value
  })
  //说明一定是材质
  if(types.includes(props.item.type)){
    if (textureKeys.includes(props.item.textureType)) {
      isReady.value = false;
    }
  }else{
    // 直接使用配置对象
    materialProps.value = { ...props.item.config };
    isReady.value = true;
  }
};
// 生命周期钩子
onMounted(() => {
  updateMaterialProps();
  getData()
});
const pbrTexture = ref()
const getData = async()=>{
  let obj = {}
   for(let ii in props.item.config){
    textureKeys[ii] && (obj[ii]=props.item.config[ii])
   }
   pbrTexture.value = await useTexture({
    ...obj
  });
  pbrTexture.value = {...props.item.config,...pbrTexture.value}
}
// 监听属性变化
watch(() => props.item, updateMaterialProps, { deep: true });
</script>

<template>
  <component
    v-if="isReady"
    :is="'Tres' + props.item.type"
    v-bind="materialProps"
  >
  </component>
  <TresMeshStandardMaterial
    v-if="pbrTexture"
      v-bind="pbrTexture"
      displacement-scale="0.2"
  />
</template>
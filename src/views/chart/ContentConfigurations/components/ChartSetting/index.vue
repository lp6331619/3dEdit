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
      <Mesh :material="currentMesh.material" @update:material="handleMaterialUpdate" />
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
import Mesh from '@/packages/components/Graphic/Model/Mesh/config.vue'
import { deepClone } from '@/utils'
const { targetData, chartEditStore } = useTargetData()
const getModeList = chartEditStore.getModelList
const currentModel = computed(() => chartEditStore.getCurrentModel)
const targetChart = chartEditStore.getTargetChart
const editModel = () => {
  chartEditStore.setCurrentModel(deepClone(targetData.value))
}
const findByUUID = (obj:any, targetUUID:string) =>{
  if (!obj) return null;
  // 先判断当前对象
  if (obj.uuid === targetUUID) {
    return obj;
  }
  // 如果有 children，递归查找
  if (Array.isArray(obj.children)) {
    for (const child of obj.children) {
      const found = findByUUID(child, targetUUID);
      if (found) return found;
    }
  }
  return null;
}
//当前选择的
const currentMesh = shallowRef(null)
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
  // if (!currentModel.value?.id || !currentMesh.value) return
  // const obj = getModeList[currentModel.value.id]
  // const [f] = selectId.value
  // const updateMaterialByUUID = (obj: any, targetUUID: string, newMaterial: any): any => {
  //   // 如果对象不存在，直接返回
  //   if (!obj) return obj;

  //   // 如果当前对象的uuid匹配，替换material
  //   if (obj.uuid === targetUUID) {
  //     obj.material = newMaterial;
  //     return obj;
  //   }

  //   // 如果有children，递归查找并替换
  //   if (Array.isArray(obj.children)) {
  //     obj.children = obj.children.map((child: any) => updateMaterialByUUID(child, targetUUID, newMaterial));
  //   }

  //   return obj;
  // };
  // // 使用该函数更新material
  // const res = updateMaterialByUUID(obj, f, newMaterial);
  // chartEditStore.setModelList(currentModel.value.id, res)
}
const submitEditModel = () => {
  // if (!currentModel.value?.id) return
  // // 更新模型列表
  // chartEditStore.setModelList({
  //   ...getModeList,
  //   [currentModel.value.id]: getModeList[currentModel.value.id]
  // })
  // // 更新组件列表
  // const targetChart = chartEditStore.getTargetChart
  // const index = targetChart.componentList.findIndex((item: any) => item.id === currentModel.value.id)
  // if (index !== -1) {
  //   targetChart.componentList[index] = {
  //     ...targetChart.componentList[index],
  //     option: getModeList[currentModel.value.id]
  //   }
  // }
  // 清除当前编辑状态
  chartEditStore.setCurrentModel(undefined)
}
</script>

<style lang="scss" scoped>
@include go('chart-configurations-setting') {
}
</style>

<!--
 * @Author: sorry 247076126@qq.com
 * @Date: 2024-10-12 14:14:11
 * @LastEditors: Teemor 232957726@qq.com
 * @LastEditTime: 2025-04-23 10:10:39
 * @FilePath: \3DThreeEdit\src\views\chart\ContentConfigurations\components\ChartSetting\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <div class="go-chart-configurations-setting" v-if="targetData">
    <!-- 名称 -->
    <name-setting :chartConfig="targetData.chartConfig"></name-setting>
    <!-- 尺寸 -->
    <size-setting
      v-if="targetData.type != 'TresMesh' && !targetData.isGroup && targetData.type != 'GLTFModel'"
      :isGroup="targetData.isGroup"
      :chartAttr="targetData.attr"
    ></size-setting>
    <!-- 位置 -->
    <position-setting :position="targetData.option?.position" :canvasConfig="chartEditStore.getEditCanvasConfig" />
    <!-- 滤镜 -->
    <!-- <styles-setting :isGroup="targetData.isGroup" :chartStyles="targetData.styles"></styles-setting> -->
    <div v-if="targetData.type=='GLTFModel'">
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
    <!-- 自定义配置项 -->
    <component
      :is="targetData.chartConfig.conKey"
      :optionData="targetData.option"
      :childrenData="targetData.children || []"
    ></component>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NameSetting, PositionSetting, SizeSetting, StylesSetting } from '@/components/Pages/ChartItemSetting'
import { useTargetData } from '../hooks/useTargetData.hook'
import { deepClone } from '@/utils'
const { targetData, chartEditStore } = useTargetData()
const currentModel = computed(() => chartEditStore.getCurrentModel)
const editModel = () => {
  chartEditStore.setCurrentModel(deepClone(targetData.value))
}
const cancelEditModel = () => {
  chartEditStore.setCurrentModel(undefined)
}
const submitEditModel = () => {
  console.log(currentModel.value)
}
</script>

<style lang="scss" scoped>
@include go('chart-configurations-setting') {
}
</style>

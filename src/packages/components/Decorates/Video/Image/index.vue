<template>
  <div :style="getStyle(borderRadius)" class="relative">
    <img :src="sign" v-if="isOut" class="sign" />
    <img
      :object-fit="fit"
      preview-disabled
      :src="option.dataset"
      :fallback-src="requireErrorImg()"
      :width="w"
      :height="h"
      lazy
    />
  </div>
</template>

<script setup lang="ts">
import { PropType, shallowReactive, watch, toRefs, ref } from 'vue'
import { requireErrorImg } from '@/utils'
import { useChartDataFetch } from '@/hooks'
import { CreateComponentType } from '@/packages/index.d'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import sign from '@/assets/images/sign.png'
const props = defineProps({
  chartConfig: {
    type: Object as PropType<CreateComponentType>,
    required: true
  }
})

const { w, h } = toRefs(props.chartConfig.attr)
const { dataset, fit, borderRadius } = toRefs(props.chartConfig.option)

const option = shallowReactive({
  dataset: ''
})
const isOut = ref(false)
watch(
  () => props.chartConfig.thoroughfare?.OutPutDefaultIds,
  (newData: any) => {
    isOut.value = newData?.length
  },
  {
    immediate: true,
    deep: false
  }
)
const getStyle = (radius: number) => {
  return {
    borderRadius: `${radius}px`,
    overflow: 'hidden'
  }
}

// 编辑更新
watch(
  () => props.chartConfig.option.dataset,
  (newData: any) => {
    option.dataset = newData
  },
  {
    immediate: true
  }
)

// 预览更新
useChartDataFetch(props.chartConfig, useChartEditStore, (newData: any) => {
  option.dataset = newData
})
</script>

<style lang="scss" scoped>
.sign {
  position: absolute;
  right: 0;
  top: 0;
  width: 30px;
}
</style>

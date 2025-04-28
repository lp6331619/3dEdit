<template>
  <div class="go-text-box">
    <div class="content">
      <ThoroughFare :chartConfig="chartConfig" />
      <template v-if="option.isDynamics">
        <div v-for="(item, i) in option.dataList" :key="item.cnlNum">{{ item.label }}:{{ item.val }}</div>
      </template>
      <template v-else>
        <span style="cursor: pointer; white-space: pre-wrap" v-if="link" @click="click">{{ option.dataset }}</span>
        <span style="white-space: pre-wrap" v-else>{{ option.dataset }}</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import ThoroughFare from '@/packages/components/Decorates/Components/thoroughfare.vue'
import { PropType, toRefs, computed, shallowReactive, watch, ref } from 'vue'
import { CreateComponentType } from '@/packages/index.d'
import { useChartDataFetch } from '@/hooks'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { option as configOption } from './config'
// import sign from '@/assets/images/sign.png'
const props = defineProps({
  chartConfig: {
    type: Object as PropType<CreateComponentType & typeof option>,
    required: true
  }
})

const {
  linkHead,
  link,
  fontColor,
  fontSize,
  letterSpacing,
  paddingY,
  paddingX,
  textAlign,
  borderWidth,
  borderColor,
  borderRadius,
  writingMode,
  backgroundColor,
  fontWeight
} = toRefs(props.chartConfig.option)



const option = shallowReactive({
  isDynamics: configOption.isDynamics,
  dataset: configOption.dataset,
  dataList: configOption.dataList
})

// 手动更新
watch(
  () => props.chartConfig.option.dataset,
  (newData: any) => {
    option.dataset = newData
  },
  {
    immediate: true,
    deep: false
  }
)
watch(
  () => props.chartConfig.option.isDynamics,
  (newData: any) => {
    option.isDynamics = newData
  },
  {
    immediate: true,
    deep: false
  }
)
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
watch(
  () => props.chartConfig.option.dataList,
  (newData: any) => {
    option.dataList = newData
  },
  {
    immediate: true,
    deep: false
  }
)
// 预览更新
useChartDataFetch(props.chartConfig, useChartEditStore, (newData: string) => {
  option.dataset = newData
})

//打开链接
const click = () => {
  window.open(linkHead.value + link.value)
}
</script>

<style lang="scss" scoped>
.sign {
  position: absolute;
  right: 0;
  top: 0;
  width: 30px;
}
@include go('text-box') {
  display: flex;
  align-items: center;
  justify-content: v-bind('textAlign');
  overflow: hidden;

  .content {
    color: v-bind('fontColor');
    padding: v-bind('`${paddingY}px ${paddingX}px`');
    font-size: v-bind('fontSize + "px"');
    letter-spacing: v-bind('letterSpacing + "px"');
    writing-mode: v-bind('writingMode');
    font-weight: v-bind('fontWeight');
    border-style: solid;
    border-width: v-bind('borderWidth + "px"');
    border-radius: v-bind('borderRadius + "px"');
    border-color: v-bind('borderColor');

    background-color: v-bind('backgroundColor');
  }
}
</style>

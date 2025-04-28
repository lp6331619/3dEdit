<template>
  <div class="go-text-box">
    <div class="content">
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
import { PropType, toRefs, shallowReactive, watch, computed, ref } from 'vue'
import { CreateComponentType } from '@/packages/index.d'
import { useChartDataFetch } from '@/hooks'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { option as configOption } from './config'
import { values } from 'lodash'

const props = defineProps({
  chartConfig: {
    type: Object as PropType<CreateComponentType & typeof option>,
    required: true
  }
})

const { w } = toRefs(props.chartConfig.attr)

const { fontColor, fontSize, letterSpacing, fontWeight, animationTime, animationSpeed, boxShadow } = toRefs(
  props.chartConfig.option
)

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
//阴影
watch(
  props.chartConfig.option,
  () => {
    try {
      if (props.chartConfig.option.showShadow) {
        boxShadow.value = `${props.chartConfig.option.hShadow}px ${props.chartConfig.option.vShadow}px ${props.chartConfig.option.blurShadow}px ${props.chartConfig.option.colorShadow}`
      } else {
        boxShadow.value = 'none'
      }
    } catch (error) {
      console.log(error)
    }
  },
  {
    immediate: true
  }
)

const transitionDuration = computed(() => {
  return Math.floor((w.value as any) / (animationSpeed.value as any))
})

// 预览更新
useChartDataFetch(props.chartConfig, useChartEditStore, (newData: string) => {
  option.dataset = newData
})
</script>

<style lang="scss" scoped>
@include go('text-box') {
  display: flex;
  align-items: center;
  .content {
    width: 100%;
    color: v-bind('fontColor');
    font-size: v-bind('fontSize + "px"');
    letter-spacing: v-bind('letterSpacing + "px"');
    font-weight: v-bind('fontWeight');
    text-shadow: v-bind('boxShadow');
    position: absolute;
    animation: barrage v-bind('transitionDuration + "s"') linear v-bind('animationTime + "s"') infinite;
  }
  @keyframes barrage {
    from {
      left: 100%;
      transform: translateX(0);
    }
    to {
      left: 0;
      transform: translateX(-100%);
    }
  }
}
</style>

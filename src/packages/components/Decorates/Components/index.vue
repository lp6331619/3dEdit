<template>
  <div class="reactive text-box">
    <div class="content">
      <div
        :style="{
          color: borderTitleColor,
          fontSize: borderTitleSize + 'px',
          height: borderTitleHeight + 'px',
          width: borderTitleWidth + 'px',
          fontWeight: borderTitleFontWeight,
          marginLeft: borderTitlePaddingX + 'px',
          marginTop: borderTitlePaddingY + 'px',
          marginBottom: borderTitlePaddingYB + 'px',
          textAlign: borderTitleTextAlign
        }"
      >
        {{ borderTitle }}
      </div>
      <template v-if="option.isDynamics">
        <div
          v-for="(item, i) in option.dataList"
          class="flex"
          :style="{
            alignItems: 'center',
            justifyContent: item.justifyContent
          }"
          :key="item.cnlNum"
        >
          {{ item.label }}:
          <div
            :style="{
              color: item.actionColor || item.cnlColor,
              fontSize: item.cnlSize + 'px',
              margin: '0!important'
            }"
          >
            {{ item.val }} {{ item.unit }}
          </div>
        </div>
      </template>
      <template v-else>
        <span style="cursor: pointer; white-space: pre-wrap" v-if="link" @click="click">{{ option.dataset }}</span>
        <span style="white-space: pre-wrap" v-else>{{ option.dataset }}</span>
      </template>
    </div>
    <textConfig :chartConfig="chartConfig" />
  </div>
</template>

<script setup lang="ts">
import { PropType, toRefs, shallowReactive, watch, defineAsyncComponent } from 'vue'
import { CreateComponentType } from '@/packages/index.d'
import { useChartDataFetch } from '@/hooks'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
// import { option as configOption } from './config'

const textConfig = defineAsyncComponent(() => import('./thoroughfare.vue'))
const props = defineProps({
  chartConfig: {
    type: Object as PropType<CreateComponentType & typeof option>,
    required: true
  }
})
const { w, h } = toRefs(props.chartConfig.attr)
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
  fontWeight,
  colors,
  borderTitle,
  borderTitleColor,
  borderTitleSize,
  borderTitleHeight,
  borderTitleWidth,
  borderTitleFontWeight,
  borderTitlePaddingX,
  borderTitlePaddingY,
  borderTitlePaddingYB,
  borderTitleTextAlign
} = toRefs(props.chartConfig.option)

const option = shallowReactive({
  dataset: props.chartConfig.option.dataset,
  isDynamics: props.chartConfig.option.isDynamics,
  dataList: props.chartConfig.option.dataList
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
.content {
  position: absolute;
  top: 0;
  left: 0;
  padding: 5%;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}
@include deep() {
  color: v-bind('fontColor');
  margin: v-bind('`${paddingY}px ${paddingX}px`');
  font-size: v-bind('fontSize + "px"');
  letter-spacing: v-bind('letterSpacing + "px"');
  writing-mode: v-bind('writingMode');
  font-weight: v-bind('fontWeight');
  text-align: v-bind('textAlign');
  margin: v-bind('`${paddingY}px 0 0 ${paddingX}px`');
}
</style>

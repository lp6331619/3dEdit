<template>
  <setting-item-box name="名称" :alone="true">
    <n-input
      type="text"
      maxlength="12"
      minlength="1"
      placeholder="请输入图表名称"
      size="small"
      clearable
      show-count
      v-model:value="title"
      @focus="handleFocus"
      @blur="handleBlur"
    ></n-input>
  </setting-item-box>
</template>

<script setup lang="ts">
import { PropType, computed } from 'vue'
import { SettingItemBox } from '@/components/Pages/ChartItemSetting'
import { ConfigType } from '@/packages/index.d'

const props = defineProps({
  chartConfig: {
    type: Object as PropType<ConfigType>,
    required: true
  },
})

// 使用计算属性处理chartConfig.title可能不存在的情况
const title = computed({
  get: () => {
    return props.chartConfig && props.chartConfig.title !== undefined 
      ? props.chartConfig.title 
      : '';
  },
  set: (val) => {
    if (props.chartConfig) {
      props.chartConfig.title = val;
    }
  }
});

let valueCatch = ''

const handleFocus = () => {
  if (props.chartConfig && props.chartConfig.title !== undefined) {
    valueCatch = props.chartConfig.title;
  } else {
    valueCatch = '';
  }
}

const handleBlur = () => {
  if (!props.chartConfig) {
    return;
  }
  
  // 确保title存在
  if (props.chartConfig.title === undefined) {
    props.chartConfig.title = '';
  }
  
  if(!props.chartConfig.title.length) {
    window['$message'].warning('请输入至少一个字符!');
    props.chartConfig.title = valueCatch;
  }
}
</script>

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
      v-model:value="meshName"
      @focus="handleFocus"
      @blur="handleBlur"
    ></n-input>
  </setting-item-box>
</template>

<script setup lang="ts">
import { PropType, computed, ref, watch } from 'vue'
import { SettingItemBox } from '@/components/Pages/ChartItemSetting'
import { ConfigType } from '@/packages/index.d'

const props = defineProps({
  chartConfig: {
    type: Object as PropType<ConfigType>,
    required: true
  },
})

// 使用计算属性处理name字段的读写
const meshName = computed({
  get: () => {
    // 确保对象和属性存在
    return props.chartConfig && props.chartConfig.name !== undefined
      ? props.chartConfig.name 
      : '';
  },
  set: (val) => {
    if (props.chartConfig) {
      // 设置属性
      props.chartConfig.name = val;
    }
  }
});

let valueCatch = ''

const handleFocus = () => {
  if (props.chartConfig && props.chartConfig.name !== undefined) {
    // @ts-ignore - 忽略类型检查，因为我们知道运行时会有这个属性
    valueCatch = props.chartConfig.name;
  } else {
    valueCatch = '';
  }
}

const handleBlur = () => {
  if (!props.chartConfig) {
    return;
  }
  
  // 确保name属性存在
  if (props.chartConfig.name === undefined) {
    props.chartConfig.name = '';
  }
  
  // @ts-ignore - 忽略类型检查，因为我们知道运行时需要这个属性
  const name = props.chartConfig.name;
  
  if(name === undefined || name === '') {
    window['$message'].warning('请输入至少一个字符!');
    // @ts-ignore - 忽略类型检查，因为我们知道运行时需要这个属性
    props.chartConfig.name = valueCatch;
  }
}
</script>

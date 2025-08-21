<template>
  <collapse-item name="信息" :expanded="true">
    <setting-item-box name="动态数据" :alone="true">
      <setting-item name=""><n-switch v-model:value="optionData.isDynamics" size="small"></n-switch></setting-item
    ></setting-item-box>
    <setting-item-box v-if="optionData.isDynamics" name="文字" :alone="true">
      <setting-item v-for="(item, i) in optionData.dataList" :class="i !== 0 && 'pt-20'" :key="i">
        <div class="flex">
          <n-input v-model:value="item.label" size="small"></n-input>
          <n-input
            class="ml10"
            style="width: 100px !important"
            v-model:value="item.unit"
            placeholder="单位"
            size="small"
          ></n-input>
        </div>
        <div class="flex mt10">
          <n-color-picker size="small" :modes="['hex']" v-model:value="item.cnlColor"></n-color-picker>
          <n-input-number
            class="ml10"
            v-model:value="item.cnlSize"
            size="small"
            placeholder="字体大小"
          ></n-input-number>
        </div>
        <div class="flex mt10">
          <n-select
            v-model:value="item.justifyContent"
            size="small"
            placeholder="对齐方式"
            :style="{ width: '80%' }"
            :options="justifyOptions"
          />
          <n-button class="ml10" @click="item.effectDialogFlag = true" size="small">动作</n-button>
        </div>
        <el-dialog
          destroy-on-close
          :close-on-click-modal="false"
          v-model="item.effectDialogFlag"
          draggable
          append-to-body
          width="730"
          z-index="999"
          title="动作"
        >
          <Action @close="item.effectDialogFlag = false" :optionData="item" />
        </el-dialog>
      </setting-item>
    </setting-item-box>
    <setting-item-box v-else name="文字" :alone="true">
      <setting-item>
        <n-input v-model:value="optionData.dataset" type="textarea" size="small"></n-input>
      </setting-item>
    </setting-item-box>
    <setting-item-box name="链接" :alone="true">
      <setting-item>
        <n-input-group>
          <n-select
            v-model:value="optionData.linkHead"
            size="small"
            :style="{ width: '80%' }"
            :options="linkHeadOptions"
          />
          <n-input v-model:value="optionData.link" size="small"></n-input>
          <n-button :disabled="!optionData.link" secondary size="small" @click="handleLinkClick">跳转</n-button>
        </n-input-group>
      </setting-item>
    </setting-item-box>
  </collapse-item>
</template>
<script setup lang="ts">
import { PropType, ref } from 'vue'
import { CollapseItem, SettingItemBox, SettingItem } from '@/components/Pages/ChartItemSetting'
const effectDialogFlag = ref(false)
import { justifyOptions } from '@/packages/public/chart'
import { Action } from '@/components/Action'
const props = defineProps({
  optionData: {
    type: Object,
    required: true,
    default: () => ({})
  }
})
const textAlignOptions = [
  { label: '左对齐', value: 'start' },
  { label: '居中', value: 'center' },
  { label: '右对齐', value: 'end' }
]
enum WritingModeEnum {
  HORIZONTAL = '水平',
  VERTICAL = '垂直'
}

const WritingModeObject = {
  [WritingModeEnum.HORIZONTAL]: 'horizontal-tb',
  [WritingModeEnum.VERTICAL]: 'vertical-rl'
}

enum FontWeightEnum {
  NORMAL = '常规',
  BOLD = '加粗'
}

const FontWeightObject = {
  [FontWeightEnum.NORMAL]: 'normal',
  [FontWeightEnum.BOLD]: 'bold'
}

const verticalOptions = [
  {
    label: WritingModeEnum.HORIZONTAL,
    value: WritingModeObject[WritingModeEnum.HORIZONTAL]
  },
  {
    label: WritingModeEnum.VERTICAL,
    value: WritingModeObject[WritingModeEnum.VERTICAL]
  }
]
const fontWeightOptions = [
  {
    label: FontWeightEnum.NORMAL,
    value: FontWeightObject[FontWeightEnum.NORMAL]
  },
  {
    label: FontWeightEnum.BOLD,
    value: FontWeightObject[FontWeightEnum.BOLD]
  }
]
const handleLinkClick = () => {
  window.open(props.optionData.linkHead + props.optionData.link)
}
const linkHeadOptions = [
  { label: 'http://', value: 'http://' },
  { label: 'https://', value: 'https://' }
]
</script>

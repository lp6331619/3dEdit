<template>
  <CollapseItem name="标题" :expanded="true">
    <SettingItemBox name="内容" :alone="true">
      <n-input
        size="small"
        v-model:value="optionData.borderTitle"
        :minlength="1"
        type="text"
        placeholder="请输入标题内容"
      />
    </SettingItemBox>

    <SettingItemBox name="样式">
      <SettingItem name="颜色">
        <n-color-picker size="small" :modes="['hex']" v-model:value="optionData.borderTitleColor"></n-color-picker>
      </SettingItem>
      <SettingItem name="文字大小">
        <n-input-number size="small" v-model:value="optionData.borderTitleSize" :min="12" />
      </SettingItem>
      <setting-item name="字体粗细">
        <n-select v-model:value="optionData.borderTitleFontWeight" size="small" :options="fontWeightOptions" />
      </setting-item>
      <setting-item name="X轴内边距">
        <n-input-number
          v-model:value="optionData.borderTitlePaddingX"
          size="small"
          placeholder="输入内边距"
        ></n-input-number>
      </setting-item>
      <setting-item name="Y轴内边距">
        <n-input-number
          v-model:value="optionData.borderTitlePaddingY"
          size="small"
          placeholder="输入内边距"
        ></n-input-number>
      </setting-item>
      <setting-item name="Y轴下边距">
        <n-input-number
          v-model:value="optionData.borderTitlePaddingYB"
          size="small"
          placeholder="输入下边距"
        ></n-input-number>
      </setting-item>
      <setting-item name="水平对齐">
        <n-select v-model:value="optionData.borderTitleTextAlign" size="small" :options="textAlignOptions" />
      </setting-item>
      <SettingItem name="高度">
        <n-input-number size="small" v-model:value="optionData.borderTitleHeight" :min="24" />
      </SettingItem>
      <SettingItem name="宽度">
        <n-input-number size="small" v-model:value="optionData.borderTitleWidth" :min="50" :step="10" />
      </SettingItem>
    </SettingItemBox>
  </CollapseItem>
  <collapse-item name="信息" :expanded="true">
    <setting-item-box name="动态数据" :alone="true">
      <setting-item name=""><n-switch v-model:value="optionData.isDynamics" size="small"></n-switch></setting-item
    ></setting-item-box>
    <setting-item-box v-if="optionData.isDynamics" name="文字" :alone="true">
      <setting-item v-for="(item, i) in optionData.dataList" :key="i" name="通道名称">
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
        </div>
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

  <collapse-item name="样式" :expanded="true">
    <setting-item-box name="文字">
      <setting-item name="颜色">
        <n-color-picker size="small" :modes="['hex']" v-model:value="optionData.fontColor"></n-color-picker>
      </setting-item>
      <setting-item name="字体大小">
        <n-input-number v-model:value="optionData.fontSize" size="small" placeholder="字体大小"></n-input-number>
      </setting-item>
      <setting-item name="字体粗细">
        <n-select v-model:value="optionData.fontWeight" size="small" :options="fontWeightOptions" />
      </setting-item>
      <setting-item name="X轴内边距">
        <n-input-number v-model:value="optionData.paddingX" size="small" placeholder="输入内边距"></n-input-number>
      </setting-item>
      <setting-item name="Y轴内边距">
        <n-input-number v-model:value="optionData.paddingY" size="small" placeholder="输入内边距"></n-input-number>
      </setting-item>

      <setting-item name="水平对齐">
        <n-select v-model:value="optionData.textAlign" size="small" :options="textAlignOptions" />
      </setting-item>
      <setting-item name="文本方向">
        <n-select v-model:value="optionData.writingMode" size="small" :options="verticalOptions" />
      </setting-item>
      <setting-item name="字间距">
        <n-input-number v-model:value="optionData.letterSpacing" size="small" placeholder="输入字间距"></n-input-number>
      </setting-item>
    </setting-item-box>
  </collapse-item>
  <CollapseItem name="背景" :expanded="true">
    <SettingItemBox name="颜色">
      <SettingItem>
        <n-color-picker v-model:value="optionData.backgroundColor" size="small" :modes="['hex']"></n-color-picker>
      </SettingItem>
    </SettingItemBox>
  </CollapseItem>
</template>

<script setup lang="ts">
import { PropType } from 'vue'
import { CollapseItem, SettingItemBox, SettingItem } from '@/components/Pages/ChartItemSetting'

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
const justifyOptions = [
  { label: '左对齐', value: 'flex-start' },
  { label: '居中', value: 'center' },
  { label: '右对齐', value: 'flex-end' },
  { label: '边对齐', value: 'space-between' }
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

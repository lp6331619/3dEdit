<template>
  <n-divider style="margin: 10px 0;" ></n-divider>
  <!-- <n-space :size="8" justify="space-between" style="margin-top: 10px;">
    <n-button
      secondary
      v-for="item in positionList"
      :key="item.key"
      @click="positonHandle(item.key)"
    >
      <template #icon>
        <component :is="item.icon" ></component>
      </template>
    </n-button>
  </n-space> -->
  <setting-item-box name="位置">
    <n-input-number
      v-model:value="position[0]"
      size="small"
      placeholder="px"
    >
      <template #prefix>
        <n-text depth="3">X</n-text>
      </template>
    </n-input-number>
    <n-input-number
      v-model:value="position[1]"
      size="small"
      placeholder="px"
    >
      <template #prefix>
        <n-text depth="3">Y</n-text>
      </template>
    </n-input-number>
    <n-input-number 
      class="mt10"
      v-model:value="position[2]"
      size="small"
      placeholder="px"
    >
      <template #prefix>
        <n-text depth="3">Z</n-text>
      </template>
    </n-input-number>
  </setting-item-box>
</template>

<script setup lang="ts">
import { PropType } from 'vue'
import { PickCreateComponentType } from '@/packages/index.d'
import { SettingItemBox } from '@/components/Pages/ChartItemSetting'
import { renderIcon } from '@/utils'
import { icon } from '@/plugins/index'
import { EditCanvasConfigType } from '@/store/modules/chartEditStore/chartEditStore.d'

const {
  AlignHorizontalLeftIcon,
  AlignVerticalCenterIcon,
  AlignVerticalTopIcon,
  AlignHorizontalCenterIcon,
  AlignHorizontalRightIcon,
  AlignVerticalBottomIcon
} = icon.carbon

const positionList = [
  {
    key: 'AlignHorizontalLeftIcon',
    lable: '局左',
    icon: renderIcon(AlignHorizontalLeftIcon)
  },
  {
    key: 'AlignVerticalCenterIcon',
    lable: 'X轴居中',
    icon: renderIcon(AlignVerticalCenterIcon)
  },
  {
    key: 'AlignHorizontalRightIcon',
    lable: '局右',
    icon: renderIcon(AlignHorizontalRightIcon)
  },
  {
    key: 'AlignVerticalTopIcon',
    lable: '顶部',
    icon: renderIcon(AlignVerticalTopIcon)
  },
  {
    key: 'AlignHorizontalCenterIcon',
    lable: 'Y轴居中',
    icon: renderIcon(AlignHorizontalCenterIcon)
  },
  {
    key: 'AlignVerticalBottomIcon',
    lable: '底部',
    icon: renderIcon(AlignVerticalBottomIcon)
  }
]

const props = defineProps({
  canvasConfig: {
    type: Object as PropType<EditCanvasConfigType>,
    required: true
  },
  position: {
    type: Array,
    required: true,
    default:()=>{
      return [0,0,0]
    }
  }
})


</script>

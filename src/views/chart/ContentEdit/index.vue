<template>
  <!-- <edit-rule></edit-rule> -->
  <div ref="contentBoxRef">
    <content-box
      id="go-chart-edit-layout"
      :flex="true"
      :showTop="false"
      :showBottom="true"
      :depth="1"
      :xScroll="true"
      :disabledScroll="true"
      @mousedown="mousedownHandleUnStop"
      @drop="dragHandle($event, contentBoxRef)"
      @dragover="dragoverHandle"
      @dragenter="dragoverHandle"
    >
      <!-- <edit-rule>
      画布主体
      <div id="go-chart-edit-content" @contextmenu="handleContextMenu">
        展示
        <edit-range>
          滤镜预览
          <div :style="{
    ...getFilterStyle(chartEditStore.getEditCanvasConfig),
    ...rangeStyle
  }">
            图表
            <div v-for="(item, index) in chartEditStore.getComponentList" :key="item.id">
              分组
              <edit-group v-if="item.isGroup" :groupData="(item as CreateComponentGroupType)"
                :groupIndex="index"></edit-group>
              单组件
              <edit-shape-box v-else :data-id="item.id" :index="index" :style="{
    ...useComponentStyle(item.attr, index),
    ...getBlendModeStyle(item.styles) as any
  }" :item="item" @click="mouseClickHandle($event, item)" @mousedown="mousedownHandle($event, item)"
                @mouseenter="mouseenterHandle($event, item)" @mouseleave="mouseleaveHandle($event, item)"
                @contextmenu="handleContextMenu($event, item, optionsHandle)">
                <component class="edit-content-chart" :class="animationsClass(item.styles.animations)"
                  :is="item.chartConfig.chartKey" :chartConfig="item" :themeSetting="themeSetting"
                  :themeColor="themeColor" :style="{
    ...useSizeStyle(item.attr),
    ...getFilterStyle(item.styles),
    ...getTransformStyle(item.styles)
  }"></component>
              </edit-shape-box>
            </div>
          </div>
        </edit-range>
      </div>
    </edit-rule> -->
      <TresCanva @click="TresCanvaClick" @rightClick="rightClickHandle" />
      <!-- 工具栏 -->
      <template #aside>
        <edit-tools></edit-tools>
      </template>
      <!-- 底部控制 -->
      <template #bottom>
        <EditBottom></EditBottom>
      </template>
    </content-box>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, computed, provide, reactive, defineAsyncComponent, watch, ref } from 'vue'
import { chartColors } from '@/settings/chartThemes/index'
import { MenuEnum } from '@/enums/editPageEnum'
import { CreateComponentType, CreateComponentGroupType } from '@/packages/index.d'
import { animationsClass, getFilterStyle, getTransformStyle, getBlendModeStyle, colorCustomMerge } from '@/utils'
import { useContextMenu } from '@/views/chart/hooks/useContextMenu.hook'
import { MenuOptionsItemType } from '@/views/chart/hooks/useContextMenu.hook.d'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { SCALE_KEY } from '@/views/preview/hooks/useScale.hook'
import { useLayout } from './hooks/useLayout.hook'
import { useAddKeyboard } from '../hooks/useKeyboard.hook'
import { dragHandle, dragoverHandle, mousedownHandleUnStop, useMouseHandle, TresCanvaClick } from './hooks/useDrag.hook'
import { useComponentStyle, useSizeStyle } from './hooks/useStyle.hook'
import { useRoute } from 'vue-router'
import { ContentBox } from '../ContentBox/index'
import { EditGroup } from './components/EditGroup'
import { EditRange } from './components/EditRange'
import { EditRule } from './components/EditRule'
import { EditBottom } from './components/EditBottom'
import { EditShapeBox } from './components/EditShapeBox'
import { EditTools } from './components/EditTools'

const TresCanva = defineAsyncComponent(() => import('@/components/TresCanva/index.vue'))

const chartEditStore = useChartEditStore()
const { handleContextMenu, optionsHandle } = useContextMenu()
const contentBoxRef = ref<any>()
// 编辑时注入scale变量，消除警告
provide(SCALE_KEY, null)

// 布局处理
useLayout(async () => {})
// const state = reactive({
//   config:<(CreateComponentType | CreateComponentGroupType)[]> []
// })
// 点击事件
const { mouseenterHandle, mouseleaveHandle, mousedownHandle, mouseClickHandle } = useMouseHandle()

const rightClickHandle = (c: any) => {
  const { e, item } = c
  handleContextMenu(e, item, optionsHandle)
}
const outputDialogFlag = ref(false)
// watch(()=>chartEditStore.getComponentList,(e)=>{
//   state.config = e
//   console.log(state.config,'配置更新')
// },{deep:true,immediate:true})
// 主题色
const themeSetting = computed(() => {
  const chartThemeSetting = chartEditStore.getEditCanvasConfig.chartThemeSetting
  return chartThemeSetting
})

// 配置项
const themeColor = computed(() => {
  const colorCustomMergeData = colorCustomMerge(chartEditStore.getEditCanvasConfig.chartCustomThemeColorInfo)
  return colorCustomMergeData[chartEditStore.getEditCanvasConfig.chartThemeColor]
})

// 是否展示渲染
const filterShow = computed(() => {
  return chartEditStore.getEditCanvasConfig.filterShow
})

// 键盘事件
onMounted(() => {
  useAddKeyboard()
})
</script>

<style lang="scss" scoped>
@include goId('chart-edit-layout') {
  position: relative;
  width: 100%;
  overflow: hidden;
  @extend .go-point-bg;
  @include background-image('background-point');

  @include goId('chart-edit-content') {
    overflow: hidden;
    @extend .go-transition;
    @include fetch-theme('box-shadow');

    .edit-content-chart {
      position: absolute;
      overflow: hidden;
    }
  }
}
</style>

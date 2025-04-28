<template>
  <!-- 工作台相关 -->
  <div class="go-chart">
    <n-layout>
      <layout-header-pro>
        <template #left>
          <header-left-btn></header-left-btn>
        </template>
        <template #center>
          <header-title v-if="!state.loading" :title="state.data?.name"></header-title>
        </template>
        <template #ri-left>
          <header-right-btn></header-right-btn>
        </template>
      </layout-header-pro>
      <n-layout-content content-style="overflow:hidden; display: flex">
        <div style="overflow: hidden; display: flex">
          <content-charts v-if="!currentModel"></content-charts>
          <content-layers></content-layers>
        </div>
        <content-configurations></content-configurations>
      </n-layout-content>
    </n-layout>
  </div>
  <!-- 右键 -->
  <n-dropdown
    placement="bottom-start"
    trigger="manual"
    size="small"
    :x="mousePosition.x"
    :y="mousePosition.y"
    :options="menuOptions"
    :show="chartEditStore.getRightMenuShow"
    :on-clickoutside="onClickOutSide"
    @select="handleMenuSelect"
  ></n-dropdown>
  <!-- 加载蒙层 -->
  <content-load></content-load>
</template>

<script setup lang="ts">
import { reactive, onMounted, nextTick ,computed} from 'vue'
import { loadAsyncComponent } from '@/utils'
import { LayoutHeaderPro } from '@/layout/components/LayoutHeaderPro'
import { useContextMenu } from './hooks/useContextMenu.hook'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { useChartHistoryStore } from '@/store/modules/chartHistoryStore/chartHistoryStore'
import { modelGet } from 'swagger-api/export-api/scada-config'
import { useRoute } from 'vue-router'
import { JSONStringify, JSONParse } from '@/utils'
import { ElLoading, ElMessage } from 'element-plus'
import { netWorkInternal } from '@/hooks/netWorkInternal.hook'
const chartHistoryStoreStore = useChartHistoryStore()
const chartEditStore = useChartEditStore()

// 记录初始化
chartHistoryStoreStore.canvasInit(chartEditStore.getEditCanvas)

const HeaderLeftBtn = loadAsyncComponent(() => import('./ContentHeader/headerLeftBtn/index.vue'))
const HeaderRightBtn = loadAsyncComponent(() => import('./ContentHeader/headerRightBtn/index.vue'))
const HeaderTitle = loadAsyncComponent(() => import('./ContentHeader/headerTitle/index.vue'))
const ContentLayers = loadAsyncComponent(() => import('./ContentLayers/index.vue'))
const ContentCharts = loadAsyncComponent(() => import('./ContentCharts/index.vue'))
const ContentConfigurations = loadAsyncComponent(() => import('./ContentConfigurations/index.vue'))
const ContentLoad = loadAsyncComponent(() => import('./ContentLoad/index.vue'))

const currentModel = computed(() => chartEditStore.getCurrentModel)
// 右键
const { menuOptions, onClickOutSide, mousePosition, handleMenuSelect } = useContextMenu()
const routerParamsInfo = useRoute()
const state = reactive({
  data: {},
  loading: false
})
const getData = async () => {
  state.loading = true
  const loadingInstance1 = ElLoading.service({ fullscreen: true })
  try {
    const { id } = routerParamsInfo.params
    const [f] = id

    if (f.indexOf('id_') == 0) return
    const res = await modelGet(f)
    if (res.code == 0) {
      // 记录初始化
      state.data = res.data
      const json = JSONParse(res.data.config)
      chartHistoryStoreStore.createInitHistory(json.componentList)
      chartEditStore.setinitData(json)
    }
  } catch {
  } finally {
    state.loading = false
    loadingInstance1.close()
  }
}
onMounted(() => {
  getData()
})
</script>

<style lang="scss" scoped>
@include go('chart') {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  @include background-image('background-image');
}
</style>

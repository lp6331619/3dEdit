<template>
  <div class="go-chart-configurations-data-ajax">
    <!-- <n-card class="n-card-shallow">
      <setting-item-box name="输出通道">
        <setting-item>
          <n-switch v-model:value="state.OutPutFlag" size="small"></n-switch>
        </setting-item>
      </setting-item-box> 
      <setting-item-box name="输入通道">
        <setting-item>
          <n-switch v-model:value="state.TodayData" size="small" @update:value="e => (state.TodayData = e)"></n-switch>
        </setting-item>
      </setting-item-box>
    </n-card> -->
    <div class="flex justify-center items-center gap-4px">
      <el-button
        v-if="!setDataTypesOut.includes(targetData.chartConfig?.key)"
        size="small"
        type="primary"
        class="text-13px"
        :loading="loading"
        @click="openDialog(1)"
        >输入通道
      </el-button>
      <el-button size="small" type="primary" class="text-13px" @click="openDialog(2)">输出通道</el-button>
    </div>
    <!-- 底部数据展示 -->
    <!-- <chart-data-matching-and-show :show="showMatching && !loading" :ajax="true"></chart-data-matching-and-show> -->
    <n-card class="n-card-shallow">
      <template v-if="!setDataTypesOut.includes(targetData.chartConfig?.key)">
        <div class="pb10">输入通道</div>
        <setting-item v-for="(item, i) in targetData.thoroughfare?.InputDefaultIds" :key="i">
          <div v-for="(c, ci) in item" :key="ci">[{{ returnName(i) }}] {{ c.name }}:{{ c.cnlNum }}</div>
        </setting-item>
      </template>
      <div class="pb10 mt20">输出通道</div>
      <setting-item v-for="(item, i) in targetData.thoroughfare?.OutPutDefaultIds" :key="i">
        <div v-for="(c, ci) in item" :key="ci">[{{ returnName(ci) }}] {{ c.name }}:{{ c.cnlNum }}</div>
      </setting-item>
    </n-card>
    <el-dialog
      destroy-on-close
      :close-on-click-modal="false"
      v-model="dialogFlag"
      append-to-body
      draggable
      width="500"
      :title="title"
    >
      <PresetsApiDataDialog
        @save="savePassageway"
        @close="dialogFlag = false"
        :currentKey="currentKey"
        :scadaList="scadaList"
        :scadaConnectionId="scadaConnectionId"
      />
    </el-dialog>
    <!-- 骨架图 -->
    <go-skeleton :load="loading" :repeat="3"></go-skeleton>
  </div>
</template>

<script setup lang="ts">
import { ref, toRefs, computed, nextTick, onMounted, reactive, onBeforeUnmount, watchEffect, toRaw } from 'vue'
import { icon } from '@/plugins'
import { scadaConnectionGetList } from 'swagger-api/export-api/scada-api'
import { useDesignStore } from '@/store/modules/designStore/designStore'
import { SettingItemBox, SettingItem } from '@/components/Pages/ChartItemSetting'
import { ChartDataRequest } from '../ChartDataRequest/index'
import { RequestHttpEnum, ResultEnum, SelectHttpTimeNameObj, RequestContentTypeEnum } from '@/enums/httpEnum'
import { chartDataUrl, rankListUrl, scrollBoardUrl, numberFloatUrl, numberIntUrl, textUrl, imageUrl } from '@/api/mock'
import { http, customizeHttp } from '@/api/http'
import { SelectHttpType } from '../../index.d'
import { ChartDataMatchingAndShow } from '../ChartDataMatchingAndShow'
import { useTargetData } from '../../../hooks/useTargetData.hook'
import { newFunctionHandle } from '@/utils'
import { netWorkInternal } from '@/hooks/netWorkInternal.hook'
import { setDataTypesOut } from '@/settings/designSetting'
import PresetsApiDataDialog from './presetsApiDataDialog.vue'
const { HelpOutlineIcon, FlashIcon, PulseIcon } = icon.ionicons5
const { targetData, chartEditStore } = useTargetData()
const designStore = useDesignStore()

// 是否展示数据分析
const loading = ref(false)
const currentKey = ref('InputDefaultIds')
const dialogFlag = ref(false)
const title = computed(() => {
  return currentKey.value === 'InputDefaultIds' ? '输入通道' : '输出通道'
})
const activePen = ref({})
let firstFocus = 0
let lastFilter: any = undefined
function openDialog(index: number) {
  const { InputDefaultIds, OutPutDefaultIds } = targetData.value?.thoroughfare || {}
  switch (index) {
    case 1:
      currentKey.value = 'InputDefaultIds'
      if (InputDefaultIds) {
        const l = Object.keys(InputDefaultIds)
        if (l.length) {
          const [f] = l
          scadaConnectionId.value = Number(f)
        }
      }
      break
    case 2:
      currentKey.value = 'OutPutDefaultIds'
      if (OutPutDefaultIds?.length) {
        const [f = {}] = OutPutDefaultIds
        for (let i in f) {
          scadaConnectionId.value = Number(i)
        }
      }
      break
  }
  dialogFlag.value = true
}

const state = reactive({
  OutPutFlag: false,
  TodayData: false
})
//获取scada列表
const scadaList = ref([])
const scadaConnectionId = ref()
const getData = async () => {
  try {
    const res = await scadaConnectionGetList()
    scadaList.value = res.data
    const [f] = res.data
    scadaConnectionId.value = f.id
  } catch (e) {}
}

const returnName = id => {
  const obj = scadaList.value?.find(item => item.id == id) || {}
  return obj.name || ''
}
// 颜色
const themeColor = computed(() => {
  return designStore.getAppTheme
})
watchEffect(() => {
  const filter = targetData.value?.filter
  if (lastFilter !== filter && firstFocus) {
    lastFilter = filter
  }
  firstFocus++
})
async function savePassageway(data: any, idsType: any) {
  if (!targetData.value.thoroughfare) {
    targetData.value.thoroughfare = {
      InputDefaultIds: {},
      OutPutDefaultIds: {}
    }
  }
  if (idsType == 'InputDefaultIds') {
    targetData.value.option.isDynamics = true
    targetData.value.thoroughfare[idsType] = data
  } else {
    const [f] = data
    targetData.value.thoroughfare[idsType] = Object.keys(f).length ? data : []
  }
  console.log(targetData.value, '保存通道')
  dialogFlag.value = false
  nextTick(() => {
    netWorkInternal(2000)
  })
}
onMounted(() => {
  getData()
})
onBeforeUnmount(() => {
  lastFilter = null
})
</script>

<style lang="scss" scoped>
.flex {
  display: flex;
  justify-content: center;
  padding: 20px;
}
@include go('chart-configurations-data-ajax') {
  .n-card-shallow {
    &.n-card {
      @extend .go-background-filter;
      @include deep() {
        .n-card__content {
          padding: 10px;
        }
      }
    }
    .edit-text {
      position: absolute;
      top: 0px;
      left: 0px;
      width: 325px;
      height: 270px;
      cursor: pointer;
      opacity: 0;
      transition: all 0.3s;
      @extend .go-background-filter;
      backdrop-filter: blur(2px) !important;
    }
    &:hover {
      border-color: v-bind('themeColor');
      .edit-text {
        opacity: 1;
      }
    }
  }
}
</style>

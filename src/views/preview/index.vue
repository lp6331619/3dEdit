<!--
 * @Descripttion: 
 * @version: 1.0
 * @Author: Teemor
 * @Date: 2024-11-14 13:54:57
 * @LastEditors: Teemor
 * @LastEditTime: 2025-03-24 17:16:53
-->
<template>
  <div style="width: 100vw; height: 100vh">
    <TresCanva v-if="config" isPreview @click="clickHtml" />
  </div>
  <el-dialog width="500" title="发送命令" destroy-on-close :close-on-click-modal="false" v-model="outputDialogFlag">
    <OutputDialog :outputPen="outputPen" :id="id" @close="outputDialogFlag = false" />
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue'
import { defineAsyncComponent } from 'vue'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { ElLoading, ElMessage } from 'element-plus'
import { JSONStringify, JSONParse } from '@/utils'
import { modelGet } from 'swagger-api/export-api/scada-config'
import { useRoute } from 'vue-router'
const OutputDialog = defineAsyncComponent(() => import('@/components/OutputDialog/index.vue'))

const outputDialogFlag = ref(false)
const chartEditStore = useChartEditStore()
const TresCanva = defineAsyncComponent(() => import('@/components/TresCanva/index.vue'))
const routerParamsInfo = useRoute()
const config = ref(undefined)
const getData = async () => {
  const loadingInstance1 = ElLoading.service({ fullscreen: true })
  try {
    const { id } = routerParamsInfo.params
    const [f] = id
    if (f.indexOf('id_') == 0) return
    const res = await modelGet(f)
    if (res.code == 0) {
      config.value = JSONParse(res.data.config)
      console.log(config.value, '接口获取的配置')
      chartEditStore.setinitData(config.value)
    }
  } catch {
  } finally {
    loadingInstance1.close()
  }
}
const outputPen = ref({})
const id = ref()
const clickHtml = (e: any) => {
  const { item } = e
  const { thoroughfare = {} } = item || {}
  const { OutPutDefaultIds = [] } = thoroughfare
  if (OutPutDefaultIds.length) {
    const [f] = OutPutDefaultIds
    for(let i in f){
      outputPen.value = f[i]
      id.value = i
    }
    outputDialogFlag.value = true
  }
}
onMounted(() => {
  getData()
})
</script>

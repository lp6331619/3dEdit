<template>
  <n-space class="go-mt-0" :wrap="false">
    <n-button v-for="item in comBtnList" :key="item.title" :type="item.type" ghost @click="item.event">
      <template #icon>
        <component :is="item.icon"></component>
      </template>
      <span>{{ item.title }}</span>
    </n-button>
  </n-space>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, watch, ref } from 'vue'
import { renderIcon, goDialog, fetchPathByName, routerTurnByPath, setSessionStorage, getLocalStorage } from '@/utils'
import { modelCreate, modelUpdate, storedFileUploadFile, modelPublish } from 'swagger-api/export-api/scada-config'
import { PreviewEnum } from '@/enums/pageEnum'
import { StorageEnum } from '@/enums/storageEnum'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { canvasCut, downloadTextFile, JSONStringify } from '@/utils'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { syncData } from '../../ContentEdit/components/EditTools/hooks/useSyncUpdate.hook'
import { icon } from '@/plugins'
import { cloneDeep } from 'lodash'
import { ElLoading, ElMessage } from 'element-plus'
const { BrowsersOutlineIcon, SendIcon, AnalyticsIcon } = icon.ionicons5
const chartEditStore = useChartEditStore()
const { editCanvasConfig, canvasRefs } = storeToRefs(chartEditStore)
const routerParamsInfo = useRoute()
const router = useRouter()

// 预览
const previewHandle = () => {
  const path = fetchPathByName(PreviewEnum.CHART_PREVIEW_NAME, 'href')
  if (!path) return
  const { id } = routerParamsInfo.params
  // id 标识
  const previewId = typeof id === 'string' ? id : id[0]
  saveData({ path, previewId })
  // const storageInfo = chartEditStore.getStorageInfo()
  // const sessionStorageInfo = getLocalStorage(StorageEnum.GO_CHART_STORAGE_LIST) || []

  // if (sessionStorageInfo?.length) {
  //   const repeateIndex = sessionStorageInfo.findIndex((e: { id: string }) => e.id === previewId)
  //   // 重复替换
  //   if (repeateIndex !== -1) {
  //     sessionStorageInfo.splice(repeateIndex, 1, { id: previewId, ...storageInfo })
  //     setSessionStorage(StorageEnum.GO_CHART_STORAGE_LIST, sessionStorageInfo)
  //   } else {
  //     sessionStorageInfo.push({
  //       id: previewId,
  //       ...storageInfo
  //     })
  //     setSessionStorage(StorageEnum.GO_CHART_STORAGE_LIST, sessionStorageInfo)
  //   }
  // } else {
  //   setSessionStorage(StorageEnum.GO_CHART_STORAGE_LIST, [{ id: previewId, ...storageInfo }])
  // }
}
// 发布
const sendHandle = () => {
  goDialog({
    message: '是否确定发布',
    positiveText: '确定',
    closeNegativeText: true,
    onPositiveCallback: async () => {
      const { id } = routerParamsInfo.params
      const res = await modelPublish(id)
      if (res.code == 0) {
        ElMessage.success('发布成功')
      }
    }
  })
}

//保存
const saveData = ({ path = '', previewId = '' }) => {
  // return
  const { id } = routerParamsInfo.params
  const [f] = id
  const loadingInstance1 = ElLoading.service({ fullscreen: true })
  //生成图片
  const { context } = canvasRefs.value
  const { renderer, scene, camera } = context
  editCanvasConfig.preserveDrawingBuffer = true
  renderer.value.render(scene.value, camera.value)
  renderer.value.resetState()
  nextTick(async () => {
    const canvas = document.querySelector('.tres-canvas-container canvas')
    canvas.toBlob(async blob => {
      if (blob) {
        // 创建一个 File 对象
        const file = new File([blob], 'canvas-image.png', { type: blob.type })
        console.log(file) // 现在你有了一个 File 对象
        // 你可以在这里上传文件或进行其他操作
        try {
          // 上传封面图片
          const res = await storedFileUploadFile({ file: file })
          const query = {
            name: editCanvasConfig.value.projectName,
            config: JSONStringify(chartEditStore.getStorageInfo() || []),
            imageUrl: res.data
          }
          // 新建
          if (f.indexOf('id_') == 0) {
            const res = await modelCreate(query)
            if (res.code == 0) {
              ElMessage({
                message: '保存成功!',
                type: 'success'
              })
              router.push('/chart/home/' + res.data)
            }
          } else {
            // 更新
            const res = await modelUpdate(f, query)
            if (res.code == 0) {
              ElMessage({
                message: '保存成功!',
                type: 'success'
              })
            }
          }
          path && routerTurnByPath(path, [previewId], undefined, true)
        } catch (e) {
        } finally {
          loadingInstance1.close()
        }
      }
    }, 'image/png')
    setTimeout(() => {
      editCanvasConfig.preserveDrawingBuffer = false
      renderer.value.render(scene.value, camera.value)
      renderer.value.resetState()
    }, 1000)
  })
}

const btnList = ref([
  // {
  //   select: true,
  //   title: '同步内容',
  //   type: 'primary',
  //   icon: renderIcon(AnalyticsIcon),
  //   event: syncData
  // },
  {
    select: true,
    title: '保存',
    icon: renderIcon(BrowsersOutlineIcon),
    event: saveData
  },
  {
    select: true,
    title: '预览',
    icon: renderIcon(BrowsersOutlineIcon),
    event: previewHandle
  },
  {
    select: true,
    title: '发布',
    icon: renderIcon(SendIcon),
    event: sendHandle
  }
])
const comBtnList = ref([])
const getBtnList = () => {
  const obj = btnList.value.find(item => item.title == '发布')
  if (routerParamsInfo.path.indexOf('id_') != -1) {
    obj && btnList.value.splice(2, 1)
  } else {
    !obj &&
      btnList.value.push({
        select: true,
        title: '发布',
        icon: renderIcon(SendIcon),
        event: sendHandle
      })
  }
  comBtnList.value = btnList.value
}
// 监听路由
watch(
  () => routerParamsInfo.path,
  n => {
    getBtnList()
  },
  { deep: true, immediate: true }
)

// 保存数据
onMounted(() => {})
</script>

<style lang="scss" scoped>
.align-center {
  margin-top: -4px;
}
</style>

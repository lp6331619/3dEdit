<template>
  <n-space class="go-mt-0" :wrap="false">
    <n-button 
      v-for="item in comBtnList" 
      :key="item.title" 
      :type="item.type" 
      :disabled="inPatrolAnimation" 
      ghost 
      @click="item.event"
    >
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

// 使用computed获取巡视状态，确保响应式更新
const inPatrolAnimation = computed(() => chartEditStore.getInPatrolAnimation)

// 预览
const previewHandle = () => {
  // 巡视过程中不允许预览
  if (inPatrolAnimation.value) {
    ElMessage.warning('巡视过程中不能进行预览操作，请先停止巡视')
    return
  }

  const path = fetchPathByName(PreviewEnum.CHART_PREVIEW_NAME, 'href')
  if (!path) return
  const { id } = routerParamsInfo.params
  // id 标识
  const previewId = typeof id === 'string' ? id : id[0]
  saveData({ path, previewId })
}

// 发布
const sendHandle = () => {
  // 巡视过程中不允许发布
  if (inPatrolAnimation.value) {
    ElMessage.warning('巡视过程中不能进行发布操作，请先停止巡视')
    return
  }

  goDialog({
    message: '是否确定发布',
    positiveText: '确定',
    closeNegativeText: true,
    onPositiveCallback: async () => {
      const { id } = routerParamsInfo.params
      const res = await modelPublish(id as string)
      if (res && (res as any).code == 0) {
        ElMessage.success('发布成功')
      }
    }
  })
}

//保存
const saveData = ({ path = '', previewId = '' }) => {
  // 巡视过程中不允许保存
  if (inPatrolAnimation.value) {
    ElMessage.warning('巡视过程中不能进行保存操作，请先停止巡视')
    return
  }

  const { id } = routerParamsInfo.params
  const [f] = id as string[]
  const loadingInstance1 = ElLoading.service({ fullscreen: true })
  //生成图片
  const { context } = canvasRefs.value
  if (!context) {
    loadingInstance1.close()
    return
  }
  
  const { renderer, scene, camera } = context
  // 设置preserveDrawingBuffer
  if (renderer.value) {
    renderer.value.preserveDrawingBuffer = true
    renderer.value.render(scene.value, camera.value)
    renderer.value.resetState()
  }
  
  nextTick(async () => {
    const canvas = document.querySelector('.tres-canvas-container canvas')
    if (!canvas) {
      loadingInstance1.close()
      return
    }
    
    (canvas as HTMLCanvasElement).toBlob(async blob => {
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
            if ((res as any).code == 0) {
              ElMessage({
                message: '保存成功!',
                type: 'success'
              })
              router.push('/chart/home/' + (res as any).data)
            }
          } else {
            // 更新
            const res = await modelUpdate(f, query)
            if ((res as any).code == 0) {
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
      if (renderer.value) {
        renderer.value.preserveDrawingBuffer = false
        renderer.value.render(scene.value, camera.value)
        renderer.value.resetState()
      }
    }, 1000)
  })
}

interface ButtonItem {
  select: boolean
  title: string
  type?: string
  icon: any
  event: any
}

const btnList = ref<ButtonItem[]>([
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

const comBtnList = ref<ButtonItem[]>([])

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

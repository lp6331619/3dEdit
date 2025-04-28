import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { canvasCut, downloadTextFile, JSONStringify } from '@/utils'
import { storeToRefs } from 'pinia'
const chartEditStore = useChartEditStore()
const { transformRef } = storeToRefs(chartEditStore)
// 变换配置
const transformControlsState = chartEditStore.getTransformControlsState
// 导出
export const exportHandle = () => {
  // 取消选中
  chartEditStore.setTargetSelectChart(undefined)
  transformControlsState.enabled = false
  transformRef.value = null
  // 导出数据
  downloadTextFile(JSONStringify(chartEditStore.getStorageInfo() || []), undefined, 'json')
  // 导出图片
  return
  const range = document.querySelector('.tres-canvas-container') as HTMLElement

  // 记录缩放比例
  const scaleTemp = chartEditStore.getEditCanvas.scale
  // 百分百展示页面
  // chartEditStore.setScale(1, true)
  // 展示水印
  // watermark.style.display = 'block'

  setTimeout(() => {
    canvasCut(range, () => {
      // 隐藏水印
      // if (watermark) watermark.style.display = 'none'
      // 还原页面大小
      chartEditStore.setScale(scaleTemp, true)
    })
  }, 600)
}

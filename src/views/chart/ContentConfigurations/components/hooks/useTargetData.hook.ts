import { computed, Ref } from 'vue'
import { CreateComponentType, CreateComponentGroupType } from '@/packages/index.d'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'

// 获取当前对象数据
export const useTargetData = () => {
  const chartEditStore = useChartEditStore()
  const targetData: Ref<CreateComponentType | CreateComponentGroupType> = computed(() => {
    const list = chartEditStore.getComponentList
    const selectId = chartEditStore.getTargetChart.selectId
    let obj = {}
    list?.map((item:any)=>{
      if(item.id == selectId){
        obj = item
      }
      item.groupList?.map((c:any)=>{
        if(c.id == selectId){
          obj = c
        }
      })
    })
    return obj
  })
  return { targetData, chartEditStore }
}

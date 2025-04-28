/*
 * @Descripttion:
 * @version: 1.0
 * @Author: Teemor
 * @Date: 2024-11-29 15:36:17
 * @LastEditors: Teemor
 * @LastEditTime: 2024-12-02 09:14:50
 */
import { reactive, ref } from 'vue'
import axiosImpl from '@/api/axios'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { curDataGetCurDataByCnlNums } from 'swagger-api/export-api/scada-api'
import { deepClone } from '@/utils'
import { setDataTypes } from '@/settings/designSetting'
const chartEditStore = useChartEditStore()
const componentList = chartEditStore.getComponentList
const timeOut = ref(undefined)
const cahceRoot = reactive({
  isRoot: false,
  isRun: false,
  cacheCnlNums: [],
  CnlGroups:[],
  cnlListID: ''
})
const isRun = ref(false)
const distributeData = (c:any,data:any)=>{
  const { thoroughfare = {} } = c
        const {InputDefaultIds={}}=thoroughfare
        if (Object.keys(InputDefaultIds).length) {
          let cnlNumList = new Set([])
          Object.keys(InputDefaultIds).map((key:any)=>{
            InputDefaultIds[key]?.map((item:any)=>cnlNumList.add(item.cnlNum))
          })
          // 移除不在 thoroughfare.data 中的项
          for (let i = c.option.dataList.length - 1; i >= 0; i--) {
            const existingItem = c.option.dataList[i]
            if (!cnlNumList.has(existingItem.cnlNum)) {
              c.option.dataList.splice(i, 1) // 移除项
            }
          }
          for(let scadaId in InputDefaultIds){
            const findIndex = data.findIndex((item:any)=>item.scadaConnectionId == scadaId)
            // 更新和添加项
            if(findIndex>-1){
              const records =  data[findIndex]?.records||[]
              InputDefaultIds[scadaId]?.forEach((cc:any)=>{
                const item = records?.find((item: any) => cc.cnlNum === item.cnlNum)
                if (item) {
                  const existingItem = c.option.dataList.find((d: any) => d.cnlNum === cc.cnlNum)
                  if (existingItem) {
                    if (existingItem.val !== item.dispVal) {
                      existingItem.val = item.dispVal // 只更新 val
                    }
                  } else {
                    c.option.dataList.push({
                      label: cc.name,
                      val: item.dispVal,
                      cnlNum: cc.cnlNum
                    })
                  }
                }
              })
            }
          }
        }
}
const walk = async (time: any) => {
  cahceRoot.isRun = true
  let num = 0
  cahceRoot.CnlGroups?.map(item=>{
   num += item.cnlNums.length
  })
  //  清空了通道 不请求接口
  if (num ==0) {
    cahceRoot.isRun = false
    timeOut.value && clearTimeout(timeOut.value)
    componentList.forEach((item: any) => {
      item.option.dataList = []
      item.option.isDynamics = false
    })
    return
  }
  try {
    const { data = [], code } = await curDataGetCurDataByCnlNums({
      ViewId: 0,
      CnlGroups: cahceRoot.CnlGroups,
    })
    if (code == 0) {
      isRun.value = true
      // 将数据分发
      if (!data.length) return
      componentList.forEach((c: any) => {
        distributeData(c,data)
        c.groupList?.forEach((cc:any)=>{
          distributeData(cc,data)
        })
      })
    }
  } catch (e) {
    console.log(e)
  } finally {
    timeOut.value && clearTimeout(timeOut.value)
    timeOut.value = setTimeout(() => {
      walk(time)
    }, time)
  }
}
function mergeAndDeduplicate(arr1:any, arr2:any) {
  return [...new Set([...arr1, ...arr2])];
}
// 请求
// 轮询请求
const thoroughfareFun = (item:any)=>{
  if(item.thoroughfare){
    for(let i in item.thoroughfare?.InputDefaultIds){
      const findIndex = cahceRoot.CnlGroups?.findIndex((item)=>item.scadaConnectionId==i)
      //找到相同的说明有重复，这里塞到一个数组里并去重
      if(findIndex>-1){
        cahceRoot.CnlGroups[findIndex].cnlNums = mergeAndDeduplicate(cahceRoot.CnlGroups[findIndex].cnlNums,item.thoroughfare?.InputDefaultIds[i]?.map((item: any) => item.cnlNum))
        //如果这个数据的通道号是空的就删除这条数据
        if(!cahceRoot.CnlGroups[findIndex].cnlNums.length){
          cahceRoot.CnlGroups = cahceRoot.CnlGroups.filter((cc:any,cci:number)=>findIndex!=cci)
        }
      }else{
        const b = item.thoroughfare?.InputDefaultIds[i]?.map((item: any) => item.cnlNum) || []
        //如果这个数据的通道号是空的就不push数据
        b.length && cahceRoot.CnlGroups.push({
          scadaConnectionId:i,
          cnlNums: b,
        })
      }
    }
  }
}
export const netWorkInternal = async (time: any) => {
  cahceRoot.CnlGroups = []
  componentList.map((item: any, ii: number) => {
    thoroughfareFun(item)
    item.groupList?.map((c:any)=>{
      thoroughfareFun(c)
    })
  })
  // 如果已经在跑，不进入
  if (isRun.value) return
  walk(time)
  // settimeout = setTimeout(() => {
  // }, 1000)
}

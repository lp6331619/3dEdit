import { ref } from 'vue'
import { ChartEnum } from '@/enums/pageEnum'
import { fetchPathByName, routerTurnByPath } from '@/utils'
import { Chartype } from '../../../index.d'
import { useUserStore } from '@/store/modules/userStore/index.js'
export const useModalDataInit = () => {
  const modalShow = ref<boolean>(false)
  const modalData = ref<Chartype | null>(null)

  // 关闭 modal
  const closeModal = () => {
    modalShow.value = false
    modalData.value = null
  }

  // 打开 modal
  const resizeHandle = (cardData: Chartype) => {
    if (!cardData) return
    modalShow.value = true
    modalData.value = cardData
  }

  // 打开 modal
  const editHandle = (cardData: Chartype) => {
    if (!cardData) return
    const userStore = useUserStore()
    const token = userStore.getToken()
    const path = fetchPathByName(ChartEnum.CHART_HOME_NAME, 'href')
    routerTurnByPath(path, [cardData.id], undefined, true, '?token=' + token)
  }

  return {
    modalData,
    modalShow,
    closeModal,
    resizeHandle,
    editHandle
  }
}

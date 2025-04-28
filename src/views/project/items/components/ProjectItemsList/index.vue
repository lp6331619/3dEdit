<!--
 * @Descripttion: 
 * @version: 1.0
 * @Author: Teemor
 * @Date: 2024-11-14 13:54:57
 * @LastEditors: Teemor
 * @LastEditTime: 2025-01-21 15:38:25
-->
<template>
  <div class="go-items-list">
    <n-grid :x-gap="20" :y-gap="20" cols="2 s:2 m:3 l:4 xl:4 xxl:4" responsive="screen">
      <n-grid-item v-for="(item, index) in state.list.data" :key="item.id">
        <project-items-card
          :cardData="item"
          @resize="resizeHandle"
          @delete="deleteHandle($event, index, getData)"
          @edit="editHandle"
          @reload="getData"
        ></project-items-card>
      </n-grid-item>
    </n-grid>
    <div class="list-pagination">
      <n-pagination
        v-model:page="state.query.PageIndex"
        :item-count="state.list?.totalCount"
        :page-sizes="[12, 24, 36, 48]"
        show-size-picker
      />
    </div>
  </div>
  <project-items-modal-card
    v-if="modalData"
    :modalShow="modalShow"
    :cardData="modalData"
    @close="closeModal"
    @edit="editHandle"
  ></project-items-modal-card>
</template>

<script setup lang="ts">
import { reactive, watch, onMounted } from 'vue'
import { ProjectItemsCard } from '../ProjectItemsCard/index'
import { ProjectItemsModalCard } from '../ProjectItemsModalCard/index'
import { icon } from '@/plugins'
import { useModalDataInit } from './hooks/useModal.hook'
import { useDataListInit } from './hooks/useData.hook'
import { modelGetPaged } from 'swagger-api/export-api/scada-config'

const { CopyIcon, EllipsisHorizontalCircleSharpIcon } = icon.ionicons5
const { list, deleteHandle } = useDataListInit()
const { modalData, modalShow, closeModal, resizeHandle, editHandle } = useModalDataInit()
const state = reactive({
  query: { PageIndex: 1, PageSize: 12 },
  list: {}
})
const getData = async () => {
  try {
    const res = await modelGetPaged(state.query)
    if (res.code == 0) {
      state.list = res.data
    }
  } catch {}
}
watch(
  () => state.query.PageIndex,
  e => {
    getData()
  },
  { deep: true, immediate: true }
)

onMounted(() => {})
</script>

<style lang="scss" scoped>
$contentHeight: 250px;
@include go('items-list') {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: calc(100vh - #{$--header-height} * 2 - 2px);
  .list-content {
    position: relative;
    height: $contentHeight;
  }
  .list-pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }
}
</style>

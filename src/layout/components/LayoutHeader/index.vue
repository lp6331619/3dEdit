<!--
 * @Author: sorry 247076126@qq.com
 * @Date: 2024-10-12 14:14:10
 * @LastEditors: Teemor 232957726@qq.com
 * @LastEditTime: 2025-04-23 10:17:05
 * @FilePath: \3DThreeEdit\src\layout\components\LayoutHeader\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <n-layout-header bordered class="go-header">
    <header class="go-header-box" :class="{ 'is-project': isProject }">
      <div class="header-item left" >
        <n-space v-if="!currentModel">
          <slot name="left"></slot>
        </n-space>
      </div>
      <div class="header-item center">
        <slot name="center"></slot>
      </div>
      <div class="header-item right">
        <n-space v-if="!currentModel">
          <slot name="ri-left"> </slot>
          <!-- <go-lang-select></go-lang-select> -->
          <!-- <theme-color-select></theme-color-select> -->
          <!-- <go-theme-select></go-theme-select> -->
          <slot name="ri-right"> </slot>
        </n-space>
      </div>
    </header>
  </n-layout-header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { GoThemeSelect } from '@/components/GoThemeSelect'
import { GoLangSelect } from '@/components/GoLangSelect'
import { ThemeColorSelect } from '@/components/Pages/ThemeColorSelect'
import { PageEnum } from '@/enums/pageEnum'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
const chartEditStore = useChartEditStore()
const route = useRoute()
const currentModel = computed(() => chartEditStore.getCurrentModel)
const isProject = computed(() => {
  return route.fullPath === PageEnum.BASE_HOME_ITEMS
})
</script>

<style lang="scss" scoped>
@include go(header) {
  &-box {
    display: flex;
    justify-content: space-between;

    &.is-project {
      grid-template-columns: none;
    }

    .header-item {
      display: flex;
      align-items: center;

      &.left {
        justify-content: start;
      }

      &.center {
        justify-content: center;
      }

      &.right {
        justify-content: end;
      }
    }

    height: $--header-height;
    padding: 0 20px 0 60px;
  }
}
</style>

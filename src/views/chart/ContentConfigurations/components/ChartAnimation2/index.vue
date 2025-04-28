<!--
 * @Descripttion: 
 * @version: 1.0
 * @Author: Teemor
 * @Date: 2024-12-06 10:10:01
 * @LastEditors: Teemor
 * @LastEditTime: 2024-12-09 17:54:50
-->
<template>
  <div class="go-chart-configurations-animations" v-if="targetData">
    <n-button class="clear-btn go-my-2" :disabled="!targetData.styles.animations.length" @click="clearAnimation">
      清除动画
    </n-button>
    <collapse-item name="爆炸动画">
      <setting-item-box name="是否炸开">
        <setting-item name="">
          <n-button
            class="clear-btn go-my-2"
            :type="explosion.explode ? 'primary' : ''"
            @click=";(explosion.explode = true), (explosion.disintegrate = false)"
          >
            炸开
          </n-button>
        </setting-item>
        <setting-item name="">
          <n-button
            class="clear-btn go-my-2"
            :type="explosion.disintegrate ? 'primary' : ''"
            @click=";(explosion.disintegrate = true), (explosion.explode = false)"
          >
            还原
          </n-button>
        </setting-item>
      </setting-item-box>
      <setting-item-box name="爆炸时间(ms)">
        <setting-item>
          <n-slider v-model:value="explosion.speed" :step="1" :min="1" :max="9999"></n-slider>
        </setting-item>
        <setting-item>
          <n-input-number v-model:value="explosion.speed" :min="1" size="small"></n-input-number>
        </setting-item>
      </setting-item-box>
      <setting-item-box name="距离向量">
        <setting-item>
          <n-slider v-model:value="explosion.distances" :step="0.1" :min="0.1" :max="10"></n-slider>
        </setting-item>
        <setting-item>
          <n-input-number v-model:value="explosion.distances" :min="0.1" size="small"></n-input-number>
        </setting-item>
      </setting-item-box>
    </collapse-item>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useDesignStore } from '@/store/modules/designStore/designStore'
import { useTargetData } from '../hooks/useTargetData.hook'
import { SettingItemBox, SettingItem, CollapseItem } from '@/components/Pages/ChartItemSetting'
const explosion = ref({
  speed: 3000, // 时间
  distances: 2, //距离的向量
  disintegrate: false,
  explode: false
})
// 全局颜色
const designStore = useDesignStore()

const hoverPreviewAnimate = ref('')

const { targetData } = useTargetData()
watch(
  () => explosion.value,
  e => {
    targetData.value.styles.explosion = e
  },
  { deep: true, immediate: true }
)
// 颜色
const themeColor = computed(() => {
  return designStore.getAppTheme
})
onMounted(() => {
  explosion.value = targetData.value.styles.explosion
})
// * 清除动画
const clearAnimation = () => {
  explosion.value.disintegrate = false
  explosion.value.explode = false
}
</script>

<style lang="scss" scoped>
@include go('chart-configurations-explosion') {
}
</style>

<template>
  <img :src="sign" ref="eventSign" v-if="isOut" class="sign" data-event-sign="notify" data-notify-type="outEvent"  data-value-path="thoroughfare.OutPutDefaultIds.0"/>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import sign from '@/assets/images/sign.png'
const props = defineProps({
  chartConfig: {
    type: Object,
    required: true
  }
})
const isOut = ref(false)
const eventSign = ref()

watch(
  () => props.chartConfig.thoroughfare?.OutPutDefaultIds,
  (newData: any) => {
    isOut.value = newData?.length
  },
  {
    immediate: true,
    deep: false
  }
)
onMounted(() => {
  if (eventSign.value) {
    eventSign.value.__vue__proxy = props.chartConfig
  }
})
</script>

<style lang="scss" scoped>
.sign {
  position: absolute;
  right: -15px;
  top: -15px;
  width: 30px;
}
</style>

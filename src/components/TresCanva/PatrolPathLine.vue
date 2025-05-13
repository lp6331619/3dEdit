<!--
 * @Author: Teemor
 * @Description: 巡视路径线显示组件
-->
<template>
  <TresGroup :name="'PatrolPathLine'" v-if="pathPoints.length > 1">
    <!-- 路径线 -->
    <TresLine v-if="lineGeometry && lineMaterial">
      <TresBufferGeometry :ref="geometryRef" />
      <TresLineBasicMaterial :color="lineColor" :linewidth="2" />
    </TresLine>
    
    <!-- 路径点标记 -->
    <TresGroup v-for="(point, index) in pathPoints" :key="index">
      <TresMesh :position="[Number(point.position[0]), Number(point.position[1]), Number(point.position[2])]">
        <TresSphereGeometry :args="[0.3, 16, 16]" />
        <TresMeshStandardMaterial :color="index === 0 ? startPointColor : endPointColor" />
      </TresMesh>
      <!-- 点号文本 -->
      <TresGroup :position="[Number(point.position[0]), Number(point.position[1]) + 0.8, Number(point.position[2])]">
        <Html>
          <div class="point-label">{{ index + 1 }}</div>
        </Html>
      </TresGroup>
    </TresGroup>
  </TresGroup>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onBeforeUnmount, computed, onMounted, shallowRef } from 'vue'
import * as THREE from 'three'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { Html } from '@tresjs/cientos'

// 定义props
const props = defineProps({
  pathPoints: {
    type: Array as () => { position: number[], lookAt: number[] }[],
    default: () => []
  },
  lineColor: {
    type: String,
    default: '#2080ff'
  },
  startPointColor: {
    type: String,
    default: '#00ff00'
  },
  endPointColor: {
    type: String,
    default: '#ff0000'
  }
})

// 几何体引用
const geometryRef = shallowRef()
const lineGeometry = ref<THREE.BufferGeometry | null>(null)
const lineMaterial = ref<THREE.LineBasicMaterial | null>(null)

// 监听路径点变化，更新路径线
watch(() => props.pathPoints, updatePathLine, { deep: true, immediate: true })

// 更新路径线
function updatePathLine() {
  if (props.pathPoints.length < 2) {
    // 清空几何体
    lineGeometry.value = null;
    lineMaterial.value = null;
    return;
  }
  
  // 创建路径顶点
  try {
    const points = props.pathPoints.map(point => {
      // 确保每个值都是数字
      return new THREE.Vector3(
        Number(point.position[0]) || 0, 
        Number(point.position[1]) || 0, 
        Number(point.position[2]) || 0
      )
    })
    
    // 创建新的几何体和材质
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({
      color: props.lineColor,
      linewidth: 2
    })
    
    // 更新引用
    lineGeometry.value = geometry
    lineMaterial.value = material
    
    // 如果geometryRef存在，更新它的几何体
    if (geometryRef.value && geometryRef.value.geometry) {
      geometryRef.value.geometry = geometry
    }
  } catch (error) {
    console.error('更新路径线出错:', error)
    lineGeometry.value = null
    lineMaterial.value = null
  }
}

// 组件挂载后初始化
onMounted(() => {
  updatePathLine()
})
</script>

<style scoped>
.point-label {
  color: white;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
  white-space: nowrap;
  margin-top: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  pointer-events: none;
}
</style> 
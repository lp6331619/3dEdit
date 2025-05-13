<!--
 * @Author: Teemor
 * @Description: 巡视路径线显示组件
-->
<template>
  <TresGroup :name="'PatrolPathLine'" v-if="shouldRender">
    <!-- 路径线 -->
    <TresLine v-if="lineGeometry && lineMaterial">
      <TresBufferGeometry :ref="geometryRef" />
      <TresLineBasicMaterial :color="lineColor" :linewidth="2" />
    </TresLine>
    
    <!-- 路径点标记 - 使用v-memo提高性能 -->
    <TresGroup v-for="(point, index) in optimizedPathPoints" :key="index" v-memo="[point.hash, index]">
      <TresMesh :position="point.position">
        <TresSphereGeometry :args="[0.3, 16, 16]" />
        <TresMeshStandardMaterial :color="index === 0 ? startPointColor : endPointColor" />
      </TresMesh>
      <!-- 点号文本 -->
      <TresGroup :position="[point.position[0], point.position[1] + 0.8, point.position[2]]">
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
import { debounce } from 'lodash'

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

// 判断是否应该渲染组件
const shouldRender = computed(() => {
  return Array.isArray(props.pathPoints) && props.pathPoints.length > 1;
});

// 优化处理后的路径点数据，添加hash用于v-memo性能优化
const optimizedPathPoints = computed(() => {
  if (!shouldRender.value) return [];
  
  return props.pathPoints.map(point => {
    const pos = [
      Number(point.position[0]) || 0,
      Number(point.position[1]) || 0,
      Number(point.position[2]) || 0
    ];
    
    // 创建一个hash值用于v-memo优化，避免不必要的重渲染
    const hash = `${pos[0].toFixed(2)},${pos[1].toFixed(2)},${pos[2].toFixed(2)}`;
    
    return {
      position: pos,
      hash
    };
  });
});

// 几何体引用
const geometryRef = shallowRef()
const lineGeometry = ref<THREE.BufferGeometry | null>(null)
const lineMaterial = ref<THREE.LineBasicMaterial | null>(null)

// 最后一次更新的路径点哈希，用于减少不必要的更新
let lastPathHash = '';

// 监听路径点变化，更新路径线 - 使用防抖优化和更简单的变化检测
const updatePathLineDebounced = debounce(updatePathLine, 500);

// 监听路径点变化，使用防抖减少频繁更新
watch(() => props.pathPoints, (newPoints) => {
  if (!Array.isArray(newPoints) || newPoints.length < 2) {
    lineGeometry.value = null;
    lineMaterial.value = null;
    return;
  }
  
  // 简单检查点数量是否变化
  const newLength = newPoints.length;
  const currentHash = `len:${newLength}`;
  
  if (currentHash !== lastPathHash) {
    lastPathHash = currentHash;
    updatePathLineDebounced();
  }
}, { deep: false }); // 设为false，减少深度遍历

// 更新路径线 - 简化处理过程
function updatePathLine() {
  if (!shouldRender.value) {
    // 清空几何体
    lineGeometry.value = null;
    lineMaterial.value = null;
    return;
  }
  
  // 创建路径顶点
  try {
    const points = optimizedPathPoints.value.map(point => {
      // 使用已经优化过的数据
      return new THREE.Vector3(point.position[0], point.position[1], point.position[2]);
    });
    
    // 创建新的几何体和材质
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: props.lineColor,
      linewidth: 2
    });
    
    // 更新引用
    lineGeometry.value = geometry;
    lineMaterial.value = material;
    
    // 如果geometryRef存在，更新它的几何体
    if (geometryRef.value && geometryRef.value.geometry) {
      geometryRef.value.geometry = geometry;
    }
  } catch (error) {
    console.error('更新路径线出错:', error);
    lineGeometry.value = null;
    lineMaterial.value = null;
  }
}

// 组件挂载后初始化
onMounted(() => {
  // 延迟初始化，避免首次加载卡顿
  setTimeout(() => {
    updatePathLine();
  }, 500);
});

// 组件卸载时清理
onBeforeUnmount(() => {
  // 清理资源
  if (lineGeometry.value) {
    lineGeometry.value.dispose();
    lineGeometry.value = null;
  }
  
  if (lineMaterial.value) {
    lineMaterial.value.dispose();
    lineMaterial.value = null;
  }
});
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
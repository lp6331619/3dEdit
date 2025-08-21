<template>
  <div v-if="isValidLight">
    <!-- 使用自定义可视化，避免Three.js内置辅助器的问题 -->
    
    <!-- 自定义灯光可视化模型 -->
    <TresGroup v-if="isValidLight">
      <!-- 灯光位置指示器 -->
      <TresMesh :position="lightPosition" :scale="[0.2, 0.2, 0.2]">
        <TresSphereGeometry :args="[1, 8, 8]" />
        <TresMeshBasicMaterial :color="lightColor" :transparent="true" :opacity="0.8" />
      </TresMesh>
      
      <!-- 灯光方向指示器 -->
      <TresArrowHelper
        v-if="lightType !== 'TresAmbientLight' && lightType !== 'TresPointLight'"
        :origin="lightPosition"
        :direction="lightDirection"
        :length="3"
        :color="lightColor"
        :head-length="0.5"
        :head-width="0.3"
      />
      
      <!-- 聚光灯锥体可视化 -->
      <TresGroup v-if="lightType === 'TresSpotLight' && showAdvancedHelper && isValidLight">
        <TresMesh :position="lightPosition" :rotation="lightRotation">
          <TresConeGeometry :args="[Math.tan((props.light.angle || 0.3)) * 5, 5, 8, 1, true]" />
          <TresMeshBasicMaterial :color="lightColor" :transparent="true" :opacity="0.1" :wireframe="true" />
        </TresMesh>
      </TresGroup>
      
      <!-- 点光源范围可视化 -->
      <TresGroup v-if="lightType === 'TresPointLight' && showAdvancedHelper && isValidLight">
        <TresMesh :position="lightPosition">
          <TresSphereGeometry :args="[(props.light.distance || 10), 16, 16]" />
          <TresMeshBasicMaterial :color="lightColor" :transparent="true" :opacity="0.05" :wireframe="true" />
        </TresMesh>
      </TresGroup>
      
      <!-- 平行光范围可视化 -->
      <TresGroup v-if="lightType === 'TresDirectionalLight' && showAdvancedHelper && isValidLight">
        <TresMesh :position="lightPosition" :rotation="lightRotation">
          <TresPlaneGeometry :args="[10, 10, 1, 1]" />
          <TresMeshBasicMaterial :color="lightColor" :transparent="true" :opacity="0.1" :wireframe="true" />
        </TresMesh>
      </TresGroup>
    </TresGroup>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useTresContext } from '@tresjs/core'
import * as THREE from 'three'

const props = defineProps({
  light: {
    type: Object,
    required: false,
    default: null
  },
  lightType: {
    type: String,
    required: true
  },
  showHelper: {
    type: Boolean,
    default: true
  },
  showAdvancedHelper: {
    type: Boolean,
    default: false
  }
})

const { scene } = useTresContext()

// 检查灯光是否有效
const isValidLight = computed(() => {
  try {
    if (!props.light || !props.lightType || !props.showHelper) {
      return false
    }
    
    // 检查位置
    if (!props.light.position) {
      return false
    }
    
    // 检查矩阵
    if (!props.light.matrix || !props.light.matrix.elements) {
      return false
    }
    
    // 确保位置是有效的Vector3
    if (typeof props.light.position.x !== 'number' || 
        typeof props.light.position.y !== 'number' || 
        typeof props.light.position.z !== 'number') {
      return false
    }
    
    return true
  } catch (e) {
    return false
  }
})

// 计算灯光位置 - 使用缓存避免重复计算
const lightPosition = computed(() => {
  if (!isValidLight.value || !props.light?.position) return [0, 0, 0]
  
  try {
    // 安全地获取位置数据
    const pos = props.light.position
    if (pos.toArray && typeof pos.toArray === 'function') {
      return pos.toArray()
    } else if (pos.x !== undefined && pos.y !== undefined && pos.z !== undefined) {
      return [pos.x, pos.y, pos.z]
    } else if (Array.isArray(pos)) {
      return [...pos]
    }
    return [0, 0, 0]
  } catch (e) {
    console.warn('LightHelper: 获取灯光位置时出错:', e)
    return [0, 0, 0]
  }
})

// 计算灯光颜色
const lightColor = computed(() => {
  if (!props.light) return '#ffffff'
  
  if (props.light.color) {
    return props.light.color.getHexString ? '#' + props.light.color.getHexString() : props.light.color
  }
  
  return '#ffffff'
})

// 计算灯光方向
const lightDirection = computed(() => {
  if (!props.light) return [0, -1, 0]
  
  if (props.lightType === 'TresDirectionalLight') {
    // 平行光方向
    if (props.light.target && props.light.target.position) {
      const direction = new THREE.Vector3()
      direction.subVectors(props.light.target.position, props.light.position).normalize()
      return direction.toArray()
    }
    return [0, -1, 0]
  } else if (props.lightType === 'TresSpotLight') {
    // 聚光灯方向
    if (props.light.target && props.light.target.position) {
      const direction = new THREE.Vector3()
      direction.subVectors(props.light.target.position, props.light.position).normalize()
      return direction.toArray()
    }
    return [0, -1, 0]
  }
  
  return [0, -1, 0]
})

// 计算灯光旋转
const lightRotation = computed(() => {
  if (!props.light) return [0, 0, 0]
  
  if (props.lightType === 'TresDirectionalLight' || props.lightType === 'TresSpotLight') {
    if (props.light.target && props.light.target.position) {
      const direction = new THREE.Vector3()
      direction.subVectors(props.light.target.position, props.light.position).normalize()
      
      // 计算旋转角度 - 使用正确的方法
      const rotation = new THREE.Euler()
      // 根据方向向量计算欧拉角
      if (direction.length() > 0) {
        // 计算Y轴旋转（水平方向）
        rotation.y = Math.atan2(direction.x, direction.z)
        // 计算X轴旋转（垂直方向）
        rotation.x = Math.asin(-direction.y)
      }
      return rotation.toArray()
    }
  }
  
  return [0, 0, 0]
})

// 监听灯光变化，更新辅助器 - 使用节流避免过度更新
watch(
  () => [props.light?.position, props.light?.color, props.lightType],
  () => {
    // 只在关键属性变化时更新
  },
  { deep: false }
)

// 组件挂载后设置灯光目标（如果需要）
onMounted(() => {
  try {
    if (props.light && (props.lightType === 'TresDirectionalLight' || props.lightType === 'TresSpotLight')) {
      // 如果没有目标，创建一个默认目标
      if (!props.light.target) {
        const target = new THREE.Object3D()
        target.position.set(0, 0, 0)
        // 确保目标对象有正确的方法
        if (!target.updateWorldMatrix) {
          target.updateWorldMatrix = function() {
            this.matrix.compose(this.position, this.quaternion, this.scale)
            this.matrixWorld.copy(this.matrix)
          }
        }
        props.light.target = target
        if (scene) {
          scene.add(target)
        }
      }
      
      // 确保现有目标也有正确的方法
      if (props.light.target && !props.light.target.updateWorldMatrix) {
        props.light.target.updateWorldMatrix = function() {
          this.matrix.compose(this.position, this.quaternion, this.scale)
          this.matrixWorld.copy(this.matrix)
        }
      }
    }
    
    // 确保灯光对象有正确的矩阵数据
    if (props.light && !props.light.matrix) {
      props.light.matrix = new THREE.Matrix4()
      props.light.matrix.identity()
    }
    
    if (props.light && props.light.matrix && !props.light.matrix.elements) {
      props.light.matrix.elements = new Float32Array(16)
      props.light.matrix.identity()
    }
  } catch (error) {
    console.warn('LightHelper: 设置灯光目标时出错:', error)
  }
})

// 组件卸载时清理
onUnmounted(() => {
  if (props.light && props.light.target && props.light.target !== scene) {
    scene.remove(props.light.target)
  }
})
</script>

<style scoped>
/* 可以添加一些样式 */
</style> 
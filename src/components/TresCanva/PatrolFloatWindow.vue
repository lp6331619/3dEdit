<!--
 * @Description: 定点巡视悬浮控制窗口
-->
<template>
  <div 
    class="patrol-float-window"
    :class="{ 'is-collapsed': isCollapsed }"
    @mouseenter="isCollapsed = false"
    @mouseleave="isCollapsed = true"
  >
    <div class="patrol-float-header">
      <div class="patrol-float-title">定点巡视</div>
      <div class="patrol-button" @click="togglePatrol">
        {{ isPatrolling ? '停止' : '开始' }}
      </div>
    </div>
    
    <div class="patrol-float-content">
      <div class="patrol-option">
        <div class="patrol-label">巡视模式</div>
        <el-radio-group v-model="patrolConfig.mode" >
          <el-radio-button v-for="item in patrolModes" :key="item.value" :label="item.value">
            {{ item.label }}
          </el-radio-button>
        </el-radio-group>
      </div>
      
      <div class="patrol-option">
        <div class="patrol-label">巡视速度</div>
        <div class="patrol-speed-control">
          <el-slider 
            v-model="patrolConfig.speed" 
            :min="1" 
            :max="12" 
            :step="1" 
            :format-tooltip="formatSpeed"
            size="small"
          />
          <el-input-number 
            v-model="patrolConfig.speed" 
            :min="1" 
            :max="12" 
            :step="1"
            size="small"
            controls-position="right"
          />
        </div>
      </div>
      
      <div class="patrol-info" v-if="pathPoints.length > 0">
        路径点: {{ pathPoints.length }}个
        <div v-if="isPatrolling && patrolConfig.activePointIndex >= 0" class="current-point-info">
          当前巡视：第 {{ patrolConfig.activePointIndex + 1 }} 个点
        </div>
      </div>
      <div v-else>
        <div class="patrol-info patrol-warning">
          请先添加路径点
        </div>
        <div class="patrol-action">
          <div class="patrol-button add-point" @click="addCurrentPositionAsPathPoint">
            添加当前位置为路径点
          </div>
        </div>
      </div>
      
      <!-- 显示简洁的路径点列表 -->
      <div v-if="pathPoints.length > 0 && isPatrolling" class="patrol-points-list">
        <div 
          v-for="(point, index) in pathPoints" 
          :key="index"
          class="patrol-point-item"
          :class="{'active-point': index === patrolConfig.activePointIndex}"
          @click="moveToPathPoint(index)"
        >
          {{ index + 1 }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePatrol } from '@/hooks/usePatrol.hook'

// 定点巡视状态
const { 
  patrolConfig, 
  startPatrol, 
  stopPatrol, 
  togglePatrol, 
  getPatrolStatus,
  getPathPoints,
  addCurrentPositionAsPathPoint,
  moveToPathPoint
} = usePatrol()

// 巡视状态
const isPatrolling = computed(() => getPatrolStatus().enabled)

// 路径点
const pathPoints = computed(() => getPathPoints())

// 巡视模式选项
const patrolModes = [
  { label: '单次巡视', value: 'once' },
  { label: '循环巡视', value: 'loop' },
  { label: '来回巡视', value: 'roundtrip' }
]

// 控制面板折叠状态
const isCollapsed = ref(true)

// 格式化速度显示的函数
const formatSpeed = (val: number): string => `${val}x`

// 监听配置变化
watch(() => patrolConfig, () => {
  // 监听到配置变化时，通过setPatrolParams更新巡视配置
  // 这样会触发立即同步到cameraConfig，确保数据被保存
  // 注意：因为已经在usePatrol.hook.ts的setPatrolParams函数中实现了同步
  // 而且patrolConfig是响应式的，所以这个监听实际上不需要做额外操作
  console.log('巡视配置已更改:', { 
    mode: patrolConfig.mode, 
    speed: patrolConfig.speed,
    pointsCount: pathPoints.value.length 
  });
}, { deep: true })

</script>

<style lang="scss" scoped>
.patrol-float-window {
  position: absolute;
  right: 20px;
  bottom: 20px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  color: white;
  width: 280px;
  z-index: 1000;
  backdrop-filter: blur(8px);
  transition: all 0.3s ease;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  :deep(.patrol-option .el-radio-button__inner){
    padding:4px 0;
  }
}

.patrol-float-window.is-collapsed {
  width: 130px;
  height: 40px;
}

.patrol-float-window.is-collapsed .patrol-float-content {
  display: none;
}

.patrol-float-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.patrol-float-title {
  font-weight: bold;
  font-size: 14px;
}

.patrol-button {
  padding: 4px 8px;
  background: #409EFF;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.patrol-button:hover {
  background: #66b1ff;
}

.patrol-button:active {
  background: #3a8ee6;
}

.patrol-float-content {
  padding: 12px;
}

.patrol-option {
  margin-bottom: 12px;
}

.patrol-label {
  margin-bottom: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.patrol-speed-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.patrol-speed-control :deep(.el-slider) {
  flex: 1;
}

.patrol-speed-control :deep(.el-input-number) {
  width: 70px;
}

.patrol-option :deep(.el-radio-group) {
  width: 100%;
  display: flex;
}

.patrol-option :deep(.el-radio-button) {
  flex: 1;
}

.patrol-option :deep(.el-radio-button__inner) {
  width: 100%;
  padding: 0;
  text-align: center;
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

.patrol-option :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: #409EFF;
  border-color: #409EFF;
}

.patrol-info {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 8px;
  text-align: center;
}

.patrol-warning {
  color: #f56c6c;
  font-weight: bold;
}

.patrol-action {
  margin-top: 12px;
  text-align: center;
}

.patrol-button.add-point {
  padding: 4px 8px;
  background: #67C23A;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.patrol-button.add-point:hover {
  background: #85CE61;
}

.patrol-button.add-point:active {
  background: #629A4E;
}

.current-point-info {
  margin-top: 4px;
  font-weight: bold;
  color: #409EFF;
}

.patrol-points-list {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.patrol-point-item {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.patrol-point-item:hover {
  background: rgba(255, 255, 255, 0.2);
}

.patrol-point-item.active-point {
  background: #409EFF;
  box-shadow: 0 0 8px rgba(64, 158, 255, 0.6);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}
</style> 
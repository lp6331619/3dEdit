<!--
 * @Author: Teemor
 * @Description: 定点巡视配置组件
-->
<template>
  <CollapseItem :name="'定点巡视'">
    <n-form>
      <setting-item-box name="巡视模式">
        <!-- 巡视模式 -->
        <n-form-item label="">
          <n-select v-model:value="patrolConfig.mode" :options="patrolModes" />
        </n-form-item>
      </setting-item-box>
      <!-- 巡视速度 -->
      <setting-item-box name="巡视速度">
        <setting-item>
          <n-slider v-model:value="patrolConfig.speed" :step="1" :min="1" :max="12" :tooltip="true"
          :format-tooltip="(value: number) => `${value}x`"></n-slider>
        </setting-item>
        <setting-item>
          <n-input-number v-model:value="patrolConfig.speed" :min="1" :step="1" :max="12" size="small"></n-input-number>
        </setting-item>
      </setting-item-box>
      <!-- 路径点管理 -->
      <n-form-item>
        <n-space vertical>
          <n-button 
            type="primary" 
            size="small" 
            @click="addCurrentPositionAsPathPoint"
          >
            添加当前位置为路径点
          </n-button>
          
          <n-card v-if="patrolConfig.pathPoints.length > 0" size="small" title="路径点列表">
            <n-list hoverable clickable>
              <n-list-item 
                v-for="(point, index) in patrolConfig.pathPoints" 
                :key="index"
                @click="moveToPathPoint(index)"
                class="path-point-item"
              >
                <n-thing>
                  <template #header>
                    <n-space>
                      <span>路径点 {{ index + 1 }}</span>
                      <n-tag size="small" type="success" v-if="index === 0">起点</n-tag>
                      <n-tag size="small" type="error" v-if="index === patrolConfig.pathPoints.length - 1">终点</n-tag>
                    </n-space>
                  </template>
                  <template #description>
                    <n-space vertical size="small">
                      <div>位置: {{ formatVector(point.position) }}</div>
                      <div>朝向: {{ formatVector(point.lookAt) }}</div>
                      <n-space>
                        <n-button size="tiny" type="warning" @click.stop="updatePathPoint(index)">更新</n-button>
                        <n-button size="tiny" type="error" @click.stop="removePathPoint(index)">删除</n-button>
                      </n-space>
                    </n-space>
                  </template>
                </n-thing>
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-icon size="18" class="preview-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512"><path d="M255.66 112c-77.94 0-157.89 45.11-220.83 135.33a16 16 0 0 0-.27 17.77C82.92 340.8 161.8 400 255.66 400c92.84 0 173.34-59.38 221.79-135.25a16.14 16.14 0 0 0 0-17.47C428.89 172.28 347.8 112 255.66 112z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"></path><circle cx="256" cy="256" r="80" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"></circle></svg>
                    </n-icon>
                  </template>
                  点击切换到此视角
                </n-tooltip>
              </n-list-item>
            </n-list>
          </n-card>
          
          <!-- 巡视控制 -->
          <n-space v-if="patrolConfig.pathPoints.length > 1">
            <n-button
              :type="patrolConfig.enabled ? 'error' : 'primary'"
              @click="togglePatrol"
            >
              {{ patrolConfig.enabled ? '停止巡视' : '开始巡视' }}
            </n-button>
            
            <n-button
              type="info"
              @click="testAllPathPoints"
              :disabled="patrolConfig.enabled"
            >
              测试所有点
            </n-button>
          </n-space>
        </n-space>
      </n-form-item>
      
      <!-- 提示信息 -->
      <n-form-item v-if="patrolConfig.pathPoints.length < 2">
        <n-alert type="info" title="提示">
          请至少添加两个路径点来创建巡视路径。
        </n-alert>
      </n-form-item>
      
      <!-- 键盘快捷键提示 -->
      <n-form-item>
        <n-collapse>
          <n-collapse-item title="键盘快捷键" name="shortcuts">
            <n-space vertical>
              <n-tag type="info">ALT + P: 添加当前位置为路径点</n-tag>
              <n-tag type="info">ALT + S: 开始/停止巡视</n-tag>
              <n-tag type="info">ALT + T: 测试所有点</n-tag>
            </n-space>
          </n-collapse-item>
        </n-collapse>
      </n-form-item>
    </n-form>
  </CollapseItem>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { SettingItemBox, SettingItem, CollapseItem } from '@/components/Pages/ChartItemSetting'
import { usePatrol } from '@/hooks/usePatrol.hook'
import { ElButton, ElInputNumber, ElSelect, ElOption, ElMessageBox } from 'element-plus'

// 巡视模式选项
const patrolModes = [
  { label: '单次巡视', value: 'once' },
  { label: '循环巡视', value: 'loop' },
  { label: '来回巡视', value: 'roundtrip' }
]

// 使用封装好的巡视Hook
const {
  patrolConfig,
  startPatrol,
  stopPatrol,
  togglePatrol,
  getPatrolStatus,
  setPatrolParams,
  getPathPoints,
  setPathPoints,
  addCurrentPositionAsPathPoint,
  updatePathPoint,
  removePathPoint,
  moveToPathPoint,
  testAllPathPoints,
  formatVector,
  isInitialized
} = usePatrol()

// 键盘快捷键
const handleKeyDown = (event: KeyboardEvent) => {
  // 检查是否按下Alt键
  if (event.altKey) {
    switch (event.key.toLowerCase()) {
      case 'p': // Alt+P: 添加当前位置为路径点
        addCurrentPositionAsPathPoint()
        break
      case 's': // Alt+S: 开始/停止巡视
        togglePatrol()
        break
      case 't': // Alt+T: 测试所有点
        if (!patrolConfig.enabled) {
          testAllPathPoints()
        }
        break
    }
  }
}

// 挂载时添加键盘事件监听
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

// 卸载时清理
onBeforeUnmount(() => {
  // 移除键盘事件监听
  window.removeEventListener('keydown', handleKeyDown)
})

// 暴露给外部的接口
defineExpose({
  startPatrol,
  stopPatrol,
  togglePatrol,
  getPatrolStatus,
  setPatrolParams,
  getPathPoints,
  setPathPoints,
  moveToPathPoint,
  addCurrentPositionAsPathPoint,
  testAllPathPoints,
});
</script>

<style scoped>
.patrol-panel {
  margin-top: 8px;
}

.path-point-item {
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.path-point-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
  border-left: 3px solid #2080f0;
}

.path-point {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 8px;
  background-color: #f5f7fa;
  border: 1px solid #e4e7ed;
}

.path-point-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.path-point-coords {
  font-size: 12px;
  color: #606266;
  overflow: auto;
}

.preview-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #2080f0;
  opacity: 0.6;
  transition: all 0.2s ease;
}

.path-point-item:hover .preview-icon {
  opacity: 1;
  transform: translateY(-50%) scale(1.2);
}
</style> 
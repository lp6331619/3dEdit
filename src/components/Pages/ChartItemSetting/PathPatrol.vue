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
import { ref, reactive, watch, onBeforeUnmount, computed, onMounted } from 'vue'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { SettingItemBox, SettingItem, CollapseItem, PathPatrol } from '@/components/Pages/ChartItemSetting'
import { getCameraPositionLookAt } from '@/hooks/useCanvas'
import { debounce } from 'lodash'
import { ElButton, ElInputNumber, ElSelect, ElOption, ElMessageBox } from 'element-plus'

// 获取chart编辑store
const chartEditStore = useChartEditStore()

// 相机配置 - 不使用类型断言，使用普通计算属性
const cameraConfig = computed(() => chartEditStore.getCameraConfig)

// 路径点懒加载标志 - 添加这个来控制初始加载时机
const isInitialized = ref(false)

// 巡视模式选项
const patrolModes = [
  { label: '单次巡视', value: 'once' },
  { label: '循环巡视', value: 'loop' },
  { label: '来回巡视', value: 'roundtrip' }
]

// 定义路径点类型
type PathPoint = {
  position: number[];
  lookAt: number[];
}

// 巡视配置
const patrolConfig = reactive({
  mode: 'once', // 巡视模式: once(单次), loop(循环), roundtrip(来回)
  speed: 5, // 巡视速度 (1-10)
  enabled: false, // 是否启用巡视
  pathPoints: [] as PathPoint[], // 路径点
  currentPointIndex: 0, // 当前巡视点索引
  direction: 1, // 巡视方向: 1(向前), -1(向后)
})

// 同步状态标记，防止循环更新
let isConfigSyncing = false;

// 动画控制变量
let animationTimer: number | null = null
let currentStep = 0
let steps = 0
let startPoint: PathPoint | null = null
let endPoint: PathPoint | null = null

// 控制器实例获取状态标志
let loggedError = false;

// 格式化向量显示
const formatVector = (vector: number[] | undefined) => {
  if (!vector) return '';
  return vector.map(v => {
    const num = Number(v);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  }).join(', ');
}

// 获取相机控制器实例 - 使用Pinia而非全局变量
const getControlsInstance = () => {
  try {
    // 尝试从Pinia获取控制器实例
    const controlsInstance = chartEditStore.getControlsInstance;
    if (controlsInstance) {
      // 控制器存在，无需重复输出日志
      return controlsInstance;
    }
    
    // 如果Pinia中没有实例，尝试从TresCanva直接获取
    const tresCanvas = document.querySelector('.tres-canvas');
    if (tresCanvas) {
      try {
        // @ts-ignore
        if (tresCanvas.__vue__) {
          // @ts-ignore
          const controls = tresCanvas.__vue__?.exposed?.controlsRef?.instance;
          if (controls) {
            // 找到控制器后保存到Pinia中，避免重复查找
            chartEditStore.setControlsInstance(controls);
            console.log('已找到并保存控制器实例到Pinia');
            return controls;
          }
        }
      } catch (err) {
        if (!loggedError) {
          console.error('获取控制器实例出错:', err);
          loggedError = true; // 防止重复输出错误
        }
      }
    }
    
    // 如果首次获取失败，记录错误并避免重复输出
    if (!loggedError) {
      console.log('未找到控制器实例');
      loggedError = true;
    }
    
    return null;
  } catch (err) {
    if (!loggedError) {
      console.error('控制器实例获取出错:', err);
      loggedError = true;
    }
    return null;
  }
}

// 添加当前位置为路径点
const addCurrentPositionAsPathPoint = () => {
  try {
    // 获取当前相机位置和朝向
    if (cameraConfig.value) {
      // 使用类型断言
      const configValue = cameraConfig.value as any
      const position = [...(configValue.cameraPosition || [0, 0, 5])]
      const lookAt = [...(configValue.cameraLookAt || [0, 0, 0])]
      
      // 添加路径点
      patrolConfig.pathPoints.push({
        position,
        lookAt
      })
      console.log('已添加路径点:', {position, lookAt})
    }
  } catch (error) {
    console.error('添加路径点失败:', error)
  }
}

// 更新路径点
const updatePathPoint = (index: number) => {
  try {
    if (cameraConfig.value && index >= 0 && index < patrolConfig.pathPoints.length) {
      // 使用类型断言
      const configValue = cameraConfig.value as any
      const position = [...(configValue.cameraPosition || [0, 0, 5])]
      const lookAt = [...(configValue.cameraLookAt || [0, 0, 0])]
      
      // 更新指定路径点
      patrolConfig.pathPoints[index] = {
        position,
        lookAt
      }
      
      console.log(`已更新路径点 ${index + 1}:`, {position, lookAt})
    }
  } catch (error) {
    console.error('更新路径点失败:', error)
  }
}

// 移除路径点
const removePathPoint = (index: number) => {
  if (index >= 0 && index < patrolConfig.pathPoints.length) {
    patrolConfig.pathPoints.splice(index, 1)
    console.log(`已删除路径点 ${index + 1}`)
  }
}

// 移动到指定路径点
const moveToPathPoint = (index: number) => {
  try {
    const point = patrolConfig.pathPoints[index]
    if (point) {
      // 使用控制器移动相机
      const controls = getControlsInstance()
      if (controls) {
        console.log('移动到路径点:', point.position, point.lookAt)
        
        // 临时设置状态标记，防止在动画过程中更新cameraConfig
        chartEditStore.setInPatrolAnimation(true);
        
        // 设置相机位置和朝向
        controls.setLookAt(
          point.position[0] || 0, 
          point.position[1] || 0, 
          point.position[2] || 0,
          point.lookAt[0] || 0, 
          point.lookAt[1] || 0, 
          point.lookAt[2] || 0,
          true // 开启过渡动画
        )
        
        console.log(`已移动到路径点 ${index + 1}`);
        
        // 在动画完成后重置状态标记
        setTimeout(() => {
          chartEditStore.setInPatrolAnimation(false);
        }, 1000);
        
        // 使用全局提示组件显示通知
        window['$message']?.success(`已切换到路径点 ${index + 1}`);
      } else {
        console.warn('未找到相机控制器实例')
        window['$message']?.error('未找到相机控制器实例');
      }
    }
  } catch (error) {
    console.error('移动到路径点失败:', error)
    window['$message']?.error('移动到路径点失败');
  }
}

// 测试所有路径点
const testAllPathPoints = async () => {
  for (let i = 0; i < patrolConfig.pathPoints.length; i++) {
    moveToPathPoint(i)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

// 切换巡视状态
const togglePatrol = () => {
  patrolConfig.enabled = !patrolConfig.enabled
  
  if (patrolConfig.enabled) {
    startPatrol()
  } else {
    stopPatrol()
  }
}

// 启动巡视
const startPatrol = () => {
  if (patrolConfig.pathPoints.length < 2) {
    console.log('路径点不足，至少需要2个点');
    patrolConfig.enabled = false;
    return;
  }
  
  console.log('开始巡视, 模式:', patrolConfig.mode);
  patrolConfig.currentPointIndex = 0;
  patrolConfig.direction = 1;
  
  // 设置状态，防止在巡视过程中更新cameraConfig
  chartEditStore.setInPatrolAnimation(true);
  
  // 执行第一段动画
  animateToNextPoint();
}

// 停止巡视
const stopPatrol = () => {
  patrolConfig.enabled = false;
  
  // 清除动画定时器
  if (animationTimer !== null) {
    cancelAnimationFrame(animationTimer as any);
    clearTimeout(animationTimer as any);
    animationTimer = null;
  }
  
  // 清除状态标记
  chartEditStore.setInPatrolAnimation(false);
  
  console.log('巡视已停止');
}

// 动画到下一个点
const animateToNextPoint = () => {
  if (!patrolConfig.enabled || patrolConfig.pathPoints.length < 2) {
    stopPatrol();
    return;
  }
  
  const currentIndex = patrolConfig.currentPointIndex;
  let nextIndex = currentIndex + patrolConfig.direction;
  
  // 根据巡视模式处理边界情况
  if (nextIndex >= patrolConfig.pathPoints.length) {
    // 处理到达终点的情况
    switch (patrolConfig.mode) {
      case 'once':
        // 单次巡视，到达终点后停止
        stopPatrol();
        return;
        
      case 'loop':
        // 循环巡视，回到起点
        nextIndex = 0;
        break;
        
      case 'roundtrip':
        // 来回巡视，到达终点后改变方向
        patrolConfig.direction = -1;
        nextIndex = patrolConfig.pathPoints.length - 2;
        break;
    }
  } else if (nextIndex < 0) {
    // 处理回到起点的情况 (仅在来回巡视模式下会发生)
    patrolConfig.direction = 1;
    nextIndex = 1;
  }
  
  // 设置起点和终点，并深拷贝避免引用问题
  startPoint = patrolConfig.pathPoints[currentIndex] ?JSON.parse(JSON.stringify(patrolConfig.pathPoints[currentIndex])):[];
  endPoint = patrolConfig.pathPoints[nextIndex]?JSON.parse(JSON.stringify(patrolConfig.pathPoints[nextIndex])):[];
  
  // 确保路径点数据格式正确
  if (!startPoint || !endPoint) {
    console.error('路径点数据无效');
    stopPatrol();
    return;
  }
  
  // 根据速度计算步数
  // 速度越高，步数越少，动画越快
  steps = Math.max(20, 100 - patrolConfig.speed * 8);
  currentStep = 0;
  
  // 更新当前点索引
  patrolConfig.currentPointIndex = nextIndex;
  
  console.log(`巡视至点 ${nextIndex + 1}, 共 ${patrolConfig.pathPoints.length} 个点`);
  
  // 设置状态，防止在巡视过程中更新cameraConfig
  chartEditStore.setInPatrolAnimation(true);
  
  // 开始动画
  animateFrame();
}

// 创建一个动画帧函数
const animateFrame = () => {
  if (!patrolConfig.enabled || !startPoint || !endPoint) {
    console.log('动画被中止');
    return;
  }
  
  currentStep++;
  const progress = currentStep / steps;
  
  // 线性插值计算当前位置和朝向 - 修复类型错误
  const posX = parseFloat(startPoint.position[0] as any) + (parseFloat(endPoint.position[0] as any) - parseFloat(startPoint.position[0] as any)) * progress;
  const posY = parseFloat(startPoint.position[1] as any) + (parseFloat(endPoint.position[1] as any) - parseFloat(startPoint.position[1] as any)) * progress;
  const posZ = parseFloat(startPoint.position[2] as any) + (parseFloat(endPoint.position[2] as any) - parseFloat(startPoint.position[2] as any)) * progress;
  
  const lookX = parseFloat(startPoint.lookAt[0] as any) + (parseFloat(endPoint.lookAt[0] as any) - parseFloat(startPoint.lookAt[0] as any)) * progress;
  const lookY = parseFloat(startPoint.lookAt[1] as any) + (parseFloat(endPoint.lookAt[1] as any) - parseFloat(startPoint.lookAt[1] as any)) * progress;
  const lookZ = parseFloat(startPoint.lookAt[2] as any) + (parseFloat(endPoint.lookAt[2] as any) - parseFloat(startPoint.lookAt[2] as any)) * progress;
  
  // 临时标记，防止巡视过程中的位置变化触发cameraConfig更新
  chartEditStore.setInPatrolAnimation(true);
  
  // 使用控制器移动相机
  const controls = getControlsInstance();
  if (controls) {
    try {
      // 只在开始和结束时输出日志，减少日志量
      if (currentStep === 1 || currentStep === steps) {
        console.log(`巡视动画 [${currentStep}/${steps}] 位置=[${posX.toFixed(2)},${posY.toFixed(2)},${posZ.toFixed(2)}]`);
      }
      
      // 确保所有参数都是数字
      controls.setLookAt(
        isNaN(posX) ? 0 : posX, 
        isNaN(posY) ? 0 : posY, 
        isNaN(posZ) ? 0 : posZ,
        isNaN(lookX) ? 0 : lookX, 
        isNaN(lookY) ? 0 : lookY, 
        isNaN(lookZ) ? 0 : lookZ,
        false // 关闭过渡动画，由我们自己控制
      );
    } catch (error) {
      console.error('移动相机出错:', error);
      // 发生错误时停止巡视，避免卡死
      stopPatrol();
      return;
    }
  } else {
    console.error('无法执行动画帧：控制器实例为空');
    // 没有控制器时也停止巡视
    stopPatrol();
    return;
  }
  
  // 判断是否继续动画
  if (currentStep < steps) {
    // 计算下一帧的间隔时间
    // 速度越高，间隔越短，动画越快
    const frameDelay = Math.max(10, 50 - patrolConfig.speed * 4);
    
    // 计划下一帧动画 - 使用RAF代替setTimeout提高性能
    cancelAnimationFrame(animationTimer as any);
    animationTimer = requestAnimationFrame(() => {
      // 设置延迟执行
      setTimeout(animateFrame, frameDelay);
    }) as unknown as number;
  } else {
    // 当前段动画结束，移动到下一段
    cancelAnimationFrame(animationTimer as any);
    animationTimer = requestAnimationFrame(() => {
      setTimeout(animateToNextPoint, 500);
    }) as unknown as number;
  }
}

// 同步全局cameraConfig.fixedPointInspection到路径点和巡视配置(初始加载)
watch(
  () => cameraConfig.value && (cameraConfig.value as any).fixedPointInspection,
  (newConfig) => {
    if (!newConfig) return;
    
    // 跳过首次加载，等mounted时再加载
    if (!isInitialized.value) return;
    
    // 如果已经在同步中，避免循环更新
    if (isConfigSyncing) return;
    
    // 如果是在巡视动画中，跳过配置更新
    if (patrolConfig.enabled) {
      console.log('巡视动画中，跳过配置加载');
      return;
    }
    
    try {
      isConfigSyncing = true;
      
      // 检查是否是扩展的格式
      if (typeof newConfig === 'object') {
        // 加载配置
        if (newConfig.config) {
          const { mode, speed } = newConfig.config;
          if (mode && mode !== patrolConfig.mode) patrolConfig.mode = mode;
          if (typeof speed === 'number' && speed !== patrolConfig.speed) patrolConfig.speed = speed;
        }
        
        // 加载路径点，仅当有实际变化时才更新
        if (Array.isArray(newConfig.pathPoints)) {
          // 简单比较路径点长度，避免频繁的深度比较
          if (newConfig.pathPoints.length !== patrolConfig.pathPoints.length) {
            // 深拷贝以避免引用问题，并只使用必要的数据
            patrolConfig.pathPoints = newConfig.pathPoints.map((point: { position: number[], lookAt: number[] }) => ({
              position: [...(point.position || [0, 0, 0])],
              lookAt: [...(point.lookAt || [0, 0, 0])]
            }));
            
            console.log('已从相机配置加载完整定点巡视数据');
          } else if (patrolConfig.pathPoints.length === 0 && newConfig.pathPoints.length > 0) {
            // 首次加载路径点
            patrolConfig.pathPoints = newConfig.pathPoints.map((point: { position: number[], lookAt: number[] }) => ({
              position: [...(point.position || [0, 0, 0])],
              lookAt: [...(point.lookAt || [0, 0, 0])]
            }));
            
            console.log('首次加载路径点数据');
          }
        }
      } 
      // 兼容旧格式(直接是路径点数组)
      else if (Array.isArray(newConfig)) {
        // 简单比较路径点长度，避免频繁的深度比较
        if (newConfig.length !== patrolConfig.pathPoints.length) {
          patrolConfig.pathPoints = newConfig.map((point: { position: number[], lookAt: number[] }) => ({
            position: [...(point.position || [0, 0, 0])],
            lookAt: [...(point.lookAt || [0, 0, 0])]
          }));
          
          console.log('已从相机配置加载定点巡视路径点数据');
        }
      }
    } catch (error) {
      console.error('处理巡视配置数据出错:', error);
    } finally {
      // 延迟重置同步状态标记，避免立即触发其他监听器
      setTimeout(() => {
        isConfigSyncing = false;
      }, 500);
    }
  },
  { 
    immediate: false, // 改为false，首次不加载
    deep: false, // 改为false，避免深度监听带来的性能问题
    flush: 'post'
  }
);

// 同步路径点和巡视配置到cameraConfig.fixedPointInspection
const syncPatrolConfigDebounced = debounce(() => {
  // 如果已经在同步中，避免循环更新
  if (isConfigSyncing) return;
  
  // 如果是在巡视动画中，跳过配置更新
  if (patrolConfig.enabled) {
    console.log('巡视动画中，跳过配置同步');
    return;
  }
  
  try {
    isConfigSyncing = true;
    
    // 构建完整的巡视配置对象，使用深拷贝避免引用问题
    const completeConfig = {
      pathPoints: patrolConfig.pathPoints.map(point => ({
        position: [...point.position],
        lookAt: [...point.lookAt]
      })),
      config: {
        mode: patrolConfig.mode,
        speed: patrolConfig.speed
      },
      inPatrolAnimation: patrolConfig.enabled,
      controlsInstance: cameraConfig.value?.fixedPointInspection?.controlsInstance || null
    };
    
    // 构建新的相机配置对象
    const newCameraConfig = { ...cameraConfig.value };
    
    // 优化比较逻辑，只比较有意义的字段而不是整个对象
    const currentPathPoints = newCameraConfig.fixedPointInspection?.pathPoints || [];
    const currentConfig = newCameraConfig.fixedPointInspection?.config || {} as { mode?: string; speed?: number };
    
    // 比较路径点数量，如果数量不同，肯定需要更新
    let needUpdate = currentPathPoints.length !== completeConfig.pathPoints.length;
    
    // 如果数量相同，比较配置参数是否有变化
    if (!needUpdate) {
      // 比较配置参数
      if (currentConfig.mode !== completeConfig.config.mode || 
          currentConfig.speed !== completeConfig.config.speed ||
          newCameraConfig.fixedPointInspection?.inPatrolAnimation !== completeConfig.inPatrolAnimation) {
        needUpdate = true;
      }
      // 跳过路径点的深度比较，减少计算量
    }
    
    // 只有当配置有实际变化时才更新
    if (needUpdate) {
      // 更新fixedPointInspection字段为完整配置
      newCameraConfig.fixedPointInspection = completeConfig;
      
      // 更新相机配置
      chartEditStore.setCameraConfig(newCameraConfig);
      console.log('已同步巡视配置到cameraConfig');
    }
  } catch (error) {
    console.error('同步巡视配置出错:', error);
  } finally {
    // 延迟重置同步状态标记
    setTimeout(() => {
      isConfigSyncing = false;
    }, 500);
  }
}, 1000); // 进一步增加防抖时间，避免频繁更新

// 路径点变化监听 - 减少频率
let pathPointsChangeTimer: number | null = null;
watch(() => patrolConfig.pathPoints, () => {
  // 避免频繁触发
  if (pathPointsChangeTimer) {
    clearTimeout(pathPointsChangeTimer);
  }
  pathPointsChangeTimer = window.setTimeout(() => {
    syncPatrolConfigDebounced();
    pathPointsChangeTimer = null;
  }, 1000);
}, { deep: false }); // 设为false，减少深度监听

// 监听模式变化
watch(() => patrolConfig.mode, () => {
  syncPatrolConfigDebounced();
});

// 监听速度变化
watch(() => patrolConfig.speed, () => {
  syncPatrolConfigDebounced();
});

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

  // 延迟加载路径点数据，避免首次渲染时卡顿
  setTimeout(() => {
    // 加载控制器实例
    const controls = getControlsInstance()
    console.log('巡视控制器状态:', controls ? '可用' : '不可用')
    
    // 显式一次性加载配置数据
    try {
      isConfigSyncing = true;
      const config = cameraConfig.value;
      if (config && config.fixedPointInspection) {
        // 加载配置
        if (config.fixedPointInspection.config) {
          patrolConfig.mode = config.fixedPointInspection.config.mode || 'once';
          patrolConfig.speed = config.fixedPointInspection.config.speed || 5;
        }
        
        // 加载路径点
        if (Array.isArray(config.fixedPointInspection.pathPoints)) {
          patrolConfig.pathPoints = config.fixedPointInspection.pathPoints.map(point => ({
            position: [...(point.position || [0, 0, 0])],
            lookAt: [...(point.lookAt || [0, 0, 0])]
          }));
          console.log('已延迟加载定点巡视数据');
        }
      }
      
      // 标记已初始化，可以开始监听变化
      isInitialized.value = true;
    } catch (error) {
      console.error('初始化巡视数据出错:', error);
    } finally {
      // 重置同步状态
      setTimeout(() => {
        isConfigSyncing = false;
      }, 500);
    }
  }, 500);
})

// 卸载时清理
onBeforeUnmount(() => {
  // 停止巡视
  stopPatrol()
  
  // 移除键盘事件监听
  window.removeEventListener('keydown', handleKeyDown)
  
  // 清除全局标记
  chartEditStore.setInPatrolAnimation(false)
  
  // 清理定时器
  if (pathPointsChangeTimer) {
    clearTimeout(pathPointsChangeTimer);
    pathPointsChangeTimer = null;
  }
})
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
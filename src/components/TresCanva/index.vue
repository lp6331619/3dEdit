<template>
  <div style="width: 900px; max-height: 200px; overflow-y: auto">
    {{ targetChart }}
  </div>
  <div class="tres-canvas-container">
    <TresCanvas v-bind="canvasConfig" ref="TresCanvasRef" renderMode="on-demand">
      <!-- 轴 -->
      <TresAxesHelper :args="[100]" />
      <!-- 轨道控制器 -->
      <!-- <OrbitControls make-default ref="controlsRef" v-bind="cameraConfig" @end="OrbitControlsEnd" /> -->
      <!-- 坐标格辅助对象 -->
      <TresGridHelper :args="[1000, 100]" />
      <!-- 透视摄像机 -->
      <TresPerspectiveCamera ref="cameraRefs"/>
      <CameraControls
        v-if="cameraRefs"
        :camera="cameraRefs"
        ref="controlsRef"
        make-default
        v-bind="cameraConfig"
        :azimuthAngle="angle.azimuthAngle"
        :polarAngle="angle.polarAngle"
        :distance="angle.distance"
        @change="OrbitControlsChange"
      />
      <!-- 环境光 -->
      <TresAmbientLight :intensity="2" />
      <TresDirectionalLight
        :intensity="2"
        :position="[2, 3, 0]"
        :cast-shadow="true"
        :shadow-camera-far="50"
        :shadow-camera-left="-10"
        :shadow-camera-right="10"
        :shadow-camera-top="10"
        :shadow-camera-bottom="-10"
      />
      <!-- 灯光 -->
      <component
        v-for="(item, i) in config.lightSetting"
        :key="i"
        ref="lightRef"
        :is="item.type"
        v-bind="item.config"
      />
      <tresItem
        :components="components"
        :componentList="config.componentList"
        :isPreview="isPreview"
        @click="clickFun"
        @rightClick="clickRight"
        @fitTo="fitToBox"
      />
      <!-- 变换控制器 -->
      <TransformControls
        v-if="transformControlsState.enabled && !isPreview"
        :object="transformRef"
        v-bind="transformControlsState"
        @dragging="ControlsStateMouseDown"
      />
      <!-- 巡视路径线 -->
      <PatrolPathLine v-if="patrolPathPoints.length > 1 && !isPreview" :pathPoints="patrolPathPoints" />
      <Stats v-if="canvasConfig.isFps" />
    </TresCanvas>
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  defineAsyncComponent,
  onUnmounted,
  computed,
  toRef,
  watchEffect,
  nextTick,
  onMounted,
  watch,
  onUpdated,
  shallowRef,
  getCurrentInstance,
  provide,
  markRaw
} from 'vue'
import { useRenderLoop, useTresContext, vLightHelper } from '@tresjs/core'
// import { initEvents, registerEvent, unregisterEvent, updateEvents } from '@/utils/event'
import {
  OrbitControls,
  TransformControls,
  CameraControls,
  Stars,
  Sky,
  useGLTF,
  StatsGl,
  Html,
  Stats,
  GLTFModel
} from '@tresjs/cientos'
import {
  loadingStart,
  loadingFinish,
  loadingError,
  setComponentPosition,
  JSONParse,
  debounce,
  deepClone,
  getCameraPositionLookAt
} from '@/utils'
import { Raycaster, Vector2, Vector3, Plane, Euler } from 'three'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { storeToRefs } from 'pinia'
import * as TWEEN from '@tweenjs/tween.js'
import { netWorkInternal } from '@/hooks/netWorkInternal.hook'
// import { defaultOption, defaultChildren } from '@/settings/designSetting'
// import { useComponentStyle, useSizeStyle } from '@/views/chart/contentEdit/hooks/useStyle.hook'
// import { animationsClass, getFilterStyle, getTransformStyle, getBlendModeStyle, colorCustomMerge } from '@/utils'
// import { dragHandle, dragoverHandle } from '@/views/chart/ContentEdit/hooks/useDrag.hook'
// import { effectComposerConfig, outlinePassListConfig } from './effectConfig'
import * as THREE from 'three'
import { useTres, TresCanvas } from '@tresjs/core'
import lodash from 'lodash'
const ModelLoad = defineAsyncComponent(() => import('@/components/ModelLoad/index.vue'))
// const Effect = defineAsyncComponent(() => import('./effect.vue'))
const tresItem = defineAsyncComponent(() => import('./item.vue'))
const PatrolPathLine = defineAsyncComponent(() => import('./PatrolPathLine.vue'))

// 添加全局变量用于控制渲染循环和变换操作
if (typeof window !== 'undefined') {
  window._tresCanvaThrottled = false;
  window.transformBusy = false;
  window._lastRenderTime = 0;
  window.requestAnimationFrameThrottled = false;
}

const props = defineProps({
  isPreview: {
    type: Boolean,
    default: false
  }
})
const chartEditStore = useChartEditStore()
const { transformRef, canvasRefs } = storeToRefs(chartEditStore)
// 模型配置
const componentList = chartEditStore.getComponentList
// 画布配置
const canvasConfig = chartEditStore.getEditCanvasConfig
// 相机配置
const cameraConfig = chartEditStore.getCameraConfig
// 灯光配置
const lightSetting = chartEditStore.getLightSetting
// 变换配置
const transformControlsState = chartEditStore.getTransformControlsState
// 组件列表ref
const componentListRef = chartEditStore.getComponentListRef

// 巡视路径点
const patrolPathPoints = computed(() => {
  // 从cameraConfig.fixedPointInspection.pathPoints中获取而不是从Pinia获取
  const config = cameraConfig ? cameraConfig : {}
  const fixedPointInspection = config.fixedPointInspection || { pathPoints: [] }
  return Array.isArray(fixedPointInspection.pathPoints) ? fixedPointInspection.pathPoints : []
})

// 定点巡视面板数据
const patrolMode = ref('once')
const patrolSpeed = ref(5)
const patrolActive = ref(false)
const patrolModeOptions = [
  { label: '单次', value: 'once' },
  { label: '循环', value: 'loop' },
  { label: '来回', value: 'roundtrip' }
]

const targetChart = chartEditStore.getTargetChart
const emits = defineEmits(['click', 'rightClick'])
const TresCanvasRef = shallowRef()
const cameraRefs = shallowRef()
const lightRef = shallowRef([])
const controlsRef = shallowRef()
const angle = ref({
  azimuthAngle: 0.6, //方位角
  polarAngle: 1.25, //方位角
  distance: 25
})
// 模型
const config = reactive({
  componentList: [],
  lightSetting: [],
  htmlList: {}
})
const instance = getCurrentInstance()
const components = markRaw(instance?.appContext.components || {})
// // 提供给子组件
provide('components', components)

//递归更新所有层级的配置
const digList = (list) => {
  const min = 1
  const max = 100
  const randomInteger = Math.floor(Math.random() * (max - min + 1)) + min
  const l = deepClone(list || [])
  return l.map((item, i) => {
    if (item.groupList?.length) {
      item.groupList = digList(item.groupList)
    }
    return {
      ...item,
      option: { position: [0, 0, 0], ...item.option },
      key: item.type == 'Html' ? item.id + randomInteger : item.id
    }
  })
}

// 更新配置
watch(
  () => componentList,
  e => {
    // config.componentList = deepClone(e||[])
    config.componentList = e ? digList(e) : []
    // 所有ref存到componentListRef里
    nextTick(() => {
      componentListRef.value = []
      config.componentList?.map((item) => {
        item.el && componentListRef.value.push(item.el)
        item.groupList?.map((cc) => {
          cc.el && componentListRef.value.push(cc.el)
        })
        // 更新贴图
        item.children?.forEach((itemc) => {
          if (itemc.el && itemc.el.material && !itemc.el.isTransformControls) {
            // 只更新贴图，不clone材质
            let needUpdate = false;
            for (let prop in itemc.el.material) {
              if (itemc.el.material[prop] && itemc.el.material[prop].isTexture) {
                itemc.el.material[prop].needsUpdate = true;
                needUpdate = true;
              }
            }
            // 只在确实有贴图变化时才设置材质更新
            needUpdate && (itemc.el.material.needsUpdate = true)
          }
        });
      })
      console.log(config.componentList, componentListRef.value, '更新组件')
    })
  },
  { deep: true, immediate: true }
)
const clickFun = (e) => {
  emits('click', e)
}
const clickRight = (e, item) => {
  emits('rightClick', {
    e: e,
    item: item
  })
  transformControlsState.enabled = false
  transformRef.value = null
}
const fitToBox = (current) => {
  controlsRef.value?.instance?.fitToBox(current, true)
}

//获取当前选中组件

// 灯光
watch(
  () => lightSetting,
  e => {
    config.lightSetting = deepClone(e || [])
  },
  { deep: true, immediate: true }
)
const { onLoop, onBeforeLoop, onAfterLoop, pause, resume } = useRenderLoop()
// 变换控制器 - 简化版本，专注于解决性能问题
const ControlsStateMouseDown = (isMove) => {
  // 防止重复处理
  if (!transformRef.value || isMove) return;
  
  // 标记为变换中，避免其他渲染循环干扰
  window.transformBusy = true;
  
  try {
    // 安全地获取对象，忽略属性类型检查错误
    const item = chartEditStore.getComponentListItem(transformRef.value.onlyId);
    if (!item) {
      window.transformBusy = false;
      return;
    }
    
    // 尝试获取变换信息
    let position = [0, 0, 0];
    let scale = [1, 1, 1];
    let rotation = [0, 0, 0];
    
    if (transformRef.value.position) {
      try {
        const pos = transformRef.value.position.clone();
        position = pos.toArray();
      } catch (e) {}
    }
    
    if (transformRef.value.scale) {
      try {
        const scl = transformRef.value.scale.clone();
        scale = scl.toArray();
      } catch (e) {}
    }
    
    if (transformRef.value.rotation) {
      try {
        const rot = transformRef.value.rotation.clone();
        rotation = rot.toArray();
      } catch (e) {}
    }
    
    // 处理HTML元素特殊情况
    if (item.type === 'Html' && transformControlsState.mode === 'scale') {
      const [x, y, z] = scale;
      if (item.attr && item.attr.w != null && item.attr.h != null) {
        useChartEditStore().setComponentList(
          item.id, 
          { w: item.attr.w * x, h: item.attr.h * y }, 
          'attr'
        );
      }
    }
    
    // 更新组件位置信息
    if (item.id) {
      useChartEditStore().setComponentList(
        item.id,
        {
          position: position,
          scale: scale,
          rotation: rotation
        },
        'option'
      );
    }
  } catch (error) {
    console.error('变换控制器处理错误:', error);
  } finally {
    // 延迟重置状态，给变换操作完成的时间
    setTimeout(() => {
      window.transformBusy = false;
    }, 50);
  }
}

const handleCameraChange = debounce((distance) => {
  // 如果在巡视动画中，跳过更新cameraConfig
  if (chartEditStore.getInPatrolAnimation === true) {
    console.log('巡视动画中，跳过相机配置更新');
    return;
  }
  
  try {
    const {lookAt, position} = getCameraPositionLookAt(TresCanvasRef.value, distance);
    
    // 安全地更新相机配置，忽略类型错误
    if (cameraConfig) {
      // 创建新的配置对象，保留原有的fixedPointInspection数据
      const newCameraConfig = { ...cameraConfig };
      
      // 检查是否有实际变化，避免不必要的更新
      const posChanged = JSON.stringify(newCameraConfig.cameraPosition) !== JSON.stringify(position);
      const lookAtChanged = JSON.stringify(newCameraConfig.cameraLookAt) !== JSON.stringify(lookAt);
      
      if (posChanged || lookAtChanged) {
        newCameraConfig.cameraPosition = position;
        newCameraConfig.cameraLookAt = lookAt;
        chartEditStore.setCameraConfig(newCameraConfig);
      }
    }
  } catch (e) {
    console.error('相机设置错误:', e);
  }
}, 300);

let isFirst = true;
//监听控制器
const OrbitControlsChange = (e) => {
  if (isFirst) {
    isFirst = false;
    return;
  }
  
  // 如果在巡视动画中，跳过更新cameraConfig
  if (chartEditStore.getInPatrolAnimation === true) {
    return;
  }
  
  try {
    const { distance, polarAngle, azimuthAngle } = e;
    
    // 安全地更新相机角度设置，忽略类型错误
    if (cameraConfig) {
      // 创建新的配置对象，保留原有的fixedPointInspection数据
      const newCameraConfig = { ...cameraConfig };
      
      // 检查是否有实际变化
      if (newCameraConfig.distancess !== distance || 
          newCameraConfig.azimuthAngless !== azimuthAngle ||
          newCameraConfig.polarAngless !== polarAngle) {
        
        newCameraConfig.distancess = distance;
        newCameraConfig.azimuthAngless = azimuthAngle;
        newCameraConfig.polarAngless = polarAngle;
        
        // 由于handleCameraChange也会调用setCameraConfig，这里不重复调用
        handleCameraChange(distance);
      }
    }
  } catch (e) {
    console.error('控制器设置错误:', e);
  }
}

// 优化渲染循环 - 移除多余的requestAnimationFrame嵌套，使用合理的更新策略
onLoop(({ delta, elapsed }) => {
  // 变换操作时跳过常规更新
  if (window.transformBusy) return;
  
  // 使用简单的节流机制避免过度渲染
  const now = Date.now();
  const timeSinceLastRender = now - (window._lastRenderTime || 0);
  
  // 每30ms最多执行一次更新（约33fps，足够流畅且不会过度消耗资源）
  if (timeSinceLastRender > 30) {
    window._lastRenderTime = now;
    
    // 直接执行必要的更新，不使用嵌套的requestAnimationFrame
    // 更新TWEEN动画
    if (TWEEN) {
      TWEEN.update(elapsed * 1000);
    }
  }
})

onAfterLoop((res) => {
  // 可以在这里添加渲染完成后的操作
})

onMounted(() => {
  // const domEl = document.querySelector('.tres-canvas-container')!
  setTimeout(() => {
    nextTick(() => {
      if (TresCanvasRef.value) {
        canvasRefs.value = TresCanvasRef.value
        // 调用netWorkInternal初始化
        netWorkInternal(2000)
        
        // 安全地更新角度设置
        if (cameraConfig) {
          angle.value = {
            azimuthAngle: cameraConfig.azimuthAngless || 0.6,
            polarAngle: cameraConfig.polarAngless || 1.25,
            distance: cameraConfig.distancess || 25
          }
        }
        
        // 设置相机位置
        try {
          const { instance } = controlsRef.value || {};
          if (instance && cameraConfig && cameraConfig.cameraPosition && cameraConfig.cameraLookAt) {
            // 使用Pinia存储控制器实例，不再使用全局变量
            chartEditStore.setControlsInstance(instance);
            console.log('已将控制器实例存储到Pinia store');
            
            // 测试控制器实例是否有setLookAt方法
            if (typeof instance.setLookAt === 'function') {
              console.log('控制器实例的setLookAt方法可用');
              
              // 移动相机到初始位置
              instance.setLookAt(
                ...(cameraConfig.cameraPosition || [0, 0, 5]),
                ...(cameraConfig.cameraLookAt || [0, 0, 0]),
                true
              );
              console.log('已将相机移动到初始位置');
            } else {
              console.error('控制器实例缺少setLookAt方法');
            }
          } else {
            console.error('控制器实例或相机配置无效:', {
              hasInstance: !!instance,
              hasCameraConfig: !!cameraConfig,
              hasPosition: !!(cameraConfig && cameraConfig.cameraPosition),
              hasLookAt: !!(cameraConfig && cameraConfig.cameraLookAt)
            });
          }
        } catch (e) {
          console.error('设置相机位置出错:', e);
        }
      }
    })
  }, 300)
  
  const canvas = document.querySelector('.tres-canvas-container > canvas');
  if (canvas && window) {
    window.addEventListener('message', e => {
      const { evnetTarget, eventName, eventConst, ownerDocument, mockEvent } = e.data || {};
      if (mockEvent && eventName === 'click') {
        const v = document.elementFromPoint(evnetTarget?.clientX || 0, evnetTarget?.clientY || 0);
        if (!v || !v.getAttribute || !v.getAttribute('data-event-sign')) {
          return;
        }
        const signType = v.getAttribute('data-event-sign');
        const path = v.getAttribute('data-value-path');
        const data = v.__vue__proxy;
        switch (signType) {
          case 'notify': {
            window.parent.postMessage(
              JSON.stringify({
                type: `3d-${v.getAttribute('data-notify-type')}`,
                data: lodash.get(data, path)
              }),
              '*'
            );
          }
        }
        return;
      }
      if (evnetTarget && eventName && eventConst && window[eventConst]) {
        try {
          const clickEvent = new window[eventConst](eventName, evnetTarget);
          if (ownerDocument && canvas.ownerDocument) {
            canvas.ownerDocument.dispatchEvent(clickEvent);
          }
          canvas.dispatchEvent(clickEvent);
        } catch (e) {
          console.error('事件分发错误:', e);
        }
      }
    });
  }
})

// 切换巡视状态
const togglePatrolMode = () => {
  console.log('切换巡视状态，当前状态:', patrolActive.value, '预览模式:', props.isPreview)
  
  // 确保有足够的路径点
  if (patrolPathPoints.value.length < 2) {
    window['$message']?.warning('路径点不足，至少需要2个点');
    return;
  }
  
  patrolActive.value = !patrolActive.value
  
  // 确保更新UI状态
  if (patrolActive.value) {
    // 启动巡视前先确保更新cameraConfig
    const newCameraConfig = { ...cameraConfig };
    if (!newCameraConfig.fixedPointInspection) {
      newCameraConfig.fixedPointInspection = {
        pathPoints: patrolPathPoints.value,
        config: { mode: patrolMode.value, speed: patrolSpeed.value },
        inPatrolAnimation: true,
        controlsInstance: newCameraConfig.fixedPointInspection?.controlsInstance || null
      };
    } else {
      newCameraConfig.fixedPointInspection.config = { 
        mode: patrolMode.value, 
        speed: patrolSpeed.value 
      };
      newCameraConfig.fixedPointInspection.inPatrolAnimation = true;
      newCameraConfig.fixedPointInspection.pathPoints = patrolPathPoints.value;
    }
    
    // 直接更新配置
    chartEditStore.setCameraConfig(newCameraConfig);
    
    // 在store中设置巡视状态
    chartEditStore.setInPatrolAnimation(true);
    
    console.log('开始巡视: 状态已设置, 路径点:', patrolPathPoints.value.length);
    startPatrol()
  } else {
    console.log('停止巡视: 状态已更新');
    stopPatrol()
  }
}

// 启动巡视
const startPatrol = () => {
  if (patrolPathPoints.value.length < 2) {
    window['$message']?.warning('路径点不足，至少需要2个点')
    patrolActive.value = false
    return
  }
  
  // 更详细的日志输出
  console.log('开始巡视, 模式:', patrolMode.value, '速度:', patrolSpeed.value, '路径点数量:', patrolPathPoints.value.length)
  
  // 更新cameraConfig.fixedPointInspection中的配置
  // 确保已有fixedPointInspection对象
  const newCameraConfig = { ...cameraConfig }
  if (!newCameraConfig.fixedPointInspection) {
    newCameraConfig.fixedPointInspection = {
      pathPoints: patrolPathPoints.value,
      config: { mode: patrolMode.value, speed: patrolSpeed.value },
      inPatrolAnimation: true,
      controlsInstance: chartEditStore.getControlsInstance()
    }
  } else {
    // 更新配置
    newCameraConfig.fixedPointInspection.config = {
      ...newCameraConfig.fixedPointInspection.config,
      mode: patrolMode.value,
      speed: patrolSpeed.value
    }
    newCameraConfig.fixedPointInspection.inPatrolAnimation = true;
  }
  chartEditStore.setCameraConfig(newCameraConfig)
  
  // 使用修改后的方法设置巡视配置
  chartEditStore.setPatrolConfig({
    mode: patrolMode.value,
    speed: patrolSpeed.value
  })
  
  // 设置状态标记
  chartEditStore.setInPatrolAnimation(true)
  
  // 增强的控制器获取逻辑
  let controls = null;
  
  // 尝试方法1: 从Pinia store获取
  controls = chartEditStore.getControlsInstance;
  console.log('1. 从Pinia获取控制器:', controls ? '成功' : '失败');
  
  // 尝试方法2: 从本地ref获取
  if (!controls && controlsRef.value) {
    const { instance } = controlsRef.value;
    if (instance && typeof instance.setLookAt === 'function') {
      controls = instance;
      console.log('2. 从本地ref获取控制器:', '成功');
      // 保存到cameraConfig.fixedPointInspection.controlsInstance中以便后续使用
      const config = { ...cameraConfig };
      if (config.fixedPointInspection) {
        config.fixedPointInspection.controlsInstance = instance;
        chartEditStore.setCameraConfig(config);
      }
    } else {
      console.log('2. 从本地ref获取控制器:', '失败', instance);
    }
  }
  
  // 尝试方法3: 从DOM中查找
  if (!controls) {
    try {
      const tresCanvas = document.querySelector('.tres-canvas-container canvas');
      if (tresCanvas) {
        // @ts-ignore - 尝试访问Vue实例属性
        const vueInstance = tresCanvas.__vue__ || tresCanvas._vue;
        if (vueInstance) {
          const foundControls = vueInstance.exposed?.controlsRef?.value?.instance;
          if (foundControls && typeof foundControls.setLookAt === 'function') {
            controls = foundControls;
            console.log('3. 从DOM获取控制器:', '成功');
            // 保存到cameraConfig.fixedPointInspection.controlsInstance中
            const config = { ...cameraConfig };
            if (config.fixedPointInspection) {
              config.fixedPointInspection.controlsInstance = foundControls;
              chartEditStore.setCameraConfig(config);
            }
          } else {
            console.log('3. 从DOM获取控制器:', '失败 - 找到实例但缺少setLookAt方法');
          }
        } else {
          console.log('3. 从DOM获取控制器:', '失败 - 未找到Vue实例');
        }
      } else {
        console.log('3. 从DOM获取控制器:', '失败 - 未找到canvas元素');
      }
    } catch (error) {
      console.error('尝试从DOM获取控制器出错:', error);
    }
  }
  
  // 如果仍未找到控制器，给出错误提示
  if (!controls) {
    console.error('无法找到相机控制器实例，已尝试所有方法');
    window['$message']?.error('未找到相机控制器实例，无法启动巡视');
    patrolActive.value = false;
    return;
  }
  
  // 移动到第一个点开始巡视
  moveToFirstPoint(controls);
}

// 提取移动到第一个点的逻辑为单独函数
const moveToFirstPoint = (controls) => {
  // 输出控制器详细信息
  console.log('moveToFirstPoint调用，控制器:', controls ? '存在' : '不存在');
  console.log('控制器方法: setLookAt =', typeof controls?.setLookAt === 'function' ? '可用' : '不可用');
  
  if (!controls || typeof controls.setLookAt !== 'function') {
    console.error('控制器实例无效或缺少setLookAt方法')
    patrolActive.value = false
    return
  }
  
  const firstPoint = patrolPathPoints.value[0]
  console.log('第一个路径点:', firstPoint ? JSON.stringify(firstPoint) : '不存在');
  
  if (firstPoint) {
    try {
      console.log('移动到第一个路径点:', firstPoint)
      
      controls.setLookAt(
        firstPoint.position[0] || 0,
        firstPoint.position[1] || 0,
        firstPoint.position[2] || 0,
        firstPoint.lookAt[0] || 0,
        firstPoint.lookAt[1] || 0,
        firstPoint.lookAt[2] || 0,
        true
      )
      
      // 短暂延迟后开始动画，让相机先移动到第一个点
      setTimeout(() => {
        // 保存控制器实例到cameraConfig.fixedPointInspection.controlsInstance中
        const config = { ...cameraConfig };
        if (config.fixedPointInspection) {
          config.fixedPointInspection.controlsInstance = controls;
          chartEditStore.setCameraConfig(config);
        }
        
        // 发送巡视开始事件
        window.dispatchEvent(new CustomEvent('patrol-start', { 
          detail: { 
            mode: patrolMode.value, 
            speed: patrolSpeed.value,
            points: patrolPathPoints.value
          } 
        }))
        
        console.log('已发送巡视开始事件')
      }, 1000)
      
      window['$message']?.success('开始定点巡视')
    } catch (error) {
      console.error('移动到第一个路径点出错:', error)
      patrolActive.value = false
      window['$message']?.error('启动巡视失败')
    }
  } else {
    console.error('无法获取第一个路径点')
    patrolActive.value = false
    window['$message']?.error('启动巡视失败:无法获取第一个路径点')
  }
}

// 停止巡视
const stopPatrol = () => {
  // 设置状态标记
  chartEditStore.setInPatrolAnimation(false)
  
  // 更新cameraConfig
  const newCameraConfig = { ...cameraConfig };
  if (newCameraConfig.fixedPointInspection) {
    newCameraConfig.fixedPointInspection.inPatrolAnimation = false;
    chartEditStore.setCameraConfig(newCameraConfig);
  }
  
  // 发送巡视停止事件
  window.dispatchEvent(new CustomEvent('patrol-stop'))
  
  console.log('停止巡视')
  window['$message']?.info('已停止定点巡视')
}

// 监听巡视配置变化
watch(() => {
  return cameraConfig && cameraConfig.fixedPointInspection ? cameraConfig.fixedPointInspection.config : null
}, (newConfig) => {
  if (newConfig) {
    patrolMode.value = newConfig.mode || 'once'
    patrolSpeed.value = newConfig.speed || 5
  }
}, { immediate: true, deep: true })

// 监听巡视状态变化
watch(() => {
  return cameraConfig && cameraConfig.fixedPointInspection ? cameraConfig.fixedPointInspection.inPatrolAnimation : false
}, (active) => {
  patrolActive.value = active
}, { immediate: true })
</script>

<style>
.tres-canvas-container {
  width: 100%;
  height: 100%;
  transform: translateZ(0);
}
</style>

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
      <Stats v-if="canvasConfig.isFps" />
      <!-- <Effect :EffectComposer="effectComposer" :outlinePassList="outlinePassList" :layers="layers"></Effect> -->
    </TresCanvas>
  </div>
</template>

<script setup lang="ts">
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
import { Raycaster, Vector2, Vector3, Plane } from 'three'
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

const targetChart = chartEditStore.getTargetChart
const emits = defineEmits(['click', 'rightClick'])
const TresCanvasRef = shallowRef<any>()
const cameraRefs = shallowRef<any>()
const lightRef = shallowRef<any[]>([])
const controlsRef = shallowRef<any>()
const angle = ref({
  azimuthAngle: 0.6, //方位角
  polarAngle: 1.25, //方位角
  distance: 25
})
// 模型
const config = reactive<{
  componentList: any[]
  lightSetting: any[]
  htmlList: Record<string, any>
}>({
  componentList: [],
  lightSetting: [],
  htmlList: {}
})
const instance = getCurrentInstance()
const components = markRaw(instance.appContext.components)
// // 提供给子组件
provide('components', components)

//递归更新所有层级的配置
const digList = (list: any) => {
  const min = 1
  const max = 100
  const randomInteger = Math.floor(Math.random() * (max - min + 1)) + min
  const l = deepClone(list || [])
  return l.map((item: any, i: number) => {
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
      config.componentList?.map((item: any) => {
        item.el && componentListRef.value.push(item.el)
        item.groupList?.map((cc: any) => {
          cc.el && componentListRef.value.push(cc.el)
        })
        // 更新贴图
        item.children?.forEach((itemc:any) => {
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
const clickFun = (e: any) => {
  emits('click', e)
}
const clickRight = (e: any, item: any) => {
  emits('rightClick', {
    e: e,
    item: item
  })
  transformControlsState.enabled = false
  transformRef.value = null
}
const fitToBox = (current: any) => {
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
// 变换控制器
const ControlsStateMouseDown = (isMove: boolean) => {
  if (!transformRef.value || isMove) return
  const item = chartEditStore.getComponentListItem(transformRef.value.onlyId)
  if (!item) return
  const position = transformRef.value.position.clone()
  const scale = transformRef.value.scale.clone()
  const rotation = transformRef.value.rotation.clone()
  if (item.type == 'Html') {
    if (transformControlsState.mode == 'scale') {
      const [x, y, z] = scale.toArray()
      const { w, h } = item.attr
      useChartEditStore().setComponentList(item.id, { w: w * x, h: h * y }, 'attr')
    }
  }
  useChartEditStore().setComponentList(
    item.id,
    {
      position: [...position.toArray()],
      scale: [...scale.toArray()],
      rotation: [...rotation.toArray()]
    },
    'option'
  )
}
const handleCameraChange = debounce((distance:any) => {
  const {lookAt,position} = getCameraPositionLookAt(TresCanvasRef.value,distance)
  cameraConfig.cameraPosition = position
  cameraConfig.cameraLookAt = lookAt
  useChartEditStore().setCameraConfig(cameraConfig)
}, 200)
let isFirst = true
//监听控制器
const OrbitControlsChange = (e: any) => {
  if (isFirst) {
    isFirst = false
    return
  }
  const { distance, polarAngle, azimuthAngle } = e
  cameraConfig.distancess = distance
  cameraConfig.azimuthAngless = azimuthAngle
  cameraConfig.polarAngless = polarAngle
  handleCameraChange(distance)
  useChartEditStore().setCameraConfig(cameraConfig)
}

onLoop(({ delta, elapsed }) => {
  pause()
  // updateEvents(elapsed * 1000, delta * 1000)
})
onAfterLoop((res: any) => {})

onMounted(() => {
  // const domEl = document.querySelector('.tres-canvas-container')!
  setTimeout(() => {
    nextTick(() => {
      if (TresCanvasRef.value) {
        canvasRefs.value = TresCanvasRef.value
        netWorkInternal(2000)
        angle.value = {
          azimuthAngle: cameraConfig.azimuthAngless, //方位角
          polarAngle: cameraConfig.polarAngless, //方位角
          distance: cameraConfig.distancess
        }
        const{
          context: {
            camera,      // Three.js 的摄像机对象
            scene,       // Three.js 的场景对象
            renderer,    // Three.js 的渲染器对象
            // ... 其他
          },
          // ... 其他属性
        } = TresCanvasRef.value
        // 1. 先获取 ref 拿底层对象
        const {instance} = controlsRef.value
        instance?.setLookAt(...cameraConfig.cameraPosition,...cameraConfig.cameraLookAt,true)
      }

    })
  }, 500)
  const canvas = document.querySelector('.tres-canvas-container > canvas')!
  window.addEventListener('message', e => {
    const { evnetTarget, eventName, eventConst, ownerDocument, mockEvent } = e.data as any
    if (mockEvent && eventName === 'click') {
      const v = document.elementFromPoint(evnetTarget.clientX, evnetTarget.clientY) as any
      if (!v && !v.getAttribute('data-event-sign')) {
        return
      }
      const signType = v.getAttribute('data-event-sign')
      const path = v.getAttribute('data-value-path')
      const data = v.__vue__proxy
      switch (signType) {
        case 'notify': {
          window.parent.postMessage(
            JSON.stringify({
              type: `3d-${v.getAttribute('data-notify-type')}`,
              data: lodash.get(data, path)
            }),
            '*'
          )
        }
      }
      return
    }
    if (evnetTarget && eventName) {
      //@ts-ignore
      const clickEvent = new window[eventConst](eventName, evnetTarget)
      if (ownerDocument) {
        canvas.ownerDocument.dispatchEvent(clickEvent)
      }
      canvas.dispatchEvent(clickEvent)
    }
  })
})
</script>

<style>
.tres-canvas-container {
  width: 100%;
  height: 100%;
  transform: translateZ(0);
}
</style>

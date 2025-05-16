<template>
  <!-- <div style="width: 900px; max-height: 200px; overflow-y: auto">
    {{ targetChart }}
  </div> -->
  <div class="tres-canvas-container">
    <TresCanvas v-bind="canvasConfig" ref="TresCanvasRef" renderMode="on-demand">
      <!-- 轴 -->
      <TresAxesHelper :args="[100]" />
      <!-- 轨道控制器 -->
      <!-- <OrbitControls make-default ref="controlsRef" v-bind="cameraConfig" @end="OrbitControlsEnd" /> -->
      <!-- 坐标格辅助对象 -->
      <TresGridHelper :args="[1000, 100]" />
      <!-- 透视摄像机 -->
      <TresPerspectiveCamera ref="cameraRefs" :position="cameraConfig?.cameraPosition || [0,0,0]"/>
      <CameraControls
        v-if="cameraRefs"
        :camera="cameraRefs"
        ref="controlsRef"
        make-default
        v-bind="cameraConfig"
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
        :size="0.8"
        @mouseDown="() => { 
          if (!transformBusyThrottle) { 
            window.transformBusy = true; 
            transformBusyThrottle = true;
            
            // 检测是否为复杂模型
            const isComplexModel = checkIfComplexModel(transformRef.value);
            
            // 如果是复杂模型，应用特殊优化
            if (isComplexModel) {
              console.log('检测到复杂模型，应用专门优化');
              // 创建简化版模型用于变换操作
              simplifyModelForTransform(transformRef.value);
            }
            
            // 变换期间大幅降低分辨率
            if (TresCanvasRef.value?.renderer) {
              // 保存原始像素比
              window._origPixelRatio = TresCanvasRef.value.renderer.getPixelRatio();
              // 使用更低的像素比来减轻GPU负担 - 降低到0.3以获得显著性能提升
              TresCanvasRef.value.renderer.setPixelRatio(0.3);
              
              // 禁用抗锯齿和阴影，显著提升性能
              if (TresCanvasRef.value.renderer.shadowMap) {
                window._origShadowMapEnabled = TresCanvasRef.value.renderer.shadowMap.enabled;
                TresCanvasRef.value.renderer.shadowMap.enabled = false;
              }
              
              // 临时降低所有材质质量
              downgradeAllMaterials();
              
              // 暂停轮廓线更新
              window._pauseOutlineUpdate = true;
              
              // 优化渲染循环，降低变换期间的渲染频率
              if (!window._origRequestAnimationFrame && window.requestAnimationFrame) {
                window._origRequestAnimationFrame = window.requestAnimationFrame;
                
                // 修改requestAnimationFrame，限制到5fps以减轻CPU/GPU负担
                const targetFPS = 5;
                const frameInterval = 1000 / targetFPS;
                let lastFrameTime = 0;
                
                window.requestAnimationFrame = function(callback) {
                  const currentTime = performance.now();
                  const timeUntilNextFrame = Math.max(0, frameInterval - (currentTime - lastFrameTime));
                  
                  return setTimeout(() => {
                    lastFrameTime = performance.now();
                    callback(lastFrameTime);
                  }, timeUntilNextFrame);
                };
                
                window.cancelAnimationFrame = function(id) {
                  clearTimeout(id);
                };
              }
            }
          } 
        }"
        @mouseUp="() => { 
          window.transformBusy = false; 
          setTimeout(() => { transformBusyThrottle = false; }, 300);
          
          // 恢复原始分辨率和设置
          if (TresCanvasRef.value?.renderer) {
            if (window._origPixelRatio) {
              TresCanvasRef.value.renderer.setPixelRatio(window._origPixelRatio);
              window._origPixelRatio = null;
            }
            
            if (window._origShadowMapEnabled !== undefined) {
              TresCanvasRef.value.renderer.shadowMap.enabled = window._origShadowMapEnabled;
              window._origShadowMapEnabled = undefined;
            }
          }
          
          // 恢复原始材质
          restoreAllMaterials();
          
          // 恢复轮廓线更新
          window._pauseOutlineUpdate = false;
          
          // 恢复原始渲染循环
          if (window._origRequestAnimationFrame) {
            window.requestAnimationFrame = window._origRequestAnimationFrame;
            window.cancelAnimationFrame = window._origCancelAnimationFrame || window.cancelAnimationFrame;
            window._origRequestAnimationFrame = null;
            window._origCancelAnimationFrame = null;
          }
        }"
        @objectChange="handleTransformChange"
      />
      <!-- 巡视路径线 -->
      <PatrolPathLine v-if="patrolPathPoints.length > 1 && !isPreview" :pathPoints="patrolPathPoints" />
      <Stats v-if="canvasConfig.isFps" />
    </TresCanvas>
    
    <!-- 预览模式下的悬浮控制窗口 -->
    <PatrolFloatWindow v-if="isPreview && patrolPathPoints.length > 1" />
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
import { usePatrol } from '@/hooks/usePatrol.hook'
import { setupPerformanceMonitoring, setupUltraPerformanceMode } from '@/hooks/usePerformanceMonitor'
const ModelLoad = defineAsyncComponent(() => import('@/components/ModelLoad/index.vue'))
// const Effect = defineAsyncComponent(() => import('./effect.vue'))
const tresItem = defineAsyncComponent(() => import('./item.vue'))
const PatrolPathLine = defineAsyncComponent(() => import('./PatrolPathLine.vue'))
const PatrolFloatWindow = defineAsyncComponent(() => import('./PatrolFloatWindow.vue'))

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

// 使用巡视Hook
const { 
  patrolConfig, 
  startPatrol, 
  stopPatrol,
  togglePatrol,
  getPatrolStatus,
  getPathPoints
} = usePatrol()

// 巡视路径点 - 使用Hook中的数据
const patrolPathPoints = computed(() => {
  return patrolConfig.pathPoints
})

const targetChart = chartEditStore.getTargetChart
const emits = defineEmits(['click', 'rightClick'])
const TresCanvasRef = shallowRef()
const cameraRefs = shallowRef()
const lightRef = shallowRef([])
const controlsRef = shallowRef()

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

// 添加紧急性能模式激活函数 - 修改为更温和的版本
const activateEmergencyMode = () => {
  if (window._emergencyPerformanceMode) return;
  window._emergencyPerformanceMode = true;
  
  console.warn('激活紧急性能模式 - 降低渲染质量以确保变换操作流畅');
  
  // 保存原始设置
  if (TresCanvasRef.value?.renderer) {
    window._emergencySettings = {
      pixelRatio: TresCanvasRef.value.renderer.getPixelRatio(),
      shadowEnabled: TresCanvasRef.value.renderer.shadowMap?.enabled
    };
    
    // 降低渲染分辨率但不要降得太低，确保UI仍然可见
    // 从0.25提高到0.5，确保基本可见性
    TresCanvasRef.value.renderer.setPixelRatio(0.5);
    
    // 禁用阴影
    if (TresCanvasRef.value.renderer.shadowMap) {
      TresCanvasRef.value.renderer.shadowMap.enabled = false;
    }
  }
  
  // 遍历场景对象进行优化 - 保持变换控制器可见和可操作
  if (TresCanvasRef.value?.scene) {
    TresCanvasRef.value.scene.traverse(object => {
      // 跳过变换控制器相关的对象
      if (object.name && (object.name.includes('TransformControls') || 
                          object.name.includes('control') || 
                          object.name.includes('gizmo'))) {
        return; // 保持变换控制器完全正常
      }
      
      // 保存对象状态
      if (!object._emergencyState) {
        object._emergencyState = {
          visible: object.visible
        };
        
        // 保存材质状态，但只处理非控制器相关对象
        if (object.isMesh && object.material && object !== transformRef.value) {
          object._emergencyState.material = object.material;
          
          // 简化非活动对象
          if (object !== transformRef.value) {
            // 只处理非基本网格
            if (object.geometry && object.geometry.attributes && 
                object.geometry.attributes.position && 
                object.geometry.attributes.position.count > 10000) {
              // 只隐藏极其复杂的几何体(10000+顶点)
              object.visible = false;
            } else {
              // 对于普通复杂度的对象，简化其材质而不是隐藏
              const simpleMaterial = new THREE.MeshBasicMaterial({
                color: object.material.color ? object.material.color.getHex() : 0xcccccc,
                wireframe: false,
                transparent: object.material.transparent || false,
                opacity: object.material.opacity || 1.0
              });
              object.material = simpleMaterial;
            }
          }
        }
      }
    });
  }
  
  // 创建视觉指示器，但使其半透明且不遮挡控制
  if (!document.getElementById('emergency-mode-indicator')) {
    const indicator = document.createElement('div');
    indicator.id = 'emergency-mode-indicator';
    indicator.style.position = 'fixed';
    indicator.style.bottom = '10px';
    indicator.style.right = '10px';
    indicator.style.backgroundColor = 'rgba(255,0,0,0.5)'; // 降低不透明度
    indicator.style.color = 'white';
    indicator.style.padding = '5px 10px';
    indicator.style.borderRadius = '5px';
    indicator.style.fontSize = '12px';
    indicator.style.zIndex = '9999';
    indicator.style.pointerEvents = 'none'; // 确保不拦截鼠标事件
    indicator.textContent = '紧急性能模式已激活 (Alt+P 关闭)';
    document.body.appendChild(indicator);
  }
  
  // 设置自动恢复的时间延长到10秒，给用户更多操作时间
  window._emergencyModeTimer = setTimeout(() => {
    deactivateEmergencyMode();
  }, 10000);
};

// 紧急性能模式解除函数
const deactivateEmergencyMode = () => {
  if (!window._emergencyPerformanceMode) return;
  
  console.log('恢复正常渲染模式');
  
  // 恢复渲染器设置
  if (TresCanvasRef.value?.renderer && window._emergencySettings) {
    TresCanvasRef.value.renderer.setPixelRatio(window._emergencySettings.pixelRatio);
    
    if (TresCanvasRef.value.renderer.shadowMap) {
      TresCanvasRef.value.renderer.shadowMap.enabled = window._emergencySettings.shadowEnabled;
    }
  }
  
  // 恢复场景对象
  if (TresCanvasRef.value?.scene) {
    TresCanvasRef.value.scene.traverse(object => {
      if (object._emergencyState) {
        // 恢复可见性
        object.visible = object._emergencyState.visible;
        
        // 恢复材质
        if (object.isMesh && object._emergencyState.material) {
          // 保存当前材质供清理
          const oldMaterial = object.material;
          
          // 恢复原始材质
          object.material = object._emergencyState.material;
          
          // 清理临时材质
          if (oldMaterial && oldMaterial !== object._emergencyState.material) {
            oldMaterial.dispose();
          }
        }
        
        // 清除应急状态
        delete object._emergencyState;
      }
    });
  }
  
  // 恢复requestAnimationFrame原始功能（如果被修改）
  if (window._originalRAF && window._cpuOptimizedMode) {
    window.requestAnimationFrame = window._originalRAF;
    window._originalRAF = null;
  }
  
  // 恢复轮廓线更新
  window._pauseOutlineUpdate = false;
  
  // 清除CPU优化模式标记
  window._cpuOptimizedMode = false;
  window._cpuSavedAnimationState = null;
  
  // 移除指示器
  const indicator = document.getElementById('emergency-mode-indicator');
  if (indicator) {
    indicator.remove();
  }
  
  // 清除定时器
  if (window._emergencyModeTimer) {
    clearTimeout(window._emergencyModeTimer);
    window._emergencyModeTimer = null;
  }
  
  // 重置状态
  window._emergencyPerformanceMode = false;
  window._emergencySettings = null;
};

// 灯光
watch(
  () => lightSetting,
  e => {
    config.lightSetting = deepClone(e || [])
  },
  { deep: true, immediate: true }
)
const { onLoop, onBeforeLoop, onAfterLoop, pause, resume } = useRenderLoop()

// 添加变换控制节流标志
const transformBusyThrottle = ref(false);

// 使用useDebounceFn优化频繁触发的事件处理
const debouncedUpdate = lodash.debounce((callback) => {
  callback();
}, 50);

// 添加材质降级和恢复函数
const materialBackups = new Map();

// 降级所有材质，提高变换操作性能
const downgradeAllMaterials = () => {
  if (!TresCanvasRef.value?.scene) return;
  
  // 清空之前的备份
  materialBackups.clear();
  
  // 遍历场景中的所有对象
  TresCanvasRef.value.scene.traverse((object) => {
    // 只处理非变换对象的网格
    if (object.isMesh && object !== transformRef.value) {
      // 备份当前材质属性
      if (object.material) {
        const materialBackup = {
          material: object.material,
          properties: {
            wireframe: object.material.wireframe,
            flatShading: object.material.flatShading,
            roughness: object.material.roughness,
            metalness: object.material.metalness,
            map: object.material.map,
            normalMap: object.material.normalMap,
            envMap: object.material.envMap,
            aoMap: object.material.aoMap
          }
        };
        
        // 保存备份
        materialBackups.set(object.uuid, materialBackup);
        
        // 应用低质量设置
        if (!object.material._isSimpleMaterial) {
          // 简化材质: 禁用贴图，降低渲染计算
          object.material.wireframe = false;
          object.material.flatShading = true;
          if (object.material.roughness !== undefined) object.material.roughness = 1.0;
          if (object.material.metalness !== undefined) object.material.metalness = 0.0;
          
          // 临时禁用所有贴图
          object.material.map = null;
          object.material.normalMap = null;
          object.material.envMap = null;
          object.material.aoMap = null;
          
          // 标记为已简化
          object.material._isSimpleMaterial = true;
          object.material.needsUpdate = true;
        }
      }
      
      // 如果对象离当前变换对象很远，可以临时隐藏
      if (transformRef.value) {
        const distance = object.position.distanceTo(transformRef.value.position);
        if (distance > 50 && !object._wasVisible) {
          object._wasVisible = object.visible;
          object.visible = false;
        }
      }
    }
  });
  
  console.log('已临时降低材质质量以提升变换性能');
};

// 恢复所有材质
const restoreAllMaterials = () => {
  if (!TresCanvasRef.value?.scene) return;
  
  // 遍历场景中的所有对象
  TresCanvasRef.value.scene.traverse((object) => {
    if (object.isMesh) {
      // 恢复之前备份的材质
      const backup = materialBackups.get(object.uuid);
      
      if (backup && object.material._isSimpleMaterial) {
        // 恢复所有备份的属性
        Object.assign(object.material, backup.properties);
        
        // 移除标记
        delete object.material._isSimpleMaterial;
        object.material.needsUpdate = true;
      }
      
      // 恢复可见性
      if (object._wasVisible !== undefined) {
        object.visible = object._wasVisible;
        delete object._wasVisible;
      }
    }
  });
  
  // 清空备份映射
  materialBackups.clear();
  
  console.log('已恢复正常材质质量');
};

// 添加变换处理函数，使用严格的节流限制
const handleTransformChange = lodash.throttle(() => {
  // 使用RAF确保在正确的时机更新
  if (!window._transformUpdateRAF) {
    window._transformUpdateRAF = requestAnimationFrame(() => {
      ControlsStateMouseDown();
      window._transformUpdateRAF = null;
    });
  }
}, 150); // 更高的节流时间，减少状态更新频率

// 更彻底的优化ControlsStateMouseDown函数
const ControlsStateMouseDown = (isMove) => {
  if (!transformRef.value || isMove) return;
  
  try {
    const ref = transformRef.value;
    const item = chartEditStore.getComponentListItem(ref.onlyId);
    
    if (!item) return;
    
    if (window._debouncedStateUpdate) {
      window._debouncedStateUpdate.cancel();
    }
    
    window._debouncedStateUpdate = lodash.debounce(() => {
      const position = ref.position.toArray();
      const scale = ref.scale.toArray();
      const rotation = ref.rotation.toArray();
      
      const updates = {
        position,
        scale,
        rotation
      };
      
      useChartEditStore().setComponentList(item.id, updates, 'option');
      
      if (item.type === 'Html' && transformControlsState.mode === 'scale' && 
          item.attr && item.attr.w != null && item.attr.h != null) {
        useChartEditStore().setComponentList(
          item.id, 
          { w: item.attr.w * ref.scale.x, h: item.attr.h * ref.scale.y }, 
          'attr'
        );
      }
    }, 200);
    
    window._debouncedStateUpdate();
  } catch (error) {
    console.error('变换控制器处理错误:', error);
  }
}

// 更强大的垃圾回收和内存管理
function performGC() {
  if (window._transformUpdateRAF) {
    cancelAnimationFrame(window._transformUpdateRAF);
    window._transformUpdateRAF = null;
  }
  
  if (window._transformUpdateTimer) {
    clearTimeout(window._transformUpdateTimer);
    window._transformUpdateTimer = null;
  }
  
  if (window._debouncedStateUpdate) {
    window._debouncedStateUpdate.cancel();
    window._debouncedStateUpdate = null;
  }
  
  if (window.gc) {
    try { window.gc(); } catch (e) {}
  }
  
  if (transformRef.value) {
    if (transformRef.value._tempVector) transformRef.value._tempVector = null;
    if (transformRef.value._tempObject) transformRef.value._tempObject = null;
    if (transformRef.value._tempMatrix) transformRef.value._tempMatrix = null;
  }
  
  if (TresCanvasRef.value?.renderer) {
    if (typeof TresCanvasRef.value.renderer.dispose === 'function') {
      TresCanvasRef.value.renderer.dispose();
    }
  }
}

// 在开始交互时额外优化
const handleTransformControlsStart = () => {
  if (!window._transformOptimizationsApplied) {
    window._transformOptimizationsApplied = true;
    
    if (TresCanvasRef.value) {
      const scene = TresCanvasRef.value.scene;
      if (scene) {
        window._origFog = scene.fog;
        window._origBackground = scene.background;
        
        scene.fog = null;
        scene.background = null;
        
        scene.traverse(object => {
          if (object.isMesh && object !== transformRef.value) {
            if (!object._origMaterial && object.material) {
              object._origMaterial = {
                wireframe: object.material.wireframe,
                shadows: object.castShadow
              };
              
              object.castShadow = false;
              object.receiveShadow = false;
            }
          }
        });
      }
    }
  }
};

// 恢复优化前的设置
const restoreSceneSettings = () => {
  if (window._transformOptimizationsApplied) {
    window._transformOptimizationsApplied = false;
    
    if (TresCanvasRef.value) {
      const scene = TresCanvasRef.value.scene;
      if (scene) {
        if (window._origFog !== undefined) {
          scene.fog = window._origFog;
        }
        if (window._origBackground !== undefined) {
          scene.background = window._origBackground;
        }
        
        scene.traverse(object => {
          if (object.isMesh && object !== transformRef.value && object._origMaterial) {
            if (object._origMaterial.wireframe !== undefined && object.material) {
              object.material.wireframe = object._origMaterial.wireframe;
            }
            if (object._origMaterial.shadows !== undefined) {
              object.castShadow = object._origMaterial.shadows;
              object.receiveShadow = object._origMaterial.shadows;
            }
            
            delete object._origMaterial;
          }
        });
      }
    }
  }
};

// 修改监听逻辑
watch(
  () => window.transformBusy,
  (isBusy) => {
    if (isBusy) {
      handleTransformControlsStart();
    } else {
      setTimeout(() => {
        restoreSceneSettings();
        performGC();
      }, 500);
    }
  }
);

// 修改OrbitControls与TransformControls的交互逻辑
const updateOrbitControlsForTransform = (isTransformActive) => {
  const { instance } = controlsRef.value || {};
  if (!instance) return;
  
  if (isTransformActive) {
    if (!window._orbitControlsOrigSettings) {
      window._orbitControlsOrigSettings = {
        enableDamping: instance.enableDamping,
        dampingFactor: instance.dampingFactor,
        rotateSpeed: instance.rotateSpeed,
        enablePan: instance.enablePan,
        enableZoom: instance.enableZoom,
        enableRotate: instance.enableRotate
      };
    }
    
    instance.enableDamping = false;
    instance.rotateSpeed = instance.rotateSpeed * 0.3;
    instance.enablePan = false;
    instance.enableZoom = false;
  } else if (window._orbitControlsOrigSettings) {
    Object.assign(instance, window._orbitControlsOrigSettings);
    window._orbitControlsOrigSettings = null;
  }
};

watch(
  () => transformControlsState.enabled,
  (isEnabled) => {
    updateOrbitControlsForTransform(isEnabled);
  }
);

// 添加事件处理函数
onMounted(() => {
  setTimeout(() => {
    nextTick(() => {
      if (TresCanvasRef.value) {
        canvasRefs.value = TresCanvasRef.value
        netWorkInternal(2000)
        
        try {
          const { instance } = controlsRef.value || {};
          
          if (instance && cameraConfig && cameraConfig.cameraPosition && cameraConfig.cameraLookAt) {
            if (!cameraConfig.fixedPointInspection) {
              cameraConfig.fixedPointInspection = {
                pathPoints: [],
                config: {
                  mode: 'once',
                  speed: 5
                },
                inPatrolAnimation: false,
                controlsInstance: null
              };
            }
            
            chartEditStore.setControlsInstance(instance);
            
            const handleTransformControlsChange = (event) => {
              const { instance } = controlsRef.value || {};
              if (!instance) return;
              
              const isDragging = event.detail?.value;
              
              if (isDragging) {
                instance.enabled = false;
              } else {
                setTimeout(() => {
                  instance.enabled = true;
                }, 200);
              }
            };

            const transformControlsEl = document.querySelector('.tres-canvas-container');
            if (transformControlsEl) {
              transformControlsEl.addEventListener('dragging-changed', handleTransformControlsChange);
            }

            watch(
              () => transformControlsState.enabled,
              (isEnabled) => {
                if (instance) {
                  if (isEnabled) {
                    if (instance.rotateSpeed) {
                      instance._origRotateSpeed = instance.rotateSpeed;
                      instance.rotateSpeed = instance.rotateSpeed * 0.6;
                    }
                    
                    if (instance.enablePan !== undefined) instance._origEnablePan = instance.enablePan;
                    if (instance.enableZoom !== undefined) instance._origEnableZoom = instance.enableZoom;
                    instance.enablePan = false;
                    instance.enableZoom = false;
                  } else {
                    if (instance._origRotateSpeed !== undefined) {
                      instance.rotateSpeed = instance._origRotateSpeed;
                    }
                    if (instance._origEnablePan !== undefined) {
                      instance.enablePan = instance._origEnablePan;
                    }
                    if (instance._origEnableZoom !== undefined) {
                      instance.enableZoom = instance._origEnableZoom;
                    }
                  }
                }
              }
            );

            const newConfig = { ...cameraConfig };
            if (!newConfig.fixedPointInspection) {
              newConfig.fixedPointInspection = {
                pathPoints: [],
                config: { mode: 'once', speed: 5 },
                inPatrolAnimation: false,
                controlsInstance: instance
              };
            } else {
              newConfig.fixedPointInspection.controlsInstance = instance;
            }
            
            chartEditStore.setCameraConfig(newConfig);
            console.log('已将控制器实例存储到Pinia store和cameraConfig中');
            
            if (typeof instance.setLookAt === 'function') {
              const position = [
                Number(cameraConfig.cameraPosition[0]) || 20,
                Number(cameraConfig.cameraPosition[1]) || 20,
                Number(cameraConfig.cameraPosition[2]) || 20
              ];
              
              const lookAt = [
                Number(cameraConfig.cameraLookAt[0]) || 0,
                Number(cameraConfig.cameraLookAt[1]) || 0,
                Number(cameraConfig.cameraLookAt[2]) || 0
              ];
              
              instance.setLookAt(
                position[0], position[1], position[2],
                lookAt[0], lookAt[1], lookAt[2],
                false
              );
              
              setTimeout(() => {
                instance.setLookAt(
                  position[0], position[1], position[2],
                  lookAt[0], lookAt[1], lookAt[2],
                  false
                );
                console.log('已设置初始相机位置和朝向', position, lookAt);
              }, 500);
            } else {
              console.error('控制器实例缺少setLookAt方法');
            }
          } else {
            console.warn('初始化相机位置失败：控制器或配置不可用');
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
          let clickEvent;
          if (['wheel', 'touchstart', 'touchmove', 'touchend'].includes(eventName)) {
            const eventOptions = {
              passive: true,
              bubbles: true,
              cancelable: true,
              ...evnetTarget
            };
            clickEvent = new window[eventConst](eventName, eventOptions);
          } else {
            clickEvent = new window[eventConst](eventName, evnetTarget);
          }
          
          if (ownerDocument && canvas.ownerDocument) {
            canvas.ownerDocument.dispatchEvent(clickEvent);
          }
          canvas.dispatchEvent(clickEvent);
        } catch (e) {
          console.error('事件分发错误:', e);
        }
      }
    }, { passive: true });
    
    canvas.addEventListener('wheel', () => {}, { passive: true });
    canvas.addEventListener('touchstart', () => {}, { passive: true });
    canvas.addEventListener('touchmove', () => {}, { passive: true });
    canvas.addEventListener('touchend', () => {}, { passive: true });
    
    document.addEventListener('wheel', () => {}, { passive: true });
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
    document.addEventListener('touchend', () => {}, { passive: true });
  }
  
  // 使用新的性能监控工具
  setupPerformanceMonitoring(transformControlsState);
  setupUltraPerformanceMode(TresCanvasRef, transformRef);
  
  // 添加紧急模式键盘快捷键
  window.addEventListener('keydown', e => {
    // Alt+P 键切换紧急性能模式
    if (e.altKey && e.key === 'p') {
      e.preventDefault(); // 防止触发浏览器默认行为
      
      // 切换紧急模式
      if (window._emergencyPerformanceMode) {
        deactivateEmergencyMode();
        console.log('通过快捷键关闭紧急性能模式');
      } else {
        activateEmergencyMode();
        console.log('通过快捷键激活紧急性能模式');
      }
    }
  });

  // 导出切换紧急性能模式的函数
  window.toggleEmergencyPerformanceMode = (enable, mode = 'gpu') => {
    if (enable === undefined) {
      // 如果没有指定状态，则切换当前状态
      if (window._emergencyPerformanceMode) {
        deactivateEmergencyMode();
        return false;
      } else {
        activateEmergencyMode();
        return true;
      }
    } else if (enable && !window._emergencyPerformanceMode) {
      // 根据性能瓶颈类型选择不同的优化策略
      if (mode === 'cpu') {
        activateCPUOptimizedMode();
      } else {
        activateEmergencyMode(); // 默认GPU优化
      }
      return true;
    } else if (!enable && window._emergencyPerformanceMode) {
      deactivateEmergencyMode();
      return false;
    }
    return window._emergencyPerformanceMode;
  };
})

// 恢复丢失的函数定义
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
    const { distance } = e;
    // 安全地更新相机角度设置，忽略类型错误
    handleCameraChange(distance);
  } catch (e) {
    console.error('控制器设置错误:', e);
  }
}

// 优化渲染循环 - 更智能的按需渲染策略
onLoop(({ delta, elapsed }) => {
  // 使用变量跟踪渲染状态和性能
  const transformActive = window.transformBusy || transformControlsState.enabled;
  
  // 使用简单的节流机制避免过度渲染
  const now = Date.now();
  const timeSinceLastRender = now - (window._lastRenderTime || 0);
  
  // 基于当前操作调整目标帧率
  let targetFrameTime = 50; // 默认约20fps
  
  if (transformActive) {
    if (window.transformBusy) {
      // 变换操作中，极大降低帧率至5fps左右，显著减轻GPU/CPU负担
      targetFrameTime = 200; 
      
      // 停止所有动画更新
      if (window._pauseAllAnimations) {
        return; // 直接跳过渲染循环
      }
    } else {
      // TransformControls启用但不在拖拽中，中等帧率
      targetFrameTime = 80;
    }
  } else if (chartEditStore.getInPatrolAnimation) {
    // 巡视动画中，保持流畅的帧率
    targetFrameTime = 33;
  } else {
    // 静止场景，使用低帧率以节省资源
    targetFrameTime = 100;
  }
  
  if (timeSinceLastRender > targetFrameTime) {
    window._lastRenderTime = now;
    
    // 仅在非变换操作中执行补间动画
    if (TWEEN && !window._pauseAllAnimations) {
      TWEEN.update(elapsed * 1000);
    }
  }
})

onAfterLoop((res) => {
  // 当TransformControls激活但不在实际操作中时，减少不必要的渲染
  if (transformControlsState.enabled && !window.transformBusy) {
    // 检查是否长时间没有实际变换操作，如果超过2秒，可以考虑降低渲染频率
    const now = Date.now();
    if (!window._lastTransformTime) {
      window._lastTransformTime = now;
    } else if (now - window._lastTransformTime > 2000) {
      // 2秒内没有操作，可以进一步降低渲染频率
      if (!window._reducedFramerate) {
        window._reducedFramerate = true;
        console.log('TransformControls空闲状态：启用更低帧率以节省资源');
      }
    }
  } else {
    // 重置记录值
    window._lastTransformTime = null;
    if (window._reducedFramerate) {
      window._reducedFramerate = false;
      console.log('恢复标准帧率');
    }
  }
});

// 判断对象是否为复杂模型
const checkIfComplexModel = (object) => {
  if (!object) return false;
  
  let totalVertexCount = 0;
  let hasComplexGeometry = false;
  
  // 递归检查对象及其子对象
  object.traverse((node) => {
    if (node.isMesh && node.geometry) {
      // 检查几何体复杂度
      if (node.geometry.attributes && node.geometry.attributes.position) {
        const vertexCount = node.geometry.attributes.position.count;
        totalVertexCount += vertexCount;
        
        // 单个网格超过10000顶点视为复杂
        if (vertexCount > 10000) {
          hasComplexGeometry = true;
        }
      }
      
      // 检查材质复杂度
      if (node.material) {
        // 检查是否使用复杂着色器或多种贴图
        if ((node.material.map && node.material.normalMap) || 
            node.material.envMap || 
            node.material.aoMap ||
            (node.material.type && node.material.type.includes('Physical'))) {
          hasComplexGeometry = true;
        }
      }
    }
  });
  
  // 总顶点数超过50000或有复杂几何体/材质
  return totalVertexCount > 50000 || hasComplexGeometry;
};

// 为变换操作创建简化代理模型
const simplifyModelForTransform = (object) => {
  if (!object || !TresCanvasRef.value?.scene) return;
  
  // 已经有代理模型，则返回
  if (object._transformProxy) return;
  
  // 创建一个包围盒
  const bbox = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  
  // 计算中心点
  const center = new THREE.Vector3();
  bbox.getCenter(center);
  
  // 创建一个立方体代理几何体
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const material = new THREE.MeshBasicMaterial({
    color: 0x3388ff,
    wireframe: true,
    transparent: true,
    opacity: 0.2
  });
  
  // 创建代理网格
  const proxy = new THREE.Mesh(geometry, material);
  proxy.position.copy(center);
  proxy.quaternion.copy(object.quaternion);
  proxy.scale.copy(object.scale);
  
  // 保存原始对象的引用
  proxy._originalObject = object;
  object._transformProxy = proxy;
  proxy._isTransformProxy = true;
  
  // 隐藏原始对象
  object._originalVisibility = object.visible;
  
  // 添加代理到场景，并激活变换控制器
  TresCanvasRef.value.scene.add(proxy);
  
  // 替换当前变换引用
  transformRef.value = proxy;
  
  // 设置更新函数，同步代理与原始对象的变换
  const syncTransform = () => {
    if (!proxy || !object) return;
    
    // 将代理的变换同步到原始物体
    if (proxy._isTransformProxy && proxy._originalObject) {
      // 位置同步
      object.position.copy(proxy.position);
      // 旋转同步 - 使用四元数避免万向锁问题
      object.quaternion.copy(proxy.quaternion);
      // 缩放同步
      object.scale.copy(proxy.scale);
    }
    
    // 如果变换控制器仍在活动状态，继续同步
    if (window.transformBusy) {
      requestAnimationFrame(syncTransform);
    } else {
      // 变换结束，移除代理
      restoreFromProxy(proxy);
    }
  };
  
  // 开始同步
  syncTransform();
  
  return proxy;
};

// 恢复原始对象并移除代理
const restoreFromProxy = (proxy) => {
  if (!proxy || !proxy._isTransformProxy || !proxy._originalObject) return;
  
  const originalObject = proxy._originalObject;
  
  // 最终同步一次变换
  originalObject.position.copy(proxy.position);
  originalObject.quaternion.copy(proxy.quaternion);
  originalObject.scale.copy(proxy.scale);
  
  // 恢复原始对象可见性
  if (originalObject._originalVisibility !== undefined) {
    originalObject.visible = originalObject._originalVisibility;
    delete originalObject._originalVisibility;
  }
  
  // 清除代理引用
  delete originalObject._transformProxy;
  
  // 如果代理是当前变换控制器的目标，则切换回原始对象
  if (transformRef.value === proxy) {
    transformRef.value = originalObject;
  }
  
  // 从场景中移除代理
  if (TresCanvasRef.value?.scene) {
    TresCanvasRef.value.scene.remove(proxy);
  }
  
  // 释放资源
  proxy.geometry.dispose();
  proxy.material.dispose();
};

// 恢复原始模型状态
const restoreOriginalModel = () => {
  if (!window._originalModelState) return;
  
  const modelUuid = window._originalModelState.uuid;
  let model = null;
  
  // 找到对应的模型
  if (TresCanvasRef.value?.scene) {
    TresCanvasRef.value.scene.traverse((obj) => {
      if (obj.uuid === modelUuid) {
        model = obj;
      }
    });
  }
  
  if (!model) {
    console.error('无法找到原始模型，恢复失败');
    window._originalModelState = null;
    return;
  }
  
  console.log('开始恢复原始模型状态');
  
  // 恢复所有网格的状态
  model.traverse((child) => {
    if (child.isMesh) {
      const childUuid = child.uuid;
      
      // 恢复可见性
      if (window._originalModelState.visible[childUuid] !== undefined) {
        child.visible = window._originalModelState.visible[childUuid];
      }
      
      // 恢复材质
      if (window._originalModelState.materials[childUuid]) {
        // 处理当前简化材质
        if (child.material) {
          child.material.dispose();
        }
        
        // 恢复原始材质
        child.material = window._originalModelState.materials[childUuid];
        child.material.needsUpdate = true;
      }
    }
  });
  
  // 清除保存的状态
  window._originalModelState = null;
  
  console.log('已恢复原始模型状态');
};

// CPU优化模式 - 专注于减少主线程计算负担
const activateCPUOptimizedMode = () => {
  if (window._emergencyPerformanceMode) return;
  window._emergencyPerformanceMode = true;
  window._cpuOptimizedMode = true;
  
  console.warn('激活CPU优化模式 - 减少主线程计算负担');
  
  // 保存原始设置
  if (TresCanvasRef.value?.renderer) {
    window._emergencySettings = {
      pixelRatio: TresCanvasRef.value.renderer.getPixelRatio(),
      shadowEnabled: TresCanvasRef.value.renderer.shadowMap?.enabled
    };
    
    // 略微降低渲染分辨率，但不要太低
    TresCanvasRef.value.renderer.setPixelRatio(0.7); // 比GPU模式更高
    
    // 禁用阴影
    if (TresCanvasRef.value.renderer.shadowMap) {
      TresCanvasRef.value.renderer.shadowMap.enabled = false;
    }
  }
  
  // 降低动画更新频率而不是材质复杂度
  window._cpuSavedAnimationState = {
    rafThrottled: false,
    lastRAFTime: 0,
    targetFPS: 20, // 降低到20FPS
  };
  
  // 使用节流控制requestAnimationFrame调用频率，减轻CPU负担
  if (!window._originalRAF) {
    window._originalRAF = window.requestAnimationFrame;
    
    window.requestAnimationFrame = (callback) => {
      if (!window._cpuSavedAnimationState) return window._originalRAF(callback);
      
      const now = performance.now();
      const frameTime = 1000 / window._cpuSavedAnimationState.targetFPS;
      
      // 限制帧率以减轻CPU负担
      if (now - window._cpuSavedAnimationState.lastRAFTime >= frameTime) {
        window._cpuSavedAnimationState.lastRAFTime = now;
        return window._originalRAF(callback);
      }
      
      // 跳过部分帧
      return window._originalRAF(() => {
        // 空函数，跳过这一帧
      });
    };
  }
  
  // 减少不必要的场景遍历和性能检测
  window._pauseOutlineUpdate = true; // 暂停轮廓线更新
  
  // 优化场景对象，但保留变换控制器完整功能
  if (TresCanvasRef.value?.scene) {
    TresCanvasRef.value.scene.traverse(object => {
      // 跳过变换控制器相关的对象
      if (object.name && (object.name.includes('TransformControls') || 
                          object.name.includes('control') || 
                          object.name.includes('gizmo'))) {
        return;
      }
      
      // 保存对象状态，但不改变材质
      if (!object._emergencyState) {
        object._emergencyState = {
          visible: object.visible
        };
        
        // 只处理非变换控件且极其复杂的对象
        if (object !== transformRef.value && 
            object.isMesh && 
            object.geometry && 
            object.geometry.attributes && 
            object.geometry.attributes.position &&
            object.geometry.attributes.position.count > 50000) {
          // 只隐藏极其复杂的几何体，其他保持可见
          object.visible = false;
        }
      }
    });
  }
  
  // 创建视觉指示器
  if (!document.getElementById('emergency-mode-indicator')) {
    const indicator = document.createElement('div');
    indicator.id = 'emergency-mode-indicator';
    indicator.style.position = 'fixed';
    indicator.style.bottom = '10px';
    indicator.style.right = '10px';
    indicator.style.backgroundColor = 'rgba(255,140,0,0.5)'; // 使用橙色区分CPU模式
    indicator.style.color = 'white';
    indicator.style.padding = '5px 10px';
    indicator.style.borderRadius = '5px';
    indicator.style.fontSize = '12px';
    indicator.style.zIndex = '9999';
    indicator.style.pointerEvents = 'none';
    indicator.textContent = 'CPU优化模式已激活 (Alt+P 关闭)';
    document.body.appendChild(indicator);
  }
  
  // 设置10秒后自动恢复
  window._emergencyModeTimer = setTimeout(() => {
    deactivateEmergencyMode();
  }, 15000); // CPU模式自动持续时间更长
};



</script>

<style>
.tres-canvas-container {
  width: 100%;
  height: 100%;
  transform: translateZ(0);
  position: relative;
}
</style>

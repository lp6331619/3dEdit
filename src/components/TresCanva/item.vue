<template>
    
    <TresGroup v-for="(subMesh, index) in componentList" :key="subMesh.key" >
      <!-- 添加的mesh对象 -->
      <!-- @pointer-enter="onPointerEnter($event)"
    @pointer-leave="onPointerLeave($event)" -->
      <Suspense v-if="subMesh.type == 'TresMesh' && !subMesh.status.hide">
        <TresMesh
          :ref="el => (subMesh.el = el)"
          v-bind="subMesh.option"
          cast-shadow
          :name="subMesh.id + index"
          :onlyId="subMesh.id"
          @double-click="fitToBox($event, subMesh, index)"
          @context-menu="clickRight($event, subMesh, index)"
          @pointer-down="clickMesh($event, subMesh, index)"
        >
          <AsyncMaterial
            v-for="(item,i) in subMesh.children"
            :item="item"
          />
        </TresMesh>
      </Suspense>
      <!-- html渲染 -->
      <TresGroup
        v-else-if="subMesh.type == 'Html' && !subMesh.status.hide"
        :onlyId="subMesh.id"
        :position="subMesh.option?.position || [0, 0, 0]"
        :ref="el => (subMesh.el = el)"
      >
        <Html v-bind="htmlState" >
          <component
            class="edit-content-chart"
            :class="animationsClass(subMesh.styles.animations)"
            :is="subMesh.chartConfig.chartKey"
            :chartConfig="subMesh"
            @click="clickMesh2($event, subMesh, index)"
            @contextmenu.prevent="clickRight($event, subMesh, index)"
            :style="{
              ...useSizeStyle(subMesh.attr),
              ...getTransformStyle(subMesh.styles)
            }"
          ></component>
        </Html>
      </TresGroup>
      <Suspense v-else-if="subMesh.type == 'GLTFModel' && !subMesh.status.hide" >
        <TresGroup :ref="el => (subMesh.el = el)" :onlyId="subMesh.id" v-bind="subMesh.option" >
          <ModelLoad
            :url="subMesh.meshConfig"
            :styles="subMesh.styles"
            :data="subMesh"
            @context-menu="fitToBox($event, subMesh, index)"
            @pointer-down="!isPreview &&clickMesh($event, subMesh, index,true)"
          />
          <!-- @pointer-down="clickMesh($event, subMesh, index)" -->
          <!-- <GLTFModel
            @context-menu="fitToBox($event, subMesh, index)"
            @pointer-down="clickMesh($event, subMesh, index,true)"
            :path="subMesh.meshConfig"
          /> -->
        </TresGroup>
      </Suspense>
      <Sky v-else-if="subMesh.type == 'Sky' && !subMesh.status.hide" v-bind="subMesh.option"  />
      <Stars v-else-if="subMesh.type == 'Stars' && !subMesh.status.hide" v-bind="subMesh.option"  />
      <TresGroup v-else-if="subMesh.isGroup && !subMesh.status.hide" :ref="el => (subMesh.el = el)" :onlyId="subMesh.id" v-bind="subMesh.option">
        <tresItem :components="instance" :componentList="subMesh.groupList" :isPreview="isPreview" @click="(e)=>emits('click',e)" @rightClick="clickRight" @fitTo="(current)=>emits('fitTo',current)"/>
      </TresGroup>
    </TresGroup>
</template>

<script setup >
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
  onBeforeMount,
  getCurrentInstance,
  inject
} from 'vue'
import { useRenderLoop, useTresContext, vLightHelper } from '@tresjs/core'
import { initEvents, registerEvent, unregisterEvent, updateEvents } from '@/utils/event'
import {
  Stars,
  Sky,
  useGLTF,
  Html,
  GLTFModel
} from '@tresjs/cientos'
import {
  loadingStart,
  loadingFinish,
  loadingError,
  setComponentPosition,
  JSONParse,
  throttle,
  deepClone
} from '@/utils'
import { Raycaster, Vector2, Vector3, Plane } from 'three'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { storeToRefs } from 'pinia'
import * as TWEEN from '@tweenjs/tween.js'
import { netWorkInternal } from '@/hooks/netWorkInternal.hook'
import { defaultOption, defaultChildren } from '@/settings/designSetting'
import { useComponentStyle, useSizeStyle } from '@/views/chart/contentEdit/hooks/useStyle.hook'
import { animationsClass, getFilterStyle, getTransformStyle, getBlendModeStyle, colorCustomMerge } from '@/utils'
import { dragHandle, dragoverHandle } from '@/views/chart/ContentEdit/hooks/useDrag.hook'
import { effectComposerConfig, outlinePassListConfig } from './effectConfig'
import * as THREE from 'three'
import { useTres,TresCanvas ,useTexture} from '@tresjs/core'
import lodash from 'lodash'
import {
  componentInstall,
} from '@/utils'
import { fetchConfigComponent, fetchChartComponent } from '@/packages/index'
import AsyncMaterial from './AsyncMaterial.vue'
const ModelLoad = defineAsyncComponent(() => import('@/components/ModelLoad/index.vue'))
// const Effect = defineAsyncComponent(() => import('./effect.vue'))
const tresItem = defineAsyncComponent(() => import('./item.vue'))
const chartEditStore = useChartEditStore()
const { transformRef, canvasRefs } = storeToRefs(chartEditStore)

const props = defineProps({
  isPreview: {
    type: Boolean,
    default: false
  },
  componentList:{
    type:Array,
    default:()=>{
      return []
    }
  },
  components:{
    type:Object,
    default:()=>{
      return {}
    }
  }
})

const emits = defineEmits(['click', 'rightClick','fitTo','returnList'])
const instance = getCurrentInstance();
const parentComponents = inject('components');
// 将父组件的 components 赋值给子组件的 components
if (parentComponents) {
  instance.appContext.components = parentComponents;
}

const htmlState = reactive({
  wrapperClass: 'threeHtml',
  sprite: true,
  transform: false,
  distanceFactor: 10
})
//特效配置
const effectComposer = shallowRef({ ...effectComposerConfig })

const { onLoop, onBeforeLoop, onAfterLoop, pause, resume } = useRenderLoop()

// 摄像头移动到该模型
const fitToBox = (e, item, i) => {
  const { object } = e
  const current = object || item.el
  emits('fitTo',current)
}
const clickMesh2 = (e, item, i, isGltf) => {
  emits('click', {
    item: item,
    e: e,
    isGltf
  })
}
// 双击模型
const clickMesh = (e, item, i, isGltf) => {
  if (props.isPreview) {
    fitToBox(e, item, i)
  } else {
    emits('click', {
      item: item,
      e: e,
      isGltf
    })
  }
}
// 点击右键
const clickRight = (e, item) => {
  emits('rightClick', {
    e: e,
    item: item
  })
}

let isFirst = true
onLoop(({ delta, elapsed }) => {
  // console.log(window,11122)
  // updateEvents(elapsed * 1000, delta * 1000)
})
onAfterLoop((res) => {})

// 鼠标移入到模型上时，改变模型颜色
// const changeColor = throttle((ev) => {
//   const { object } = ev
//   const color = object.material.color.getHexString()
//   if (color !== 'dfff45' && color !== object.customColor) {
//     object.customColor = color
//   }
//   ev.object.material.color.set('#DFFF45')
// }, 200)
// function onPointerEnter(ev) {
//   if (ev) {
//     // outlinePassList.value[0].name = []
//     // outlinePassList.value[0].name.push(ev.object.name)
//     changeColor(ev)
//     pause()
//   }
// }

// 鼠标移出时，恢复模型颜色
// function onPointerLeave(ev) {
//   if (ev) {
//     // outlinePassList.value[0].name = []
//     const { object } = ev
//     object.material.color.set('#' + object.customColor)
//     resume();
//   }
// }

const refreshTextures = () => {
  props.componentList.forEach(subMesh => {
    if(subMesh.children) {
      subMesh.children.forEach(item => {
        if(item.el && item.el.material) {
          // 强制材质更新
          item.el.material.needsUpdate = true;
          
          // 如果材质有dispose方法，先销毁再重建
          if(item.el.material.dispose) {
            const oldMaterial = item.el.material;
            // 创建新材质
            const newMaterial = oldMaterial.clone();
            // 确保新材质的贴图都是最新的
            for(let prop in newMaterial) {
              if(newMaterial[prop] && newMaterial[prop].isTexture) {
                newMaterial[prop].needsUpdate = true;
              }
            }
            // 替换材质
            item.el.material = newMaterial;
            // 销毁旧材质
            oldMaterial.dispose();
          } else {
            // 遍历材质中的所有贴图并强制更新
            for(let prop in item.el.material) {
              if(item.el.material[prop] && item.el.material[prop].isTexture) {
                item.el.material[prop].needsUpdate = true;
              }
            }
          }
        }
      });
    }
  });
};

// 改进监听，在 props.componentList 数组的引用没变但内部内容变化时也能触发
// 使用一个计数器来强制刷新
const refreshCounter = ref(0);

watch(() => props.componentList, () => {
  refreshTextures();
  refreshCounter.value++;
}, {deep: true});

// 定期检查是否需要刷新贴图
onMounted(() => {
  const checkInterval = setInterval(() => {
    // 只在预览模式下禁用自动刷新
    if (!props.isPreview) {
      refreshTextures();
    }
  }, 2000); // 每2秒检查一次
  
  onUnmounted(() => {
    clearInterval(checkInterval);
  });
});
</script>


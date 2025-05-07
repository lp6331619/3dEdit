<template>
    
    <TresGroup v-for="(subMesh, index) in componentList"  >
      <!-- 添加的mesh对象 -->
      <!--  -->
      <Suspense v-if="subMesh.type == 'TresMesh' && !subMesh.status.hide">
        <TresMesh
          :ref="el => (subMesh.el = el)"
          v-bind="subMesh.option"
          cast-shadow
          :name="subMesh.id + index"
          :onlyId="subMesh.id"
          :key="subMesh.key"
          @double-click="fitToBox($event, subMesh, index)"
          @context-menu="clickRight($event, subMesh, index)"
          @pointer-down="clickMesh($event, subMesh, index)"
          @pointer-enter="onPointerEnter($event)"
          @pointer-leave="onPointerLeave($event)"
        >
          <AsyncMaterial
            v-for="(item,i) in subMesh.children"
            :key="subMesh.key"
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
        <Html v-bind="htmlState" :key="subMesh.key">
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
        <TresGroup :ref="el => (subMesh.el = el)" :onlyId="subMesh.id" v-bind="subMesh.option" :key="subMesh.key"  >
          <ModelLoad
            :url="subMesh.meshConfig"
            :styles="subMesh.styles"
            :data="subMesh"
            @context-menu="fitToBox($event, subMesh, index)"
            @pointer-down="!isPreview &&clickMesh($event, subMesh, index,true)"
            @pointer-enter="onPointerEnter($event)"
            @pointer-leave="onPointerLeave($event)"
          />
          <!-- @pointer-down="clickMesh($event, subMesh, index)" -->
          <!-- <GLTFModel
            @context-menu="fitToBox($event, subMesh, index)"
            @pointer-down="clickMesh($event, subMesh, index,true)"
            :path="subMesh.meshConfig"
          /> -->
        </TresGroup>
      </Suspense>
      <Sky v-else-if="subMesh.type == 'Sky' && !subMesh.status.hide" v-bind="subMesh.option" :key="subMesh.key" />
      <Stars v-else-if="subMesh.type == 'Stars' && !subMesh.status.hide" v-bind="subMesh.option" :key="subMesh.key"/>
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
const currentModel = computed(() => chartEditStore.getCurrentModel)
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
// 在 item.vue 中
const onPointerEnter = (ev) => {
  if (!ev) return
  const { object } = ev
  if(!currentModel.value) return 
  // 只在 customColor 不存在时保存
  if (object && !object.userData.customColor) {
    object.userData.customColor = object.material.color.getHexString()
  }
  object.material.color.set('#DFFF45')
  object.material = object.material.clone()
}

const onPointerLeave = (ev) => {
  if (!ev) return
  const { object } = ev
  if (object && object.userData.customColor) {
    object.material.color.set('#' + object.userData.customColor)
    delete object.userData.customColor
  }
}



// 定期检查是否需要刷新贴图
onMounted(() => {
 
});
</script>


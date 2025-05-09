<!--
 * @Descripttion: 
 * @version: 1.0
 * @Author: Teemor
 * @Date: 2024-11-26 10:46:57
 * @LastEditors: Teemor 232957726@qq.com
 * @LastEditTime: 2025-05-08 15:17:59
-->
<template>
  <primitive v-if="modelGroup"  :object="modelGroup" />
</template>
<script setup>
import { ref, watch, onMounted, shallowRef ,nextTick} from 'vue'
import { Group, Mesh } from 'three'
import { useGLTF } from '@tresjs/cientos'
import { useTresContext, useRenderLoop } from '@tresjs/core'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import cloneDeep from 'lodash/cloneDeep'
import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
const chartEditStore = useChartEditStore()
const getModelList = chartEditStore.getModelList
const emit = defineEmits(['change', 'update:value'])
const props = defineProps({
  url: String,
  styles: Object,
  data:Object
})
const modelGroup = shallowRef(null)
const loadModel = async url => {
  const gltf = await useGLTF(url)
  if (gltf.scene) {
    modelGroup.value = gltf.scene
    chartEditStore.setModelList(props.data.id,modelGroup.value)
    console.log(getModelList,'模型文件')
  }
  // modelGroup.value.updateMatrixWorld()
}


//爆炸相关

const distance = ref(1) //距离
const speed = ref(3000) //时间
const twGroup = new TWEEN.Group()
const diguiexplode = function (obj) {
  obj.children?.forEach((child, index) => {
    const origin = cloneDeep(child.position)
    child.userData.explode = {
      state: false,
      explode: origin
    }
    if (child.isMesh) {
      const boundingBox = new THREE.Box3().setFromObject(child)
      const childCenter = new THREE.Vector3()
      boundingBox.getCenter(childCenter)
      const pos = childCenter.multiplyScalar(distance.value)
      twGroup.add(
        new TWEEN.Tween(origin)
          .to(pos, speed.value)
          .onUpdate(val => {
            child.position.copy(val)
          })
          .start()
          .onComplete(val => {})
      )
    }
    child.children?.length && diguiexplode(child)
  })
}
const diguidisintegrate = function (obj) {
  obj.children.forEach((child, index) => {
    if (child.isMesh) {
      const boundingBox = new THREE.Box3().setFromObject(child)
      const childCenter = new THREE.Vector3()
      boundingBox.getCenter(childCenter)
      // let pos = childCenter.multiplyScalar(2);
      twGroup.add(
        new TWEEN.Tween(childCenter)
          .to(new THREE.Vector3(0, 0, 0), speed.value)
          .onUpdate(val => {
            child.position.copy(val)
          })
          .start()
          .onComplete(val => {})
      )
    }

    child.children?.length && diguidisintegrate(child)
  })
}
// 还原
const disintegrate = function () {
  if (disintegrateBoos) return
  diguidisintegrate(modelGroup.value)
}
// 爆炸
const explode = function () {
  if (explodeBoos) return
  diguiexplode(modelGroup.value)
}
watch(
  () => props.url,
  async () => {
    if (props.url) {
      await loadModel(props.url)
    }
  },
  { deep: true, immediate: true }
)
let explodeBoos = false
let disintegrateBoos = false
watch(
  () => props.styles,
  e => {
    const { explosion = {} } = e
    const { disintegrate: disintegrateBoo, explode: explodeBoo, distances, speed: speeds } = explosion
    explodeBoo && explode()
    disintegrateBoo && disintegrate()
    distance.value = distances
    speed.value = speeds
    explodeBoos = explodeBoo
    disintegrateBoos = disintegrateBoo
  },
  { deep: true, immediate: true }
)
const { onLoop } = useRenderLoop()
onLoop(({ delta }) => {
  twGroup?.update()
  //循环render
})
defineExpose({
  loadModel
})
</script>

<style lang="scss" scoped></style>

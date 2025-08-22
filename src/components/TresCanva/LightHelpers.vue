<template>
  <TresGroup v-if="!isPreview" />
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useTresContext } from '@tresjs/core'
import { DirectionalLightHelper, SpotLightHelper, PointLightHelper, Color, Mesh, MeshBasicMaterial, SphereGeometry } from 'three'

const props = defineProps({
  isPreview: { type: Boolean, default: false },
  lightSetting: { type: Array, default: () => [] },
  lightRefs: { type: [Array, Object], default: () => [] }
})

const helpers = new Map()
const targetMarkers = new Map()

const { scene } = useTresContext()

const getRefsArray = () => {
  if (Array.isArray(props.lightRefs)) return props.lightRefs
  if (props.lightRefs && Array.isArray(props.lightRefs.value)) return props.lightRefs.value
  return []
}

const resolveThreeObj = (refOrObj) => {
  // 兼容多种形态：ref.value.instance / ref.value / .instance / 直接对象
  if (!refOrObj) return null
  if (refOrObj.value) {
    if (refOrObj.value.instance) return refOrObj.value.instance
    return refOrObj.value
  }
  if (refOrObj.instance) return refOrObj.instance
  return refOrObj
}

function removeHelper(index) {
  const h = helpers.get(index)
  if (h) {
    scene && scene.remove(h)
    h.dispose && h.dispose()
    helpers.delete(index)
  }
  const m = targetMarkers.get(index)
  if (m) {
    scene && scene.remove(m)
    m.geometry && m.geometry.dispose && m.geometry.dispose()
    m.material && m.material.dispose && m.material.dispose()
    targetMarkers.delete(index)
  }
}

function attachFor(index) {
  try {
    const refs = getRefsArray()
    const comp = refs[index]
    const light = resolveThreeObj(comp)
    if (!light || !scene) return

    removeHelper(index)

    const cfg = props.lightSetting?.[index]?.config || {}
    const type = props.lightSetting?.[index]?.type
    const color = new Color(cfg.color || '#ffffff')

    let helper = null
    if (type === 'TresDirectionalLight') {
      helper = new DirectionalLightHelper(light, 1.5, color)
    } else if (type === 'TresSpotLight') {
      helper = new SpotLightHelper(light, color)
    } else if (type === 'TresPointLight') {
      helper = new PointLightHelper(light, 0.3, color)
    }

    if (helper) {
      scene.add(helper)
      helpers.set(index, helper)
    }

    if (type === 'TresDirectionalLight' || type === 'TresSpotLight') {
      const marker = new Mesh(new SphereGeometry(0.12, 12, 12), new MeshBasicMaterial({ color: 0x00ffff }))
      const t = cfg.target || [0, 0, 0]
      marker.position.set(Number(t[0] || 0), Number(t[1] || 0), Number(t[2] || 0))
      marker.userData.__lightIndex = index
      marker.userData.__isLightTarget = true
      scene.add(marker)
      targetMarkers.set(index, marker)

      light.target.position.copy(marker.position)
      light.target.updateMatrixWorld()
      helper && helper.update && helper.update()
    }
  } catch (e) {}
}

function rebuildAll() {
  const refs = getRefsArray()
  for (let i = 0; i < props.lightSetting.length; i++) {
    if (refs[i]) attachFor(i)
    else removeHelper(i)
  }
}

onMounted(async () => {
  if (props.isPreview) return
  // 等到灯光组件挂载完毕后再构建 Helper
  await nextTick()
  rebuildAll()
})

watch(() => props.lightSetting, async () => {
  if (props.isPreview) return
  await nextTick()
  rebuildAll()
}, { deep: true })

watch(() => getRefsArray().map(r => resolveThreeObj(r)), async () => {
  if (props.isPreview) return
  await nextTick()
  rebuildAll()
})

onBeforeUnmount(() => {
  for (const i of helpers.keys()) removeHelper(i)
})
</script> 
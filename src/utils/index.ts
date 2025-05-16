import * as THREE from 'three'

export * from '@/utils/utils'
export * from '@/utils/crypto'
export * from '@/utils/router'
export * from '@/utils/storage'
export * from '@/utils/style'
export * from '@/utils/plugin'
export * from '@/utils/components'
export * from '@/utils/type'
export * from '@/utils/file'

/**
 * 生成代理盒子模型用于复杂模型的变换操作
 * 用于优化变换控制器处理复杂模型时的性能
 * @param originalModel 原始模型
 * @param scene 需要添加到的场景
 * @returns 代理盒子对象
 */
export const generateProxyObject = (originalModel: any, scene?: any) => {
  // 创建一个半透明的盒子几何体，保持低可见度但可以被操作
  const proxyBox = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({
      color: 0x00ff00, // 绿色
      transparent: true,
      opacity: 0.05, // 非常低的不透明度
      wireframe: true // 线框模式
    })
  )

  // 与原始模型同步位置、缩放和旋转
  if (originalModel.position) {
    proxyBox.position.copy(originalModel.position)
  }

  if (originalModel.scale) {
    proxyBox.scale.copy(originalModel.scale)
  }

  if (originalModel.rotation) {
    proxyBox.rotation.copy(originalModel.rotation)
  }

  // 记录原始模型的引用
  proxyBox.userData = {
    isProxy: true,
    originalModel: originalModel
  }

  // 如果提供了场景对象，将代理盒子添加到场景中
  if (scene && scene.add) {
    scene.add(proxyBox)
  }

  return proxyBox
}

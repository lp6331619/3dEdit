import * as THREE from 'three'

/**
 * 获取相机位置和朝向信息
 * @param canvasRef TresCanvas的引用
 * @param distance 视点距离
 * @returns 返回相机位置和观察点
 */
export const getCameraPositionLookAt = (canvasRef: any, distance?: number) => {
  if (!canvasRef) {
    console.error('Canvas引用不存在')
    return { position: [0, 0, 5], lookAt: [0, 0, 0] }
  }

  try {
    // 获取相机实例
    const camera = canvasRef.camera
    if (!camera) {
      console.error('相机实例不存在')
      return { position: [0, 0, 5], lookAt: [0, 0, 0] }
    }

    // 获取相机位置
    const position = [camera.position.x, camera.position.y, camera.position.z]

    // 计算朝向点
    // 使用相机的方向向量和位置计算朝向点
    const direction = new THREE.Vector3(0, 0, -1)
    direction.applyQuaternion(camera.quaternion)

    // 视点距离，默认使用10或传入的距离
    const lookDistance = distance || 10

    // 计算观察点坐标
    const lookAt = [
      camera.position.x + direction.x * lookDistance,
      camera.position.y + direction.y * lookDistance,
      camera.position.z + direction.z * lookDistance
    ]

    return {
      position,
      lookAt
    }
  } catch (error) {
    console.error('获取相机信息出错:', error)
    return { position: [0, 0, 5], lookAt: [0, 0, 0] }
  }
}

import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useChartEditStore } from '@/store/modules/chartEditStore/chartEditStore'
import { debounce } from 'lodash'

// 定义路径点类型
export interface PathPoint {
  position: number[]
  lookAt: number[]
}

// 巡视状态接口
export interface PatrolStatus {
  enabled: boolean
  mode: string
  speed: number
  currentPointIndex: number
  totalPoints: number
}

/**
 * 定点巡视Hook
 * 提供完整的定点巡视功能，可在任何组件中使用
 */
export function usePatrol() {
  // 获取chart编辑store
  const chartEditStore = useChartEditStore()

  // 相机配置
  const cameraConfig = computed(() => chartEditStore.getCameraConfig)

  // 巡视配置
  const patrolConfig = reactive({
    mode: 'once', // 巡视模式: once(单次), loop(循环), roundtrip(来回)
    speed: 5, // 巡视速度 (1-10)
    enabled: false, // 是否启用巡视
    pathPoints: [] as PathPoint[], // 路径点
    currentPointIndex: 0, // 当前巡视点索引
    direction: 1 // 巡视方向: 1(向前), -1(向后)
  })

  // 初始化标记
  const isInitialized = ref(false)

  // 同步状态标记，防止循环更新
  let isConfigSyncing = false

  // 动画控制变量
  let animationTimer: number | null = null
  let currentStep = 0
  let steps = 0
  let startPoint: PathPoint | null = null
  let endPoint: PathPoint | null = null

  // 路径点变化监听定时器
  let pathPointsChangeTimer: number | null = null

  // 控制器实例获取状态标志
  let loggedError = false

  // 格式化向量显示
  const formatVector = (vector: number[] | undefined) => {
    if (!vector) return ''
    return vector
      .map(v => {
        const num = Number(v)
        return isNaN(num) ? '0.00' : num.toFixed(2)
      })
      .join(', ')
  }

  // 获取相机控制器实例
  const getControlsInstance = () => {
    try {
      // 尝试从Pinia获取控制器实例
      const controlsInstance = chartEditStore.getControlsInstance
      if (controlsInstance) {
        // console.log('从Pinia获取到控制器实例成功')
        return controlsInstance
      }

      // 如果Pinia中没有实例，尝试从TresCanva直接获取
      // console.log('Pinia中没有控制器实例，尝试从DOM获取...')
      const tresCanvas = document.querySelector('.tres-canvas-container canvas')
      if (!tresCanvas) {
        // console.warn('找不到Canvas元素')
        return null
      }

      try {
        // @ts-ignore
        if (!tresCanvas.__vue__) {
          console.warn('Canvas元素上没有__vue__属性')
          return null
        }

        // @ts-ignore
        const exposed = tresCanvas.__vue__?.exposed
        if (!exposed) {
          console.warn('Canvas的Vue实例上没有exposed属性')
          return null
        }

        const controlsRef = exposed.controlsRef
        if (!controlsRef) {
          console.warn('exposed对象上没有controlsRef属性')
          return null
        }

        const instance = controlsRef.instance
        if (!instance) {
          console.warn('controlsRef上没有instance属性')
          return null
        }

        // 找到控制器后保存到Pinia中，避免重复查找
        console.log('已从DOM找到控制器实例，保存到Pinia中')
        chartEditStore.setControlsInstance(instance)
        return instance
      } catch (err) {
        if (!loggedError) {
          console.error('获取控制器实例出错:', err)
          loggedError = true // 防止重复输出错误
        }
        return null
      }
    } catch (err) {
      if (!loggedError) {
        console.error('控制器实例获取出错:', err)
        loggedError = true
      }
      return null
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
        console.log('已添加路径点:', { position, lookAt })

        // 如果只有一个点，自动添加第二个点稍微偏移的位置
        if (patrolConfig.pathPoints.length === 1) {
          // 让第二个点比第一个点稍微偏移一些
          const position2 = [...position]
          position2[0] += 5 // X轴偏移5个单位

          patrolConfig.pathPoints.push({
            position: position2,
            lookAt: [...lookAt]
          })
          console.log('已自动添加第二个路径点:', { position: position2, lookAt })
          window['$message']?.success('已添加两个路径点')
        } else {
          window['$message']?.success('已添加路径点')
        }

        return true
      }
    } catch (error) {
      console.error('添加路径点失败:', error)
      window['$message']?.error('添加路径点失败')
    }
    return false
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

        console.log(`已更新路径点 ${index + 1}:`, { position, lookAt })
        window['$message']?.success(`已更新路径点 ${index + 1}`)
        return true
      }
    } catch (error) {
      console.error('更新路径点失败:', error)
      window['$message']?.error('更新路径点失败')
    }
    return false
  }

  // 移除路径点
  const removePathPoint = (index: number) => {
    if (index >= 0 && index < patrolConfig.pathPoints.length) {
      patrolConfig.pathPoints.splice(index, 1)
      console.log(`已删除路径点 ${index + 1}`)
      window['$message']?.success(`已删除路径点 ${index + 1}`)
      return true
    }
    return false
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
          chartEditStore.setInPatrolAnimation(true)

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

          console.log(`已移动到路径点 ${index + 1}`)

          // 在动画完成后重置状态标记
          setTimeout(() => {
            chartEditStore.setInPatrolAnimation(false)
          }, 1000)

          // 使用全局提示组件显示通知
          window['$message']?.success(`已切换到路径点 ${index + 1}`)
          return true
        } else {
          console.warn('未找到相机控制器实例')
          window['$message']?.error('未找到相机控制器实例')
        }
      }
    } catch (error) {
      console.error('移动到路径点失败:', error)
      window['$message']?.error('移动到路径点失败')
    }
    return false
  }

  // 测试所有路径点
  const testAllPathPoints = async () => {
    for (let i = 0; i < patrolConfig.pathPoints.length; i++) {
      moveToPathPoint(i)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    return true
  }

  // 启动巡视
  const startPatrol = () => {
    if (patrolConfig.pathPoints.length < 2) {
      console.log('路径点不足，至少需要2个点')
      patrolConfig.enabled = false
      window['$message']?.warning('路径点不足，至少需要2个点')
      return false
    }

    patrolConfig.enabled = true
    console.log('开始巡视, 模式:', patrolConfig.mode)
    patrolConfig.currentPointIndex = 0
    patrolConfig.direction = 1

    // 设置状态，防止在巡视过程中更新cameraConfig
    chartEditStore.setInPatrolAnimation(true)

    // 执行第一段动画
    animateToNextPoint()
    return true
  }

  // 停止巡视
  const stopPatrol = () => {
    patrolConfig.enabled = false

    // 清除动画定时器
    if (animationTimer !== null) {
      cancelAnimationFrame(animationTimer as any)
      clearTimeout(animationTimer as any)
      animationTimer = null
    }

    // 清除状态标记
    chartEditStore.setInPatrolAnimation(false)

    console.log('巡视已停止')
    return true
  }

  // 切换巡视状态
  const togglePatrol = () => {
    if (patrolConfig.enabled) {
      return stopPatrol()
    } else {
      return startPatrol()
    }
  }

  // 动画到下一个点
  const animateToNextPoint = () => {
    if (!patrolConfig.enabled || patrolConfig.pathPoints.length < 2) {
      stopPatrol()
      return
    }

    const currentIndex = patrolConfig.currentPointIndex
    let nextIndex = currentIndex + patrolConfig.direction

    // 根据巡视模式处理边界情况
    if (nextIndex >= patrolConfig.pathPoints.length) {
      // 处理到达终点的情况
      switch (patrolConfig.mode) {
        case 'once':
          // 单次巡视，到达终点后停止
          stopPatrol()
          return

        case 'loop':
          // 循环巡视，回到起点
          nextIndex = 0
          break

        case 'roundtrip':
          // 来回巡视，到达终点后改变方向
          patrolConfig.direction = -1
          nextIndex = patrolConfig.pathPoints.length - 2
          break
      }
    } else if (nextIndex < 0) {
      // 处理回到起点的情况 (仅在来回巡视模式下会发生)
      patrolConfig.direction = 1
      nextIndex = 1
    }

    // 设置起点和终点，并深拷贝避免引用问题
    startPoint = patrolConfig.pathPoints[currentIndex]
      ? JSON.parse(JSON.stringify(patrolConfig.pathPoints[currentIndex]))
      : []
    endPoint = patrolConfig.pathPoints[nextIndex] ? JSON.parse(JSON.stringify(patrolConfig.pathPoints[nextIndex])) : []

    // 确保路径点数据格式正确
    if (!startPoint || !endPoint) {
      console.error('路径点数据无效')
      stopPatrol()
      return
    }

    // 根据速度计算步数
    // 速度越高，步数越少，动画越快
    steps = Math.max(20, 100 - patrolConfig.speed * 8)
    currentStep = 0

    // 更新当前点索引
    patrolConfig.currentPointIndex = nextIndex

    console.log(`巡视至点 ${nextIndex + 1}, 共 ${patrolConfig.pathPoints.length} 个点`)

    // 设置状态，防止在巡视过程中更新cameraConfig
    chartEditStore.setInPatrolAnimation(true)

    // 开始动画
    animateFrame()
  }

  // 创建一个动画帧函数
  const animateFrame = () => {
    if (!patrolConfig.enabled || !startPoint || !endPoint) {
      console.log('动画被中止')
      return
    }

    currentStep++
    const progress = currentStep / steps

    // 线性插值计算当前位置和朝向 - 修复类型错误
    const posX =
      parseFloat(startPoint.position[0] as any) +
      (parseFloat(endPoint.position[0] as any) - parseFloat(startPoint.position[0] as any)) * progress
    const posY =
      parseFloat(startPoint.position[1] as any) +
      (parseFloat(endPoint.position[1] as any) - parseFloat(startPoint.position[1] as any)) * progress
    const posZ =
      parseFloat(startPoint.position[2] as any) +
      (parseFloat(endPoint.position[2] as any) - parseFloat(startPoint.position[2] as any)) * progress

    const lookX =
      parseFloat(startPoint.lookAt[0] as any) +
      (parseFloat(endPoint.lookAt[0] as any) - parseFloat(startPoint.lookAt[0] as any)) * progress
    const lookY =
      parseFloat(startPoint.lookAt[1] as any) +
      (parseFloat(endPoint.lookAt[1] as any) - parseFloat(startPoint.lookAt[1] as any)) * progress
    const lookZ =
      parseFloat(startPoint.lookAt[2] as any) +
      (parseFloat(endPoint.lookAt[2] as any) - parseFloat(startPoint.lookAt[2] as any)) * progress

    // 临时标记，防止巡视过程中的位置变化触发cameraConfig更新
    chartEditStore.setInPatrolAnimation(true)

    // 使用控制器移动相机
    const controls = getControlsInstance()
    if (controls) {
      try {
        // 只在开始和结束时输出日志，减少日志量
        if (currentStep === 1 || currentStep === steps) {
          console.log(
            `巡视动画 [${currentStep}/${steps}] 位置=[${posX.toFixed(2)},${posY.toFixed(2)},${posZ.toFixed(2)}]`
          )
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
        )
      } catch (error) {
        console.error('移动相机出错:', error)
        // 发生错误时停止巡视，避免卡死
        stopPatrol()
        return
      }
    } else {
      console.error('无法执行动画帧：控制器实例为空')
      // 没有控制器时也停止巡视
      stopPatrol()
      return
    }

    // 判断是否继续动画
    if (currentStep < steps) {
      // 计算下一帧的间隔时间
      // 速度越高，间隔越短，动画越快
      const frameDelay = Math.max(10, 50 - patrolConfig.speed * 4)

      // 计划下一帧动画 - 使用RAF代替setTimeout提高性能
      cancelAnimationFrame(animationTimer as any)
      animationTimer = requestAnimationFrame(() => {
        // 设置延迟执行
        setTimeout(animateFrame, frameDelay)
      }) as unknown as number
    } else {
      // 当前段动画结束，移动到下一段
      cancelAnimationFrame(animationTimer as any)
      animationTimer = requestAnimationFrame(() => {
        setTimeout(animateToNextPoint, 500)
      }) as unknown as number
    }
  }

  // 同步路径点和巡视配置到cameraConfig.fixedPointInspection
  const syncPatrolConfigDebounced = debounce(() => {
    // 如果已经在同步中，避免循环更新
    if (isConfigSyncing) return

    // 如果是在巡视动画中，跳过配置更新
    if (patrolConfig.enabled) {
      console.log('巡视动画中，跳过配置同步')
      return
    }

    try {
      isConfigSyncing = true

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
      }

      // 构建新的相机配置对象
      const newCameraConfig = { ...cameraConfig.value }

      // 优化比较逻辑，只比较有意义的字段而不是整个对象
      const currentPathPoints = newCameraConfig.fixedPointInspection?.pathPoints || []
      const currentConfig = newCameraConfig.fixedPointInspection?.config || ({} as { mode?: string; speed?: number })

      // 比较路径点数量，如果数量不同，肯定需要更新
      let needUpdate = currentPathPoints.length !== completeConfig.pathPoints.length

      // 如果数量相同，比较配置参数是否有变化
      if (!needUpdate) {
        // 比较配置参数
        if (
          currentConfig.mode !== completeConfig.config.mode ||
          currentConfig.speed !== completeConfig.config.speed ||
          newCameraConfig.fixedPointInspection?.inPatrolAnimation !== completeConfig.inPatrolAnimation
        ) {
          needUpdate = true
        }
        // 跳过路径点的深度比较，减少计算量
      }

      // 只有当配置有实际变化时才更新
      if (needUpdate) {
        // 更新fixedPointInspection字段为完整配置
        newCameraConfig.fixedPointInspection = completeConfig

        // 更新相机配置
        chartEditStore.setCameraConfig(newCameraConfig)
        console.log('已同步巡视配置到cameraConfig')
      }
    } catch (error) {
      console.error('同步巡视配置出错:', error)
    } finally {
      // 延迟重置同步状态标记
      setTimeout(() => {
        isConfigSyncing = false
      }, 500)
    }
  }, 1000)

  // 获取当前巡视状态
  const getPatrolStatus = (): PatrolStatus => {
    return {
      enabled: patrolConfig.enabled,
      mode: patrolConfig.mode,
      speed: patrolConfig.speed,
      currentPointIndex: patrolConfig.currentPointIndex,
      totalPoints: patrolConfig.pathPoints.length
    }
  }

  // 设置巡视参数
  const setPatrolParams = (params: { mode?: string; speed?: number }) => {
    if (params.mode && ['once', 'loop', 'roundtrip'].includes(params.mode)) {
      patrolConfig.mode = params.mode
    }

    if (typeof params.speed === 'number' && params.speed >= 1 && params.speed <= 12) {
      patrolConfig.speed = params.speed
    }

    // 同步到cameraConfig
    syncPatrolConfigDebounced()

    return true
  }

  // 获取路径点数据
  const getPathPoints = () => {
    return [...patrolConfig.pathPoints]
  }

  // 设置路径点数据
  const setPathPoints = (points: PathPoint[]) => {
    if (!Array.isArray(points)) return false

    patrolConfig.pathPoints = points.map(point => ({
      position: [...(point.position || [0, 0, 0])],
      lookAt: [...(point.lookAt || [0, 0, 0])]
    }))

    // 同步到cameraConfig
    syncPatrolConfigDebounced()

    return true
  }

  // 同步全局cameraConfig.fixedPointInspection到路径点和巡视配置
  const initFromCameraConfig = () => {
    try {
      isConfigSyncing = true
      const config = cameraConfig.value
      if (!config) {
        console.warn('相机配置不存在')
        return
      }

      // 确保fixedPointInspection对象存在
      if (!config.fixedPointInspection) {
        console.log('初始化定点巡视配置结构')
        // 通过store的action来初始化 fixedPointInspection 对象
        chartEditStore.setPatrolConfig({
          mode: 'once',
          speed: 5
        })

        // 重新获取配置
        setTimeout(() => {
          initFromCameraConfig()
        }, 100)
        return
      }

      // 加载配置
      if (config.fixedPointInspection.config) {
        patrolConfig.mode = config.fixedPointInspection.config.mode || 'once'
        patrolConfig.speed = config.fixedPointInspection.config.speed || 5
      }

      // 加载路径点
      if (Array.isArray(config.fixedPointInspection.pathPoints)) {
        patrolConfig.pathPoints = config.fixedPointInspection.pathPoints.map(point => ({
          position: [...(point.position || [0, 0, 0])],
          lookAt: [...(point.lookAt || [0, 0, 0])]
        }))
        console.log('已加载定点巡视数据')
      }

      // 加载巡视状态
      if (config.fixedPointInspection.inPatrolAnimation) {
        // 如果处于巡视状态，保持状态一致
        patrolConfig.enabled = true
      }

      // 标记已初始化
      isInitialized.value = true
    } catch (error) {
      console.error('初始化巡视数据出错:', error)
    } finally {
      // 重置同步状态
      setTimeout(() => {
        isConfigSyncing = false
      }, 500)
    }
  }

  // 监听路径点变化
  watch(
    () => patrolConfig.pathPoints,
    () => {
      // 避免频繁触发
      if (pathPointsChangeTimer) {
        clearTimeout(pathPointsChangeTimer)
      }
      pathPointsChangeTimer = window.setTimeout(() => {
        syncPatrolConfigDebounced()
        pathPointsChangeTimer = null
      }, 1000)
    },
    { deep: false }
  )

  // 监听模式变化
  watch(
    () => patrolConfig.mode,
    () => {
      syncPatrolConfigDebounced()
    }
  )

  // 监听速度变化
  watch(
    () => patrolConfig.speed,
    () => {
      syncPatrolConfigDebounced()
    }
  )

  // 初始化
  onMounted(() => {
    // 延迟加载路径点数据，避免首次渲染时卡顿
    setTimeout(() => {
      // 先确保fixedPointInspection存在
      if (!cameraConfig.value?.fixedPointInspection) {
        console.log('初始化fixedPointInspection结构')
        chartEditStore.setPatrolConfig({
          mode: 'once',
          speed: 5
        })
      }

      // 延迟加载控制器实例
      setTimeout(() => {
        // 加载控制器实例
        const controls = getControlsInstance()
        console.log('巡视控制器状态:', controls ? '可用' : '不可用')

        // 加载配置数据
        initFromCameraConfig()
      }, 500)
    }, 500)
  })

  // 清理
  onUnmounted(() => {
    // 停止巡视
    if (patrolConfig.enabled) {
      stopPatrol()
    }

    // 清理定时器
    if (pathPointsChangeTimer) {
      clearTimeout(pathPointsChangeTimer)
      pathPointsChangeTimer = null
    }

    // 清除全局标记
    chartEditStore.setInPatrolAnimation(false)
  })

  // 返回接口
  return {
    // 配置数据
    patrolConfig,
    // 巡视控制方法
    startPatrol,
    stopPatrol,
    togglePatrol,
    getPatrolStatus,
    setPatrolParams,
    // 路径点管理方法
    getPathPoints,
    setPathPoints,
    addCurrentPositionAsPathPoint,
    updatePathPoint,
    removePathPoint,
    moveToPathPoint,
    testAllPathPoints,
    // 工具方法
    formatVector,
    // 状态
    isInitialized
  }
}

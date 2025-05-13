// 扩展Window接口添加我们使用的自定义属性
interface Window {
  _tresCanvaThrottled: boolean
  transformBusy: boolean
  _lastRenderTime: number
  requestAnimationFrameThrottled: boolean
  _modelLoadLastUpdate: number
  _rafCallbacks: Map<number, FrameRequestCallback>
  patrolPathPoints: { position: number[]; lookAt: number[] }[]
  tresControlsInstance: any
  inPatrolAnimation: boolean
}

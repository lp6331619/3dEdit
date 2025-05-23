import { toRaw, nextTick } from 'vue'
import { defineStore } from 'pinia'
import { CreateComponentType, CreateComponentGroupType } from '@/packages/index.d'
import { PublicGroupConfigClass } from '@/packages/public/publicConfig'
import debounce from 'lodash/debounce'
import cloneDeep from 'lodash/cloneDeep'
import { SRGBColorSpace, BasicShadowMap, NoToneMapping } from 'three'
import { defaultTheme, globalThemeJson } from '@/settings/chartThemes/index'
import { requestInterval, previewScaleType, requestIntervalUnit } from '@/settings/designSetting'
// 记录记录
import { useChartHistoryStore } from '@/store/modules/chartHistoryStore/chartHistoryStore'
// 全局设置
import { useSettingStore } from '@/store/modules/settingStore/settingStore'
import {
  HistoryActionTypeEnum,
  HistoryItemType,
  HistoryTargetTypeEnum
} from '@/store/modules/chartHistoryStore/chartHistoryStore.d'
import { MenuEnum } from '@/enums/editPageEnum'
import {
  getUUID,
  loadingStart,
  loadingFinish,
  loadingError,
  isString,
  isArray,
  componentInstall,
  loadAsyncComponent
} from '@/utils'
import { fetchConfigComponent, fetchChartComponent } from '@/packages/index'
import {
  ChartEditStoreEnum,
  ChartEditStorage,
  ChartEditStoreType,
  EditCanvasType,
  MousePositionType,
  TargetChartType,
  RecordChartType,
  RequestGlobalConfigType,
  EditCanvasConfigType,
  CameraConfigType
} from './chartEditStore.d'

const chartHistoryStore = useChartHistoryStore()
const settingStore = useSettingStore()
// ChartEditStoreType
// 编辑区域内容
export const useChartEditStore = defineStore({
  id: 'useChartEditStore',
  state: () => ({
    // 画布属性
    editCanvas: {
      // 编辑区域 Dom
      editLayoutDom: null,
      editContentDom: null,
      // 偏移量
      offset: 20,
      // 系统控制缩放
      scale: 1,
      // 用户控制的缩放
      userScale: 1,
      // 锁定缩放
      lockScale: false,
      // 初始化
      isCreate: false,
      // 拖拽中
      isDrag: false,
      // 框选中
      isSelect: false,
      // 代码编辑中
      isCodeEdit: false
    },
    // 右键菜单
    rightMenuShow: false,
    // 鼠标定位
    mousePosition: {
      startX: 0,
      startY: 0,
      x: 0,
      y: 0
    },
    // 目标图表
    targetChart: {
      hoverId: undefined,
      selectId: []
    },
    // 记录临时数据（复制等）
    recordChart: undefined,
    // -----------------------
    // 画布属性（需存储给后端）
    editCanvasConfig: {
      // 项目名称
      projectName: undefined,
      // // 默认宽度
      // width: 1920,
      // // 默认高度
      // height: 1080,
      // // 启用滤镜
      // filterShow: false,
      // // 色相
      // hueRotate: 0,
      // // 饱和度
      // saturate: 1,
      // // 对比度
      // contrast: 1,
      // // 亮度
      // brightness: 1,
      // // 透明度
      // opacity: 1,
      // // 变换（暂不更改）
      // rotateZ: 0,
      // rotateX: 0,
      // rotateY: 0,
      // skewX: 0,
      // skewY: 0,
      // // 混合模式
      // blendMode: 'normal',
      // // 默认背景色
      // background: undefined,
      // backgroundImage: undefined,
      // // 是否使用纯颜色
      // selectColor: true,
      // // chart 主题色
      // chartThemeColor: defaultTheme || 'dark',
      // // 自定义颜色列表
      // chartCustomThemeColorInfo: undefined,
      // // 全局配置
      // chartThemeSetting: globalThemeJson,
      // // 适配方式
      // previewScaleType: previewScaleType,
      // 背景色
      clearColor: '#000',
      // 是否打开阴影
      shadows: true,
      isFps: true,
      alpha: false,
      shadowMapType: BasicShadowMap,
      outputColorSpace: SRGBColorSpace,
      toneMapping: NoToneMapping
    },
    // 数据请求处理（需存储给后端）
    requestGlobalConfig: {
      requestDataPond: [],
      requestOriginUrl: '',
      requestInterval: requestInterval,
      requestIntervalUnit: requestIntervalUnit,
      requestParams: {
        Body: {
          'form-data': {},
          'x-www-form-urlencoded': {},
          json: '',
          xml: ''
        },
        Header: {},
        Params: {}
      }
    },
    //摄像头数据
    cameraConfig: {
      position: [20, 20, 20],
      azimuthAngless: 0.6, //方位角
      polarAngless: 1.25, //方位角
      // fov: 50, //摄像机视锥体垂直视野角度
      // aspect: 1, // 摄像机视锥体长宽比
      // near: 0.1, // 摄像机视锥体近端面
      // far: 2000, // 摄像机视锥体远端面
      // zoom: 1,
      // lookAt: [100, 10, 20],
      distancess: 25,
      // smoothTime: 0.5,
      // infinityDolly: true,
      minDistance: 1, //摄像机最小距离
      maxDistance: 900, //摄像机最大距离

      enableDamping: true, //是否启用阻尼
      dampingFactor: 0.05, //阻尼系数
      autoRotate: false, //是否自动旋转
      autoRotateSpeed: 2, //选择速度
      enableZoom: true, //启用缩放
      zoomSpeed: 5, //缩放速度

      cameraPosition: [20, 20, 20], //摄像机的位置
      cameraLookAt: [0, 0, 0], //摄像机的lookAt
      fixedPointInspection: {
        // 路径点
        pathPoints: [],
        // 巡视配置
        config: {
          // 巡视模式: once(单次), loop(循环), roundtrip(来回)
          mode: 'once',
          // 巡视速度 (1-10)
          speed: 5
        },
        // 是否在巡视动画中
        inPatrolAnimation: false,
        // 控制器实例
        controlsInstance: null
      }
      // minZoom: 0.01, //最小缩放
      // maxZoom: 1 // 最大缩放
      // enablePan: true, //启用平移
      // keyPanSpeed: 100
      // maxPolarAngle: Math.PI,
      // minPolarAngle: 0,
      // maxAzimuthAngle: Math.PI,
      // minAzimuthAngle: -Math.PI,

      // enableRotate: true,
      // rotateSpeed: 1
    },
    //灯光配置
    lightSetting: [
      {
        type: 'TresDirectionalLight',
        config: {
          position: [5, 5, 5],
          color: '#ffffff',
          intensity: 1,
          castShadow: false
        }
      }
    ],
    //变换控制器
    transformControlsState: {
      mode: 'translate',
      enabled: false,
      space: 'local',
      axis: 'XYZ',
      size: 1,
      showX: true,
      showY: true,
      showZ: true
    },
    // 鼠标选中的元素
    transformRef: null,

    //整个画布ref
    canvasRefs: null,
    //组件列表ref
    componentListRef: [],
    // 图表数组（需存储给后端）
    componentList: [],
    //模型列表
    modelList: {},
    // 当前编辑的模型
    currentModel: undefined,
    //巡视点数据
    pathPoints: []
  }),
  getters: {
    getMousePosition(): MousePositionType {
      return this.mousePosition
    },
    getRightMenuShow(): boolean {
      return this.rightMenuShow
    },
    getEditCanvas(): EditCanvasType {
      return this.editCanvas
    },
    getEditCanvasConfig(): EditCanvasConfigType {
      return this.editCanvasConfig
    },
    getTargetChart(): TargetChartType {
      return this.targetChart
    },
    getRecordChart(): RecordChartType | undefined {
      return this.recordChart
    },
    getRequestGlobalConfig(): RequestGlobalConfigType {
      return this.requestGlobalConfig
    },

    getComponentList(): Array<CreateComponentType | CreateComponentGroupType> {
      return this.componentList
    },
    getCameraConfig(): CameraConfigType {
      return this.cameraConfig
    },
    getLightSetting(): RequestGlobalConfigType {
      return this.lightSetting
    },
    getTransformControlsState() {
      return this.transformControlsState
    },
    getTransformRef() {
      return this.transformRef
    },
    getCanvasRefs() {
      return this.canvasRefs
    },
    getComponentListRef() {
      return this.componentListRef
    },
    getModelList() {
      return this.modelList
    },
    getCurrentModel() {
      return this.currentModel
    },

    // 巡视功能相关getter
    getPatrolState() {
      return this.cameraConfig.fixedPointInspection
    },
    getPatrolPathPoints() {
      return this.cameraConfig.fixedPointInspection.pathPoints
    },
    getPatrolConfig() {
      return this.cameraConfig.fixedPointInspection.config
    },
    getControlsInstance() {
      // 确保fixedPointInspection对象存在
      if (!this.cameraConfig.fixedPointInspection) {
        this.cameraConfig.fixedPointInspection = {
          pathPoints: [],
          config: {
            mode: 'once',
            speed: 5
          },
          inPatrolAnimation: false,
          controlsInstance: null
        }
      }
      return this.cameraConfig.fixedPointInspection.controlsInstance
    },
    getInPatrolAnimation() {
      // 确保fixedPointInspection对象存在
      if (!this.cameraConfig.fixedPointInspection) {
        return false
      }
      return this.cameraConfig.fixedPointInspection.inPatrolAnimation
    },
    getPathPoints() {
      return this.pathPoints
    }
  },
  actions: {
    // 设置巡视路径点
    setPatrolPathPoints(points) {
      // 确保fixedPointInspection对象存在
      if (!this.cameraConfig.fixedPointInspection) {
        this.cameraConfig.fixedPointInspection = {
          pathPoints: [],
          config: {
            mode: 'once',
            speed: 5
          },
          inPatrolAnimation: false,
          controlsInstance: null
        }
      }
      this.cameraConfig.fixedPointInspection.pathPoints = points
    },
    // 设置巡视配置
    setPatrolConfig(config) {
      // 确保fixedPointInspection对象存在
      if (!this.cameraConfig.fixedPointInspection) {
        this.cameraConfig.fixedPointInspection = {
          pathPoints: [],
          config: {
            mode: 'once',
            speed: 5
          },
          inPatrolAnimation: false,
          controlsInstance: null
        }
      }
      this.cameraConfig.fixedPointInspection.config = { ...this.cameraConfig.fixedPointInspection.config, ...config }
    },
    // 设置控制器实例
    setControlsInstance(instance) {
      // 确保fixedPointInspection对象存在
      if (!this.cameraConfig.fixedPointInspection) {
        this.cameraConfig.fixedPointInspection = {
          pathPoints: [],
          config: {
            mode: 'once',
            speed: 5
          },
          inPatrolAnimation: false,
          controlsInstance: null
        }
      }
      this.cameraConfig.fixedPointInspection.controlsInstance = instance
      console.log('已设置控制器实例到Pinia store', instance ? '成功' : '为空')
    },
    // 设置巡视动画状态
    setInPatrolAnimation(status) {
      // 确保fixedPointInspection对象存在
      if (!this.cameraConfig.fixedPointInspection) {
        this.cameraConfig.fixedPointInspection = {
          pathPoints: [],
          config: {
            mode: 'once',
            speed: 5
          },
          inPatrolAnimation: false,
          controlsInstance: null
        }
      }
      this.cameraConfig.fixedPointInspection.inPatrolAnimation = status
    },

    //编辑的模型数据
    setCurrentModel(model: any) {
      this.currentModel = model
    },
    //获取当前的对象
    getComponentListItem(id: any): Object {
      let obj = {}
      this.componentList.map(item => {
        item.id == id && (obj = item)
        item.groupList?.map(c => {
          c.id == id && (obj = c)
        })
      })
      return obj
    },
    //寻找父级
    getComponentGroup(id: any): Object {
      let obj = {}
      this.componentList.map((item: any) => {
        item.id == id && (obj = item)
        item.groupList?.map((c: any) => {
          c.id == id && (obj = item)
        })
      })
      return obj
    },
    //获取当前激活的 对象
    getCurrentListItem(): Object {
      if (!this.getTargetChart.selectId.length) return {}
      return this.getComponentListItem(this.getTargetChart.selectId)
    },
    // * 获取需要存储的数据项
    getStorageInfo(): ChartEditStorage {
      return {
        [ChartEditStoreEnum.EDIT_CANVAS_CONFIG]: this.getEditCanvasConfig,
        [ChartEditStoreEnum.COMPONENT_LIST]: this.getComponentList,
        [ChartEditStoreEnum.REQUEST_GLOBAL_CONFIG]: this.getRequestGlobalConfig,
        cameraConfig: this.getCameraConfig,
        lightSetting: this.getLightSetting
      }
    },
    setModelList(id: string, data: any) {
      return (this.modelList[id] = data)
    },
    // * 获取针对 componentList 顺序排过序的 selectId
    getSelectIdSortList(ids?: string[]): string[] {
      if (!this.getTargetChart.selectId.length && !ids) return []
      const sortArr: string[] = []
      this.getComponentList.forEach((item: CreateComponentType | CreateComponentGroupType) => {
        if (ids) {
          ids.forEach((id: string) => {
            if (item.id === id) {
              sortArr.push(id)
            }
          })
        } else {
          this.getTargetChart.selectId.forEach((id: string) => {
            if (item.id === id) {
              sortArr.push(id)
            }
          })
        }
      })
      return sortArr
    },
    //初始化设置所有数据
    setinitData(config: any) {
      loadingStart()
      console.log(config, '接口获取的详情数据')
      const {
        cameraConfig = {},
        componentList = [],
        editCanvasConfig = {},
        lightSetting = [],
        requestGlobalConfig = {}
      } = config
      this.editCanvasConfig = editCanvasConfig
      this.lightSetting = lightSetting
      this.requestGlobalConfig = requestGlobalConfig
      this.cameraConfig = cameraConfig
      this.pathPoints = cameraConfig.fixedPointInspection?.pathPoints
      componentList.map((item: any) => {
        this.addComponentList(item)
      })
      // nextTick(() => {
      componentList.map((item: any) => {
        item.groupList?.map((c: any) => {
          componentInstall(c.chartConfig.chartKey, fetchChartComponent(c.chartConfig))
          componentInstall(c.chartConfig.conKey, fetchConfigComponent(c.chartConfig))
        })
        componentInstall(item.chartConfig.chartKey, fetchChartComponent(item.chartConfig))
        componentInstall(item.chartConfig.conKey, fetchConfigComponent(item.chartConfig))
      })
      loadingFinish()
      // })
    },
    // * 设置 editCanvas 数据项
    setEditCanvas<T extends keyof EditCanvasType, K extends EditCanvasType[T]>(key: T, value: K) {
      this.editCanvas[key] = value
    },
    //设置组件列表ref
    setComponentListRef(data: any) {
      this.componentListRef = data
    },
    // * 设置 editCanvasConfig（需保存后端） 数据项
    setEditCanvasConfig<T extends keyof EditCanvasConfigType, K extends EditCanvasConfigType[T]>(key: T, value: K) {
      this.editCanvasConfig[key] = value
    },
    // * 设置右键菜单
    setRightMenuShow(value: boolean) {
      this.rightMenuShow = value
    },
    //设置变换器
    setTransformControlsState(value: any) {
      this.transformControlsState.mode = value
    },
    setTransformControlsStateEnabled(value: any) {
      this.transformControlsState.enabled = value
    },
    //设置所有隐藏
    setAllHide(id: any) {
      this.componentList.forEach((item: any) => {
        item.status.hide = item.id !== id
      })
    },
    //设置所有显示
    setAllShow() {
      this.componentList.forEach((item: any) => {
        item.status.hide = false
      })
    },
    // * 设置目标数据 hover
    setTargetHoverChart(hoverId?: TargetChartType['hoverId']) {
      this.targetChart.hoverId = hoverId
    },
    // * 设置目标数据 select
    setTargetSelectChart(selectId?: string | string[], push: boolean = false) {
      // 重复选中
      if (this.targetChart.selectId.find((e: string) => e === selectId)) return
      // 无 id 清空
      if (!selectId) {
        this.targetChart.selectId = []
        return
      }
      // 多选
      if (push) {
        // 字符串
        if (isString(selectId)) {
          this.targetChart.selectId.push(selectId)
          return
        }
        // 数组
        if (isArray(selectId)) {
          this.targetChart.selectId.push(...selectId)
          return
        }
      } else {
        // 字符串
        if (isString(selectId)) {
          this.targetChart.selectId = [selectId]
          return
        }
        // 数组
        if (isArray(selectId)) {
          this.targetChart.selectId = selectId
          return
        }
      }
    },
    // * 设置记录数据
    setRecordChart(item: RecordChartType | undefined) {
      this.recordChart = cloneDeep(item)
    },
    //设置摄像头数据
    setCameraConfig(data: any) {
      this.cameraConfig = data
    },
    setPathPoints(pathPoints: any) {
      this.pathPoints = pathPoints
    },
    //设置整个画布ref
    setCanvasRefs(data: any) {
      this.canvasRefs = data
    },
    //设置灯光
    setLightSetting(data: any) {
      this.lightSetting = data
    },
    // * 设置鼠标位置
    setMousePosition(x?: number, y?: number, startX?: number, startY?: number): void {
      if (x) this.mousePosition.x = x
      if (y) this.mousePosition.y = y
      if (startX) this.mousePosition.startX = startX
      if (startY) this.mousePosition.startY = startY
    },
    // * 找到目标 id 数据的下标位置，id可为父级或子集数组（无则返回-1）
    fetchTargetIndex(id?: string): any {
      const targetId = id || (this.getTargetChart.selectId.length && this.getTargetChart.selectId[0]) || undefined
      if (!targetId) {
        loadingFinish()
        return -1
      }
      const targetIndex = this.componentList.findIndex(e => e.id === targetId)

      // 当前
      if (targetIndex !== -1) {
        return targetIndex
      } else {
        const length = this.getComponentList.length
        for (let i = 0; i < length; i++) {
          if (this.getComponentList[i].isGroup) {
            const b = [i]
            this.getComponentList[i].groupList?.map((c: any, ci: number) => {
              if (c.id == targetId) {
                b.push(ci)
              }
            })
            return b
          }
        }
      }
      return -1
    },
    // * 统一格式化处理入参 id
    idPreFormat(id?: string | string[]) {
      const idArr = []
      if (!id) {
        idArr.push(...this.getTargetChart.selectId)
        return idArr
      }
      if (isString(id)) idArr.push(id)
      if (isArray(id)) idArr.push(...id)
      return idArr
    },
    /**
     * * 新增组件列表
     * @param componentInstance 新图表实例
     * @param isHead 是否头部插入
     * @param isHistory 是否进行记录
     * @returns
     */
    addComponentList(
      componentInstance:
        | CreateComponentType
        | CreateComponentGroupType
        | Array<CreateComponentType | CreateComponentGroupType>,
      isHead = false,
      isHistory = false
    ): void {
      if (componentInstance instanceof Array) {
        componentInstance.forEach(item => {
          this.addComponentList(item, isHead, isHistory)
        })
        return
      }
      if (isHistory) {
        chartHistoryStore.createAddHistory(cloneDeep([componentInstance]))
      }
      if (isHead) {
        this.componentList.unshift(componentInstance)
        return
      }
      this.componentList.push(componentInstance)
    },
    // * 删除组件
    removeComponentList(id?: string | string[], isHistory = true): void {
      try {
        this.transformControlsState.enabled = false
        this.transformRef = null
        const idArr = this.idPreFormat(id)
        const history: Array<CreateComponentType | CreateComponentGroupType> = []
        // 遍历所有对象
        if (!idArr.length) return

        loadingStart()
        idArr.forEach(ids => {
          const index = this.fetchTargetIndex(ids)
          if (index.length > 1) {
            this.componentList = this.componentList.map((item: any) => {
              item.groupList = item.groupList?.filter((cc: any) => cc.id !== ids) || []
              return item
            })
          } else if (index > -1) {
            history.push(this.getComponentList[index])
            this.componentList.splice(index, 1)
          }
        })
        this.targetChart.selectId = []
        isHistory && chartHistoryStore.createDeleteHistory(history)
        loadingFinish()
        return
      } catch (value) {
        loadingError()
      }
    },
    // * 重置组件位置
    resetComponentPosition(item: CreateComponentType | CreateComponentGroupType, isForward: boolean): void {
      const componentInstance = this.getComponentListItem(item.id)
      if (componentInstance) {
        if (isForward) {
          componentInstance.attr = Object.assign(componentInstance.attr, {
            x: item.attr.x + item.attr.offsetX,
            y: item.attr.y + item.attr.offsetY
          })
        } else {
          componentInstance.attr = Object.assign(componentInstance.attr, {
            x: item.attr.x,
            y: item.attr.y
          })
        }
      }
    },
    // * 移动组件
    moveComponentList(item: Array<CreateComponentType | CreateComponentGroupType>) {
      chartHistoryStore.createMoveHistory(item)
    },
    // * 更新组件列表某一项的值
    updateComponentList(index: any, newData: CreateComponentType | CreateComponentGroupType) {
      // const min = 1
      // const max = 100
      // const randomInteger = Math.floor(Math.random() * (max - min + 1)) + min
      if (index.length > 1) {
        const [f, t] = index
        this.componentList[f].groupList[t] = newData
        // this.componentList[f].random = this.componentList[f].id+randomInteger
      } else {
        if (index < 1 && index > this.getComponentList.length) return
        this.componentList[index] = newData
      }
      console.log(this.componentList, '更新组件')
    },
    //设置option
    setComponentList(d: String, newData: CreateComponentType | CreateComponentGroupType, key: string = 'option') {
      let id = d
      // if (id == undefined) {
      //   id = this.getTargetChart()
      // }
      this.componentList.forEach((item: any) => {
        if (item.id == id) {
          chartHistoryStore.createUpdateHistory([cloneDeep(item)])
          item[key] = { ...item[key], ...newData }
        } else {
          item.groupList?.forEach((cc: any) => {
            if (cc.id == id) {
              chartHistoryStore.createUpdateHistory([cloneDeep(cc)])
              cc[key] = { ...cc[key], ...newData }
            }
          })
        }
      })
    },
    //设置属性全覆盖
    setComponentListAll(
      d: String,
      newData: CreateComponentType | CreateComponentGroupType | string,
      key: string = 'option'
    ) {
      let id = d
      // if(id==undefined){
      // id = this.getTargetChart()
      // }
      this.componentList.forEach((item: any) => {
        if (item.id == id) {
          chartHistoryStore.createUpdateHistory([cloneDeep(item)])
          item[key] = newData
        } else {
          item.groupList?.forEach((cc: any) => {
            if (cc.id == id) {
              chartHistoryStore.createUpdateHistory([cloneDeep(cc)])
              cc[key] = newData
            }
          })
        }
      })
    },
    // * 设置页面样式属性
    setPageStyle<T extends keyof CSSStyleDeclaration>(key: T, value: any): void {
      const dom = this.getEditCanvas.editContentDom
      if (dom) {
        dom.style[key] = value
      }
    },
    // * 移动组件列表层级位置到两端
    setBothEnds(isEnd = false, isHistory = true): void {
      try {
        // 暂不支持多选
        if (this.getTargetChart.selectId.length > 1) return

        loadingStart()
        const length = this.getComponentList.length
        if (length < 2) {
          loadingFinish()
          return
        }

        const index = this.fetchTargetIndex()
        const targetData = this.getCurrentListItem()
        if (index !== -1) {
          // 置底排除最底层, 置顶排除最顶层
          if ((isEnd && index === 0) || (!isEnd && index === length - 1)) {
            loadingFinish()
            return
          }

          // 记录原有位置
          const setIndex = (componentInstance: CreateComponentType | CreateComponentGroupType, i: number) => {
            const temp = cloneDeep(componentInstance)
            temp.attr.zIndex = i
            return temp
          }

          // 历史记录
          if (isHistory) {
            chartHistoryStore.createLayerHistory(
              [setIndex(targetData, index)],
              isEnd ? HistoryActionTypeEnum.BOTTOM : HistoryActionTypeEnum.TOP
            )
          }

          // 插入两端
          this.addComponentList(targetData, isEnd)
          this.getComponentList.splice(isEnd ? index + 1 : index, 1)
          loadingFinish()
          return
        }
      } catch (value) {
        loadingError()
      }
    },
    // * 置顶
    setTop(isHistory = true): void {
      this.setBothEnds(false, isHistory)
    },
    // * 置底
    setBottom(isHistory = true): void {
      this.setBothEnds(true, isHistory)
    },
    // * 上移/下移互换图表位置
    wrap(isDown = false, isHistory = true) {
      try {
        // 暂不支持多选
        if (this.getTargetChart.selectId.length > 1) return

        loadingStart()
        const length = this.getComponentList.length
        if (length < 2) {
          loadingFinish()
          return
        }

        const index: number = this.fetchTargetIndex()
        if (index !== -1) {
          // 下移排除最底层, 上移排除最顶层
          if ((isDown && index === 0) || (!isDown && index === length - 1)) {
            loadingFinish()
            return
          }
          // 互换位置
          const swapIndex = isDown ? index - 1 : index + 1
          const targetItem = this.getComponentList[index]
          const swapItem = this.getComponentList[swapIndex]

          // 历史记录
          if (isHistory) {
            chartHistoryStore.createLayerHistory(
              [targetItem],
              isDown ? HistoryActionTypeEnum.DOWN : HistoryActionTypeEnum.UP
            )
          }
          this.updateComponentList(index, swapItem)
          this.updateComponentList(swapIndex, targetItem)
          loadingFinish()
          return
        }
      } catch (value) {
        loadingError()
      }
    },
    // * 图层上移
    setUp(isHistory = true) {
      this.wrap(false, isHistory)
    },
    // * 图层下移
    setDown(isHistory = true) {
      this.wrap(true, isHistory)
    },
    // * 复制
    setCopy(isCut = false) {
      try {
        // 暂不支持多选
        if (this.getTargetChart.selectId.length > 1) return
        // 处理弹窗普通复制的场景
        if (document.getElementsByClassName('n-modal-body-wrapper').length) return
        loadingStart()
        const copyData: RecordChartType = {
          charts: this.getComponentListItem(this.getTargetChart.selectId),
          type: isCut ? HistoryActionTypeEnum.CUT : HistoryActionTypeEnum.COPY
        }
        this.setRecordChart(copyData)
        window['$message'].success(isCut ? '剪切图表成功' : '复制图表成功！')
        loadingFinish()
      } catch (value) {
        loadingError()
      }
    },
    // * 剪切
    setCut() {
      this.setCopy(true)
    },
    // * 粘贴
    setParse() {
      try {
        loadingStart()
        const recordCharts = this.getRecordChart
        if (recordCharts === undefined) {
          loadingFinish()
          return
        }
        const parseHandle = (e: CreateComponentType | CreateComponentGroupType) => {
          e = cloneDeep(e)
          e.attr.x = this.getMousePosition.startX
          e.attr.y = this.getMousePosition.startY
          // 外层生成新 id
          e.id = getUUID()
          // 分组列表生成新 id
          if (e.isGroup) {
            ;(e as CreateComponentGroupType).groupList.forEach((item: CreateComponentType) => {
              item.id = getUUID()
            })
          }

          return e
        }
        const isCut = recordCharts.type === HistoryActionTypeEnum.CUT
        const targetList = Array.isArray(recordCharts.charts) ? recordCharts.charts : [recordCharts.charts]
        // 多项
        targetList.forEach((e: CreateComponentType | CreateComponentGroupType) => {
          this.addComponentList(parseHandle(e), undefined, true)
          // 剪切需删除原数据
          if (isCut) {
            this.setTargetSelectChart(e.id)
            this.removeComponentList(undefined, true)
          }
        })
        if (isCut) this.setRecordChart(undefined)
        loadingFinish()
      } catch (value) {
        loadingError()
      }
    },
    // * 撤回/前进 目标处理
    setBackAndSetForwardHandle(HistoryItem: HistoryItemType, isForward = false) {
      console.log(isForward ? '下一步:' : '撤回:', HistoryItem)
      this.transformControlsState.enabled = false
      this.transformRef = null
      let historyData = HistoryItem.historyData as Array<CreateComponentType | CreateComponentGroupType>
      //处理更新
      const isUpdate = HistoryItem.actionType === HistoryActionTypeEnum.UPDATE
      if (isUpdate) {
        historyData?.map((item: any) => {
          const index = this.fetchTargetIndex(item?.id)
          this.updateComponentList(index, item)
        })
        return
      }

      // 处理画布
      if (HistoryItem.targetType === HistoryTargetTypeEnum.CANVAS) {
        this.editCanvas = HistoryItem.historyData[0] as EditCanvasType
        return
      }

      // 取消选中
      this.setTargetSelectChart()

      // 重新选中

      if (isArray(historyData)) {
        // 选中目标元素，支持多个
        historyData.forEach((item: CreateComponentType | CreateComponentGroupType) => {
          this.setTargetSelectChart(item.id, true)
        })
      }
      // 处理新增类型
      const isAdd = HistoryItem.actionType === HistoryActionTypeEnum.ADD
      const isDel = HistoryItem.actionType === HistoryActionTypeEnum.DELETE
      if (isAdd || isDel) {
        if ((isAdd && isForward) || (isDel && !isForward)) {
          historyData.forEach(item => {
            this.addComponentList(item)
          })
          return
        }
        historyData.forEach(item => {
          this.removeComponentList(item.id, false)
        })
        return
      }

      // 处理移动
      // const isMove = HistoryItem.actionType === HistoryActionTypeEnum.MOVE
      // if (isMove) {
      //   historyData.forEach(item => {
      //     this.resetComponentPosition(item, isForward)
      //   })
      //   return
      // }

      // 处理层级
      // const isTop = HistoryItem.actionType === HistoryActionTypeEnum.TOP
      // const isBottom = HistoryItem.actionType === HistoryActionTypeEnum.BOTTOM
      // if (isTop || isBottom) {
      //   if (!isForward) {
      //     // 插入到原有位置
      //     if (isTop) this.getComponentList.pop()
      //     if (isBottom) this.getComponentList.shift()
      //     this.getComponentList.splice(historyData[0].attr.zIndex, 0, historyData[0])
      //     return
      //   }
      //   if (isTop) this.setTop(false)
      //   if (isBottom) this.setBottom(false)
      // }

      // const isUp = HistoryItem.actionType === HistoryActionTypeEnum.UP
      // const isDown = HistoryItem.actionType === HistoryActionTypeEnum.DOWN
      // if (isUp || isDown) {
      //   if ((isUp && isForward) || (isDown && !isForward)) {
      //     this.setUp(false)
      //     return
      //   }
      //   this.setDown(false)
      //   return
      // }

      // 处理分组
      const isGroup = HistoryItem.actionType === HistoryActionTypeEnum.GROUP
      const isUnGroup = HistoryItem.actionType === HistoryActionTypeEnum.UN_GROUP
      if (isGroup || isUnGroup) {
        if ((isGroup && isForward) || (isUnGroup && !isForward)) {
          const ids: string[] = []
          if (historyData.length > 1) {
            historyData.forEach(item => {
              ids.push(item.id)
            })
          } else {
            const group = historyData[0] as CreateComponentGroupType
            group.groupList.forEach(item => {
              ids.unshift(item.id)
            })
          }
          this.setGroup(ids, false)
          return
        }
        console.log(isGroup, isUnGroup, historyData, 333)
        // 都需使用子组件的id去解组
        if (historyData.length > 1) {
          this.setUnGroup([(historyData[0] as CreateComponentType).id], undefined, false)
        } else {
          this.setUnGroup([(historyData[0] as CreateComponentGroupType).groupList[0].id], undefined, false)
        }
        return
      }

      // 处理锁定
      // const isLock = HistoryItem.actionType === HistoryActionTypeEnum.LOCK
      // const isUnLock = HistoryItem.actionType === HistoryActionTypeEnum.UNLOCK
      // if (isLock || isUnLock) {
      //   if ((isLock && isForward) || (isUnLock && !isForward)) {
      //     historyData.forEach(item => {
      //       this.setLock(!item.status.lock, false)
      //     })
      //     return
      //   }
      //   historyData.forEach(item => {
      //     this.setUnLock(false)
      //   })
      //   return
      // }

      // 处理隐藏
      const isHide = HistoryItem.actionType === HistoryActionTypeEnum.HIDE
      const isShow = HistoryItem.actionType === HistoryActionTypeEnum.SHOW
      if (isHide || isShow) {
        if ((isHide && isForward) || (isShow && !isForward)) {
          historyData.forEach(item => {
            this.setHide(!item.status.hide, false)
          })
          return
        }
        historyData.forEach(item => {
          this.setShow(false)
        })
        return
      }
    },
    // * 撤回
    setBack() {
      try {
        loadingStart()
        const targetData = chartHistoryStore.backAction()
        if (!targetData) {
          loadingFinish()
          return
        }
        this.setBackAndSetForwardHandle(targetData)
        loadingFinish()
      } catch (value) {
        loadingError()
      }
    },
    // * 前进
    setForward() {
      try {
        loadingStart()
        const targetData = chartHistoryStore.forwardAction()
        if (!targetData) {
          loadingFinish()
          return
        }
        this.setBackAndSetForwardHandle(targetData, true)
        loadingFinish()
      } catch (value) {
        loadingError()
      }
    },
    // * 移动位置
    setMove(keyboardValue: MenuEnum) {
      const obj = this.getCurrentListItem()
      if (!obj) return
      const option = obj.option
      option.position = option.position || [0, 0]
      const distance = settingStore.getChartMoveDistance / 10
      switch (keyboardValue) {
        case MenuEnum.ARROW_UP:
          option.position[1] += distance
          break
        case MenuEnum.ARROW_RIGHT:
          option.position[0] += distance
          break
        case MenuEnum.ARROW_DOWN:
          option.position[1] -= distance
          break
        case MenuEnum.ARROW_LEFT:
          option.position[0] -= distance
          break
      }
    },
    // * 创建分组
    setGroup(id?: string | string[], isHistory = true) {
      try {
        this.transformControlsState.enabled = false
        this.transformRef = null
        let selectIds = this.idPreFormat(id) || this.getTargetChart.selectId
        selectIds = this.getSelectIdSortList(selectIds)
        if (selectIds.length < 2) return

        loadingStart()
        const groupClass = new PublicGroupConfigClass()
        const targetList: CreateComponentType[] = []
        const historyList: CreateComponentType[] = []

        // 若目标中有数组则先解组
        const newSelectIds: string[] = []
        selectIds.forEach((id: string) => {
          const targetIndex = this.fetchTargetIndex(id)
          if (targetIndex !== -1 && this.getComponentList[targetIndex].isGroup) {
            this.setUnGroup(
              [id],
              (e: CreateComponentType[]) => {
                e.forEach(e => {
                  this.addComponentList(e)
                  newSelectIds.push(e.id)
                })
              },
              false
            )
          } else if (targetIndex !== -1) {
            newSelectIds.push(id)
          }
        })
        // 记录整体坐标
        const groupAttr = {
          l: 0,
          t: 0,
          r: 0,
          b: 0
        }
        newSelectIds.forEach((id: string, index: number) => {
          // 获取目标数据并从 list 中移除 (成组后不可再次成组, 断言处理)
          const item = this.componentList.splice(this.fetchTargetIndex(id), 1)[0] as CreateComponentType
          // const { x, y, w, h } = item.attr
          // if (index === 0) {
          //   groupAttr.l = x
          //   groupAttr.t = y
          //   groupAttr.r = x + w
          //   groupAttr.b = y + h
          // } else {
          //   const { l, t, r, b } = groupAttr
          //   // 左
          //   groupAttr.l = l > x ? x : l
          //   // 上
          //   groupAttr.t = t > y ? y : t
          //   // 宽
          //   groupAttr.r = r < x + w ? x + w : r
          //   // 高
          //   groupAttr.b = b < y + h ? y + h : b
          // }
          targetList.push(item)
          historyList.push(toRaw(item))
        })

        // 修改原数据之前，先记录
        if (isHistory) chartHistoryStore.createGroupHistory(historyList)

        // 设置子组件的位置
        targetList.forEach((item: CreateComponentType) => {
          // item.attr.x = item.attr.x - groupAttr.l
          // item.attr.y = item.attr.y - groupAttr.t
          groupClass.groupList.push(item)
        })

        // 设置 group 属性
        groupClass.option.position = [groupAttr.l, groupAttr.r, groupAttr.b]
        // groupClass.attr.y = groupAttr.t
        // groupClass.attr.w = groupAttr.r - groupAttr.l
        // groupClass.attr.h = groupAttr.b - groupAttr.t
        this.addComponentList(groupClass)
        this.setTargetSelectChart(groupClass.id)

        loadingFinish()
      } catch (error) {
        console.log(error)
        window['$message'].error('创建分组失败，请联系管理员')
        loadingFinish()
      }
    },
    // * 解除分组
    setUnGroup(ids?: string[], callBack?: (e: CreateComponentType[]) => void, isHistory = true) {
      this.transformControlsState.enabled = false
      this.transformRef = null
      try {
        const selectGroupIdArr = ids || this.getTargetChart.selectId
        if (selectGroupIdArr.length !== 1) return
        loadingStart()
        // 解组
        const unGroup = (id: string) => {
          const targetGroup = this.getComponentGroup(id)
          if (!targetGroup.isGroup) return
          // 记录数据
          if (isHistory) chartHistoryStore.createUnGroupHistory(cloneDeep([targetGroup]))

          // 分离组件并还原位置属性
          targetGroup.groupList.forEach(item => {
            item.attr.x = item.attr.x + targetGroup.attr.x
            item.attr.y = item.attr.y + targetGroup.attr.y
            if (!callBack) {
              this.addComponentList(item)
            }
          })
          this.setTargetSelectChart(targetGroup.id)
          // 删除分组
          this.removeComponentList(targetGroup.id, false)

          if (callBack) {
            callBack(targetGroup.groupList)
          }
        }
        // 判断目标是否为分组父级
        const targetIndex = this.fetchTargetIndex(selectGroupIdArr[0])
        // 判断目标是否为分组父级
        if (targetIndex !== -1) {
          unGroup(selectGroupIdArr[0])
        }
        loadingFinish()
      } catch (error) {
        console.log(error)
        window['$message'].error('解除分组失败，请联系管理员')
        loadingFinish()
      }
    },
    // * 锁定
    setLock(status: boolean = true, isHistory: boolean = true) {
      try {
        // 暂不支持多选
        if (this.getTargetChart.selectId.length > 1) return

        loadingStart()
        const index: number = this.fetchTargetIndex()
        if (index !== -1) {
          // 更新状态
          const targetItem = this.getComponentList[index]
          targetItem.status.lock = status

          // 历史记录
          if (isHistory) {
            status
              ? chartHistoryStore.createLockHistory([targetItem])
              : chartHistoryStore.createUnLockHistory([targetItem])
          }
          this.updateComponentList(index, targetItem)
          // 锁定添加失焦效果
          if (status) this.setTargetSelectChart(undefined)
          loadingFinish()
          return
        }
      } catch (value) {
        loadingError()
      }
    },
    // * 解除锁定
    setUnLock(isHistory: boolean = true) {
      this.setLock(false, isHistory)
    },
    // * 隐藏
    setHide(status: boolean = true, isHistory: boolean = true) {
      try {
        this.transformControlsState.enabled = false
        this.transformRef = null
        // 暂不支持多选
        if (this.getTargetChart.selectId.length > 1) return
        loadingStart()
        const index: number = this.fetchTargetIndex()

        if (index !== -1) {
          // 更新状态
          const targetItem = this.getCurrentListItem()
          targetItem.status.hide = status

          // 历史记录
          if (isHistory) {
            status
              ? chartHistoryStore.createHideHistory([targetItem])
              : chartHistoryStore.createShowHistory([targetItem])
          }
          this.updateComponentList(index, targetItem)
          loadingFinish()

          // 隐藏添加失焦效果
          if (status) this.setTargetSelectChart(undefined)
        }
      } catch (value) {
        loadingError()
      }
    },
    // * 显示
    setShow(isHistory: boolean = true) {
      this.setHide(false, isHistory)
    },
    // ----------------
    // * 设置页面大小
    setPageSize(scale: number): void {
      this.setPageStyle('height', `${this.editCanvasConfig.height * scale}px`)
      this.setPageStyle('width', `${this.editCanvasConfig.width * scale}px`)
    },
    // * 计算缩放
    computedScale() {
      if (this.getEditCanvas.editLayoutDom) {
        // 现有展示区域
        const width = this.getEditCanvas.editLayoutDom.clientWidth - this.getEditCanvas.offset * 2 - 5
        const height = this.getEditCanvas.editLayoutDom.clientHeight - this.getEditCanvas.offset * 4

        // 用户设定大小
        const editCanvasWidth = this.editCanvasConfig.width
        const editCanvasHeight = this.editCanvasConfig.height

        // 需保持的比例
        const baseProportion = parseFloat((editCanvasWidth / editCanvasHeight).toFixed(5))
        const currentRate = parseFloat((width / height).toFixed(5))

        if (currentRate > baseProportion) {
          // 表示更宽
          const scaleWidth = parseFloat(((height * baseProportion) / editCanvasWidth).toFixed(5))
          this.setScale(scaleWidth > 1 ? 1 : scaleWidth)
        } else {
          // 表示更高
          const scaleHeight = parseFloat((width / baseProportion / editCanvasHeight).toFixed(5))
          this.setScale(scaleHeight > 1 ? 1 : scaleHeight)
        }
      } else {
        window['$message'].warning('请先创建画布，再进行缩放')
      }
    },
    // * 监听缩放
    listenerScale(): Function {
      const resize = debounce(this.computedScale, 200)
      // 默认执行一次
      resize()
      // 开始监听
      window.addEventListener('resize', resize)
      // 销毁函数
      const remove = () => {
        window.removeEventListener('resize', resize)
      }
      return remove
    },
    /**
     * * 设置缩放
     * @param scale 0~1 number 缩放比例;
     * @param force boolean 强制缩放
     */
    setScale(scale: number, force = false): void {
      if (!this.getEditCanvas.lockScale || force) {
        this.setPageSize(scale)
        this.getEditCanvas.userScale = scale
        this.getEditCanvas.scale = scale
      }
    }
  }
})

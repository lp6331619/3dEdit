<style lang="scss" scoped>
.fastPanel {
  @apply bg-primary transform-translate-x-[-100%];
  width: 300px;
  position: absolute;
  inset: 0;
  line-height: 2;
}
</style>
<template>
  <div>
    <div class="flex items-center mb-20px">
      <span class="flex-shrink">连接选择：</span>
      <div>
        <el-select
          v-model="tableState.scadaConnectionId"
          filterable
          clearable
          style="width: 146px"
          size="small"
          @change="scadaSearch"
        >
          <el-option v-for="(item, i) in scadaList" :key="item.id" :label="item.name" :value="item.id"></el-option>
        </el-select>
      </div>
    </div>
    <div class="flex items-center mb-20px">
      <span class="flex-shrink">设备选择：</span>
      <div>
        <el-select
          v-model="tableState.deviceNum"
          filterable
          clearable
          style="width: 146px"
          size="small"
          @change="search(true)"
        >
          <el-option
            v-for="(item, i) in deviceList"
            :key="item.deviceNum"
            :label="item.name"
            :value="item.deviceNum"
          ></el-option>
        </el-select>
      </div>
    </div>
    <div class="flex items-center mb-20px">
      <span class="flex-shrink">通道搜索：</span>
      <div>
        <el-input placeholder="请输入搜索通道" v-model="tableState.keyword" @input="inputDebounceSearch" size="small" />
      </div>
    </div>
    <el-table
      ref="multipleTableRef"
      :data="data.data"
      v-loading="loading"
      height="300"
      row-key="cnlNum"
      scrollbar-always-on
      @selection-change="handleSelectionChange"
      border
    >
      <el-table-column v-if="isMultiple" type="selection" width="55" reserve-selection />
      <el-table-column label="选择" v-else width="55">
        <template v-slot="scope">
          <el-radio
            :value="scope.row.cnlNum"
            v-model="checkOnesState.vmodelCheck"
            @change="checkOnesState.row = { [tableState.scadaConnectionId]: scope.row }"
          ></el-radio>
        </template>
      </el-table-column>
      <el-table-column align="center" prop="cnlNum" label="通道id" min-width="80">
        <template v-slot="scope"> {{ scope.row.cnlNum }} </template>
      </el-table-column>
      <el-table-column align="center" prop="name" label="通道名称" min-width="180" />
    </el-table>

    <div class="fastPanel" v-if="showPickPanel">
      <el-scrollbar>
        <template v-if="isMultiple">
          <div v-for="(box, key) in selectData" :key="key">
            <div v-for="(item, index) in box" :key="index" class="px-10px flex items-center h-34px line-height-34px">
              <div class="flex-1 line-clamp-1">[{{ returnName(key) }}]{{ item.name }}</div>
              <el-button size="small" @click="delItem(item, key, index)">移除</el-button>
            </div>
          </div>
        </template>
        <template v-else>
          <div v-for="(item, key) in checkOnesState.row" :key="item.cnlNum">
            <div class="px-10px flex items-center h-34px line-height-34px">
              <div class="flex-1 line-clamp-1">[{{ returnName(key) }}] {{ item.name }}</div>
              <el-button size="small" @click="nApi.clearSelection()">移除</el-button>
            </div>
          </div>
        </template>
      </el-scrollbar>
    </div>

    <div class="flex justify-end mt-10px">
      <el-pagination
        size="small"
        v-model:current-page="tableState.pageIndex"
        background
        layout="prev, pager, next"
        :total="data.totalCount"
        @current-change="search()"
      />
    </div>
    <div class="flex justify-between mt-20px">
      <div>
        <el-button size="small" @click="showPickPanel = !showPickPanel"
          >{{ showPickPanel ? '关闭' : '查看' }}已选中面板</el-button
        >
      </div>

      <div class="flex">
        <el-button size="small" @click="clear">清空{{ isMultiple ? '全选' : '单选' }}选中</el-button>
        <el-button size="small" @click="emit('close')">取消</el-button>
        <el-button size="small" @click="save" type="primary">保存</el-button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { configDatabaseGetCnlPaged, configDatabaseGetDeviceList } from 'swagger-api/export-api/scada-api'

import { ref, defineEmits, reactive, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useHttpRequest } from '@/hooks/useHttpRequest'
import { FixedSizeList } from 'element-plus'
import { debounce } from 'lodash-es'
import { ElMessage } from 'element-plus'
import { ApiTypeEnum } from '@/elements/enum.js'
import { isApiCode } from '@/utils/index'
import { useTargetData } from '../../../hooks/useTargetData.hook'
const { targetData, chartEditStore } = useTargetData()
const props = defineProps({
  currentKey: {
    type: String
  },
  scadaList: {
    type: Array,
    default: []
  },
  scadaConnectionId: {
    type: Number,
    default: undefined
  }
})
const emit = defineEmits(['save', 'close'])
const showPickPanel = ref(false)
const checkOnesState = reactive({
  vmodelCheck: '',
  row: null
})
const returnName = id => {
  const obj = scadaList.value?.find(item => item.id == id) || {}
  return obj.name || ''
}
//选择数据
const isSock = ref(false)
const handleSelectionChange = data => {
  if (isSock.value) return
  selectData.value[tableState.scadaConnectionId] = data
}
const selectData = ref({})
const tableState = reactive({
  keyword: '',
  pageIndex: 1,
  pageSize: 10,
  deviceNum: undefined,
  scadaConnectionId: undefined,
  isOutput: props.currentKey === 'OutPutDefaultIds'
})

const multipleTableRef = ref()
const deviceList = ref([])
const scadaSearch = async () => {
  tableState.deviceNum = undefined
  await getData()
  search(true)
}
const getData = async () => {
  if (tableState.scadaConnectionId) {
    const res = await configDatabaseGetDeviceList({ scadaConnectionId: tableState.scadaConnectionId })
    deviceList.value = res.data
  }
}
const isMultiple = computed(() => {
  return props.currentKey == 'InputDefaultIds'
})
// 删除
const delItem = (item, key, index) => {
  if (key == tableState.scadaConnectionId) {
    nApi.toggle(item, false)
  } else {
    selectData.value[key] = selectData.value[key]?.filter((t, i) => i != index)
  }
}
// 获取之前选择的数据
const saveDataIdsValue = computed(() => {
  const { thoroughfare = {} } = targetData.value
  let ids = undefined
  if (isMultiple.value) {
    ids = thoroughfare[props.currentKey] ? thoroughfare[props.currentKey][scadaConnectionId.value] : {}
    selectData.value = thoroughfare[props.currentKey] || {}
  } else {
    ids = thoroughfare[props.currentKey] || []
  }
  return ids
})
const scadaConnectionId = computed(() => {
  return tableState.scadaConnectionId
})
const { loading, fetchData, data } = useHttpRequest(configDatabaseGetCnlPaged, {
  initializeValue: {
    totalCount: 0,
    data: []
  }
})

async function search(clear = false) {
  if (loading.value || !tableState.scadaConnectionId) return
  if (clear) {
    tableState.pageIndex = 1
  }
  await fetchData(tableState)
  if (!clear) return
  isSock.value = true
  nApi.clearSelection()
  const select = isMultiple.value
    ? selectData.value
      ? selectData.value[tableState.scadaConnectionId]
      : []
    : checkOnesState.row
    ? checkOnesState.row[tableState.scadaConnectionId]
    : []
  select && nApi.setSelect(select)
  setTimeout(() => {
    isSock.value = false
  }, 100)
}

const inputDebounceSearch = debounce(search)

const nApi = nomolizeApi()
const scadaList = ref([])

onMounted(async () => {
  tableState.scadaConnectionId = props.scadaConnectionId
  scadaList.value = props.scadaList
  nextTick(() => {
    saveDataIdsValue.value?.length && nApi.setSelect(saveDataIdsValue.value)
  })
  tableState.scadaConnectionId && (await getData())
  search()
})

function nomolizeApi() {
  if (isMultiple.value) {
    return {
      setSelect(rows) {
        rows?.length > 0 &&
          rows?.forEach(row => {
            multipleTableRef.value.toggleRowSelection(row, true)
          })
      },
      toggle(row, bool) {
        console.log(rows, 888)
        multipleTableRef.value.toggleRowSelection(row, bool)
      },
      getRow() {
        if (!multipleTableRef.value) {
          return []
        }
        return multipleTableRef.value.getSelectionRows()
      },
      clearSelection() {
        multipleTableRef.value.clearSelection()
      }
    }
  }
  return {
    setSelect(rows) {
      const [row = {}] = rows
      for (let i in row) {
        checkOnesState.vmodelCheck = row[i].cnlNum
        checkOnesState.row = row
      }
    },
    toggle(row, bool) {
      const [f] = Object.keys(row)
      if (row) {
        this.setSelect(row[f], bool)
      } else {
        this.clearSelection()
      }
    },
    getRow() {
      return checkOnesState.row ? [checkOnesState.row] : []
    },
    clearSelection() {
      checkOnesState.vmodelCheck = ''
      checkOnesState.row = []
    }
  }
}

function save() {
  const { getRow } = nomolizeApi()
  // const rows = getRow()
  // const passageway = rows.reduce((prev, next) => {
  //   prev[next.cnlNum] = next
  //   return prev
  // }, {})
  emit('save', isMultiple.value ? selectData.value : checkOnesState.row ? [checkOnesState.row] : [], props.currentKey)
}

function clear() {
  const { clearSelection } = nomolizeApi()
  clearSelection()
  selectData.value = {}
  ElMessage({
    type: 'warning',
    message: '请注意这里的清空只是清空表格,点击保存将回真的清空数据!'
  })
}
</script>

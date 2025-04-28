<template>
  <div>
    <el-form :model="typeValue" :rules="rules" ref="formRef" size="small" label-width="60" label-position="left">
      <el-form-item label="通道ID">
        {{ penEmun.cnlNum }}
      </el-form-item>
      <el-form-item label="通道名称">
        {{ penEmun.name }}
      </el-form-item>
      <el-form-item label="命令值" prop="cmdVal" v-if="penEmun.dataType === 1">
        <el-input-number v-model="typeValue.cmdVal" />
      </el-form-item>
      <el-form-item label="命令值" prop="cmdVal" v-if="penEmun.dataType === 2">
        <el-radio-group v-model="typeValue.cmdVal" size="small">
          <el-radio-button v-for="(itemName, index) in penEmun.enum.values" :label="itemName" :value="index" />
        </el-radio-group>
      </el-form-item>
      <el-form-item label="命令值" prop="cmdVal" v-if="penEmun.dataType === 3">
        <el-date-picker placeholder="请选择日期" v-model="typeValue.cmdVal" type="date" size="small" />
      </el-form-item>
      <el-form-item label="命令值" prop="cmdVal" v-if="penEmun.dataType === 4">
        <el-input v-model="typeValue.cmdVal" type="textarea" placeholder="请输入字符串"></el-input>
      </el-form-item>
    </el-form>

    <div class="flex justify-end">
      <el-button size="small" type="primary" @click="submit" :loading="loading">提交</el-button>
      <el-button size="small" @click="emits('close')">取消</el-button>
    </div>
  </div>
</template>
<script setup>
import { computed, defineProps, ref, defineEmits, reactive } from 'vue'
import { useHttpRequest } from '@/hooks/useHttpRequest'
import { ElMessage } from 'element-plus'
// import { first } from 'lodash-es'
import { commandSendCommand } from 'swagger-api/export-api/scada-api'

const props = defineProps({
  outputPen: {
    type: Object,
    default: null
  },
  id:{
    type:Number,
    default:null
  }
})

const { loading, fetchData } = useHttpRequest(commandSendCommand)
const penEmun = computed(() => {
  const data = props.outputPen
  console.log(data, 123123)
  return data
})

const typeValue = reactive({
  cmdVal: penEmun.value.dataType === 1 ? 0 : ''
})

const rules = {
  cmdVal: [
    {
      required: true,
      type: penEmun.value.dataType === 1 ? 'number' : 'string',
      message: (() => {
        switch (penEmun.value.dataType) {
          case 1:
            return '请输入数字'
          case 2:
            return '请选择命令'
          case 3:
            return '请选择时间'
          case 4:
            return '请输入字符串'
        }
      })()
    }
  ]
}
const formRef = ref()

const emits = defineEmits(['close'])

function submit() {
  formRef.value.validate(async e => {
    if (e) {
      const { cnlNum } = penEmun.value
      const { success } = await fetchData({
        cnlNum,
        cmdVal: typeValue.cmdVal.toString(),
        scadaConnectionId:props.id
      })

      success(() => {
        emits('close')
        ElMessage({
          type: 'success',
          message: '命令发送成功！'
        })
      })
    }
  })
}
</script>

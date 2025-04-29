<template>
  <div>
      <div>
        <div class="md"
          v-if="tableData.length"
        >
          <div v-html="mdHtml"></div>
        </div>
        <el-form ref="formRef" :model="tableData">
          <el-table :data="tableData" border>
            <el-table-column min-width="100" label="条件" header-align="center">
              <template #header>
                <div class="require-head">条件</div>
              </template>
              <template v-slot:default="{row,$index}">
                <el-form-item :prop="`${$index}.condition`" 
                  :rules="[
                    {
                      required:true,
                      message:'条件不可为空',
                      trigger:'change'
                    }
                  ]"
                >
                <el-select 
                    v-model="row.condition"
                    placeholder="条件">
                    <el-option 
                      :label="i"
                      :value="i"
                      v-for="i in ConditionSelectValue"
                      :key="i"
                      />
                  </el-select>
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column 
              min-width="150" label="数值" header-align="center">
              <template #header>
                <div class="require-head">数值</div>
              </template>
              <template v-slot:default="{row,$index}">
                <el-form-item :prop="`${$index}.value`" 
                  :rules="[
                    {
                      type:'number',
                      required:true,
                      message:'数值不可为空',
                      trigger:'blur'
                    }
                  ]"
                >
                  <el-input-number style="width:100%" v-model="row.value" />
                </el-form-item>
              </template>
            </el-table-column>

            <el-table-column min-width="120" label="颜色" header-align="center" v-slot="{row}">
              <div class="flex justify-center w-full">
                <n-color-picker size="small" :modes="['hex']" v-model:value="row.color"></n-color-picker>
              </div>
            </el-table-column>

            <el-table-column 
              min-width="150" label="别名" v-slot="{row}" header-align="center">
                <el-form-item >
                  <el-input  v-model="row.alias" />
                </el-form-item>
            </el-table-column>
            <el-table-column 
              width="100" label="操作" v-slot="scope" header-align="center">
                <el-form-item >
                  <div class="flex w-full">
                    <el-button 
                      class="flex-auto"
                      type="primary"
                      size="small"
                      @click="add(scope.$index)"
                      >+</el-button>
                      <el-button 
                      class="flex-auto"
                      type="warning"
                      size="small"
                      @click="remove(scope.$index)"
                      >-</el-button>
                  </div>
                </el-form-item>
            </el-table-column>
          </el-table>
        </el-form>
        <div class="pt-8px">
          <p>1.会覆盖当前在定制中配置的文本，颜色。</p>
        </div>
        <div class="flex justify-end mt-20px">
          <el-button
            size="small"
            @click="reset"
            >重置</el-button>
            <el-button
            size="small"
            @click="emit('close')"
            >关闭</el-button>
            <el-button
            size="small"
            @click="validate"
            >保存</el-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref,watch,onMounted,toRaw } from 'vue'
import {  countVal } from '@/settings/designSetting'
import {ConditionSelect} from '@/packages/public/chart'
import markdown from "markdown-it"
import hljs from "highlight.js"
import {cloneDeep,isEqual} from 'lodash-es'
import {ELMessage} from 'element-plus'
import {builderConfig} from '@/elements/index'

const emit = defineEmits(['close'])
const props = defineProps({
  currentPoint:{
    type:Object
  },
  optionData:{
    type:Object
  }
})
const tableData = ref(buildEffectState())
const mdHtml = ref("")
const formRef = ref()

const md = markdown({
  html:true,
  typographer:true,
  highlight:(str:any,lang:any) => highlight(str,lang)
})
function highlight(str:any,lang:any){
  if(lang && hljs.getLanguage(lang)){
    return (
      '<pre class="hljs"><code>'+
      hljs.highlight(str,{language:lang,ignoreIllegals:true}).value+
      "</code></pre>"
    )
  }
}
const ConditionSelectValue = Object.values(ConditionSelect).map((item:any)=>item.label)
function buildEffectState(){
  if(props.optionData?.action?.length){
    return props.optionData.action
  }else{
    return [{
      condition:'',
      value:0,
      color:'',
      alias:''
    }]
  }
}
function add(i:number){
  tableData.value.splice(i+i,0,{})
}
function remove(i:number){
  tableData.value.splice(i,1)
}
function validate(){
  if(!tableData.value.length || isEqual(toRaw(tableData.value),[{}])){
    emit("close")
  }else{
    formRef.value.validate((e:any)=>{
      if(!e)return 
      // 赋值
      props.optionData.action = tableData.value
      const {val ,color} = countVal(tableData.value,props.optionData.val)
      props.optionData.val = val
      props.optionData.actionColor = color
      emit("close")
    })
  }
}
function reset(){
  tableData.value =[{}]
  formRef.value.resetFields()
}
function mdRender(){
  function maybeAddRowSym(value:any){
    if(value){
      return `'${value}'`
    }
    return null
  }
  const mdStr = tableData.value.map((item,index)=>{
     const cnlNumValue = props.optionData.val ||'当前通道值'
     const {condition,value,color,alias} = item
     const conditionKeyName = index===0 ?'if':'else if'
     const mdString = `
      ${conditionKeyName}(${cnlNumValue} ${condition||'无条件'} ${value??'无值'}){
        return {
          color:${maybeAddRowSym(color) || '默认颜色'},
          alias:${maybeAddRowSym(alias)|| cnlNumValue},
        }
      }//表格第${index+1}行
     ;`
     return mdString;
  }).join("");
  mdHtml.value = md.render(`
  ### typescript 
  ${mdStr}
  ###
  `.replace(/#/g,"`"))
}
watch(()=>[tableData,props.optionData],mdRender,{
  immediate:true,
  deep:true
})
</script>

<style lang="scss" scoped>
.md{
  position:absolute;
  top:0;
  left:0;
  width:330px;
  transform: translate(-100%);
}
.require-head{
  &::before{
    content:'*';
    color:red;
    vertical-align:text-top;
    margin-right:4px;
  }
}
</style>

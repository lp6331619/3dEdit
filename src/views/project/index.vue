<template>
  <div class="go-project">
    <n-layout has-sider position="absolute">
      <n-space vertical>
        <!-- <project-layout-sider></project-layout-sider> -->
      </n-space>
      <n-layout>
        <!-- <layout-header-pro></layout-header-pro> -->
        <n-layout id="go-project-content-top" class="content-top" position="absolute" :native-scrollbar="false">
          <n-layout-content>
            <div class="line">
              <div class="created ml-20px mt-30px" @click="toCreated">
                <div class="text">新建3D场景</div>
              </div>
            </div>
            <layout-transition-main>
              <router-view></router-view>
            </layout-transition-main>
          </n-layout-content>
        </n-layout>
      </n-layout>
    </n-layout>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ProjectLayoutSider } from './layout/components/ProjectLayoutSider'
import { LayoutHeaderPro } from '@/layout/components/LayoutHeaderPro'
// import { CreateModal } from './layout/components/ProjectLayoutCreate/components/CreateModal/index'
import { LayoutTransitionMain } from '@/layout/components/LayoutTransitionMain/index'
import { fetchPathByName, routerTurnByPath, renderLang, getUUID } from '@/utils'
import { PageEnum, ChartEnum } from '@/enums/pageEnum'
import { useUserStore } from '@/store/modules/userStore/index.js'
const toCreated = () => {
  const id = getUUID()
  const userStore = useUserStore()
  const token = userStore.getToken()
  const path = fetchPathByName(ChartEnum.CHART_HOME_NAME, 'href')
  routerTurnByPath(path, [id], undefined, true, '?token=' + token)
}
</script>

<style lang="scss" scoped>
.line {
  border-bottom: 1px solid #333;
  padding-bottom: 40px;
}
.created {
  width: 200px;
  height: 140px;
  margin-bottom: 20px;
  border: 1px solid #fff;
  position: relative;
  cursor: pointer;
  .text {
    position: absolute;
    left: 0;
    bottom: -40px;
    right: 0;
    text-align: center;
  }
  &::after,
  &::before {
    content: '';
    width: 100px;
    height: 1px;
    position: absolute;
    top: 50%;
    left: 50%;
    margin-left: -50px;
    background-color: #fff;
  }
  &::after {
    width: 1px;
    height: 100px;
    margin-left: 0;
    margin-top: -50px;
  }
}
@include go(project) {
  .content-top {
    // top: $--header-height;
    top: 0;
    margin-top: 1px;
  }
}
</style>

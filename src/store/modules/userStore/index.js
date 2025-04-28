// import { loginApi, logoutApi } from "@/api/auth";
// import { getUserInfoApi } from "@/api/user";
// import router, { resetRouter } from "@/router";
// import { store, usePermissionStore } from "@/store";
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createError } from "@/utils";
import { useStorage } from "@vueuse/core";
import {
  apiSessionCreate,
  apiSessionDelete,
  apiUsersCurrentList,
} from "swagger-api";
// import { useSettingsStore } from "./settings";

export const useUserStore = defineStore("user", () => {
  // const permissionStore = usePermissionStore();
  // const settingsStore = useSettingsStore();

  const user = ref({
    typeSource: useStorage("typeSource", {}),
    accessToken: useStorage("accessToken", null),
    info: useStorage("userInfo", {}),
    roles: [],
    perms: [],
  });

  /**
   * 登录
   *
   * @param {LoginData}
   * @returns
   */
  async function login(loginData) {
    const { data } = await apiSessionCreate(loginData);
    user.value.typeSource = data;
    user.value.accessToken = data.token;
    await getUserInfo();
  }

  // 获取信息(用户昵称、头像)
  async function getUserInfo() {
    const { data } = await apiUsersCurrentList();
    user.value.info = data;
  }

  function clearStore(path) {
    user.value.typeSource = {};
    user.value.accessToken = null;
    user.value.info = null;
    // permissionStore.clearStore();
    // settingsStore.clearStore();
    // window.localStorage.clear();
  }

  // user logout
  function logout() {
    return apiSessionDelete()
      .then(clearStore)
      .catch(() => {
        clearStore();
        return Promise.reject(createError("未知原因退出失败,请重新登录！"));
      });
  }
  function setToken(token) {
    user.value.accessToken = token
  }
  function getToken() {
    return user.value.accessToken
  }
  // remove token
  function resetToken(path) {
    console.log("resetToken");
    return new Promise((resolve) => {
      clearStore(path);
      resolve();
    });
  }

  function hasPermissions(key) {
    if (user.value.info?.profile?.isSuperAdmin) {
      return true;
    }
    const findPres = Array.isArray(key) ? key : [key];
    if (!user.value.info?.permissions) return false;
    return !!user.value.info?.permissions.find((key) => findPres.includes(key));
  }

  return {
    user,
    login,
    getUserInfo,
    logout,
    resetToken,
    setToken,
    getToken,
    hasPermissions,
  };
});

// 非setup
export function useUserStoreHook() {
  return useUserStore(store);
}

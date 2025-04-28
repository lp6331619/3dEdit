import { useUserStore } from '@/store/modules/userStore/index.js'
import { createError } from '@/utils'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import qs from 'qs'
// import router from "@/router/index";

export const baseURL = import.meta.env.DEV ? import.meta.env.VITE_DEV_PATH : import.meta.env.VITE_ADMIN_PROXY_PATH

const axiosInstance = axios.create({
  baseURL: '/api',
  paramsSerializer(params) {
    return qs.stringify(params, {
      // arrayFormat: 'repeat'
      allowDots:true
    })
  }
})

axiosInstance.interceptors.request.use(config => {
  if (config.headers) {
    const userStore = useUserStore()
    config.headers.Authorization = `Bearer ${userStore.user.accessToken}`
    // config.headers["Accept-Language"] = getLang;
  }
  return config
})

// 响应拦截器
axiosInstance.interceptors.response.use(
  res => {
    const { code, msg } = res.data
    if (code === 1) {
      ElMessage.error(msg)
      return
    }
    return res.data
  },
  err => {
    if (err.response) {
      const { status } = err.response
      const userStore = useUserStore()
      switch (status) {
        case 401:
          userStore.resetToken()
          ElMessage.error('授权过期，请重新登录')
          break
      }
    }
    return Promise.reject(err)
  }
)

export default axiosInstance

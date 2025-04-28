import { inspectError } from "@/utils";
import { ElMessage } from "element-plus";
import { getCurrentInstance, ref, onMounted, onUnmounted } from 'vue'
function empty(v) {
  return v;
}

export function useHttpRequest(requestFunction, options = {}) {
  const vm = getCurrentInstance();
  const _options = Object.assign(
    {
      immediately: false,
      showError: true,
      throwError: false,
      initializeValue: null,
      nomolize: empty,
      loopTime: null,
      loopCallback: null,
      immediateCallback: empty,
      defaultValue: null,
    },
    options
  );
  const loading = ref(false);
  const error = ref(null);
  const data = ref(_options.initializeValue);

  let cacheArgs = [];

  const fetchDataCache = () => fetchData(...cacheArgs);

  const fetchData = async (...arg) => {
    loading.value = true;
    error.value = null;
    cacheArgs = arg;

    try {
      const response = _options.nomolize(await requestFunction(...arg));
      if (response && response.data && response.code !== undefined) {
        data.value = response.data;
      } else {
        data.value = response;
      }
    } catch (err) {
      error.value = err;
      let message = "未知错误,请联系管理员！";
      if (inspectError(err) && _options.showError) {
        message = err.message;
      }
      ElMessage({
        message,
        grouping: true,
        type: "error",
      });
      console.error(err);
      if (_options.throwError) {
        return Promise.reject(error.value);
      }
    } finally {
      loading.value = false;
    }
    return {
      success(callback) {
        if (!error.value) return callback(data.value);
      },
      error(callback) {
        if (error.value) return callback(error.value);
      },
    };
  };

  async function runLoop(...args) {
    if (vm.isUnmounted) {
      clearTimeout(_options.intervalId);
      return;
    }
    const { success } = await fetchData(...args);
    await success(_options.loopCallback);
    _options.intervalId = setTimeout(() => runLoop(...args), _options.loopTime);
  }

  if (_options.immediately && vm) {
    // 在组件挂载时立即调用 fetchData
    onMounted(async () => {
      const { success } = await fetchData(options.defaultValue);
      if (_options.immediateCallback) {
        success(_options.immediateCallback);
      }
    });
  }

  onUnmounted(() => {
    clearTimeout(_options.intervalId);
  });
  return {
    loading,
    error,
    data,
    fetchData,
    options,
    fetchDataCache,
    runLoop,
    setOption(callback) {
      return callback(_options);
    },
  };
}

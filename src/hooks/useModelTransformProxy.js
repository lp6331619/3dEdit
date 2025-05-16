import * as THREE from 'three';

/**
 * 模型变换代理工具 - 使用简单几何体替代复杂模型进行变换操作，提高性能
 */
export function useModelTransformProxy() {
  // 存储原始模型和代理模型的映射
  const proxyModels = new Map();

  /**
   * 为复杂模型创建变换代理对象
   * @param {THREE.Object3D} originalModel - 原始复杂模型
   * @param {THREE.Scene} scene - 场景对象，用于添加代理模型
   * @returns {THREE.Object3D} - 用于变换操作的代理模型
   */
  const createModelProxy = (originalModel, scene) => {
    if (!originalModel || !scene) return null;

    // 如果已经存在代理，返回现有代理
    if (proxyModels.has(originalModel.uuid)) {
      return proxyModels.get(originalModel.uuid).proxy;
    }

    // 计算模型包围盒
    const boundingBox = new THREE.Box3().setFromObject(originalModel);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    // 获取模型中心点
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);

    // 创建代理几何体 - 使用简单的Box代表模型
    const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);

    // 使用半透明材质，便于观察
    const boxMaterial = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.4,
      wireframe: true
    });

    // 创建代理模型
    const proxyModel = new THREE.Mesh(boxGeometry, boxMaterial);

    // 设置位置、旋转和缩放，与原始模型保持一致
    proxyModel.position.copy(originalModel.position);
    proxyModel.rotation.copy(originalModel.rotation);
    proxyModel.scale.copy(originalModel.scale);

    // 应用中心点偏移
    proxyModel.position.add(center);

    // 存储映射关系
    proxyModels.set(originalModel.uuid, {
      original: originalModel,
      proxy: proxyModel,
      offset: center.clone()
    });

    // 标记为代理模型
    proxyModel.userData.isTransformProxy = true;
    proxyModel.userData.originalModelId = originalModel.uuid;

    // 添加到场景
    scene.add(proxyModel);

    // 隐藏原始模型
    originalModel.visible = false;

    return proxyModel;
  };

  /**
   * 从代理模型同步变换到原始模型
   * @param {THREE.Object3D} proxyModel - 代理模型
   */
  const syncTransformFromProxy = (proxyModel) => {
    if (!proxyModel || !proxyModel.userData.isTransformProxy) return;

    const originalModelId = proxyModel.userData.originalModelId;
    if (!originalModelId || !proxyModels.has(originalModelId)) return;

    const { original, offset } = proxyModels.get(originalModelId);

    // 同步变换属性
    original.position.copy(proxyModel.position);
    original.rotation.copy(proxyModel.rotation);
    original.scale.copy(proxyModel.scale);

    // 考虑偏移量
    const offsetVector = offset.clone();
    offsetVector.applyQuaternion(original.quaternion);
    original.position.sub(offsetVector);
  };

  /**
   * 销毁代理模型，恢复原始模型显示
   * @param {THREE.Object3D} proxyModel - 代理模型
   * @param {THREE.Scene} scene - 场景对象
   */
  const destroyModelProxy = (proxyModel, scene) => {
    if (!proxyModel || !proxyModel.userData.isTransformProxy) return;

    const originalModelId = proxyModel.userData.originalModelId;
    if (!originalModelId || !proxyModels.has(originalModelId)) return;

    const { original } = proxyModels.get(originalModelId);

    // 先同步最终变换
    syncTransformFromProxy(proxyModel);

    // 恢复原始模型可见性
    original.visible = true;

    // 移除代理模型
    if (scene) {
      scene.remove(proxyModel);
    }

    // 清理代理模型资源
    if (proxyModel.geometry) proxyModel.geometry.dispose();
    if (proxyModel.material) proxyModel.material.dispose();

    // 移除映射关系
    proxyModels.delete(originalModelId);
  };

  /**
   * 销毁所有代理模型
   * @param {THREE.Scene} scene - 场景对象
   */
  const destroyAllProxies = (scene) => {
    // 遍历所有代理模型并销毁
    proxyModels.forEach((data, id) => {
      // 恢复原始模型可见性
      data.original.visible = true;

      // 移除代理模型
      if (scene && data.proxy) {
        scene.remove(data.proxy);

        // 清理代理模型资源
        if (data.proxy.geometry) data.proxy.geometry.dispose();
        if (data.proxy.material) data.proxy.material.dispose();
      }
    });

    // 清空映射
    proxyModels.clear();
  };

  /**
   * 检查对象是否为代理模型
   * @param {THREE.Object3D} object - 要检查的对象
   * @returns {boolean} - 是否为代理模型
   */
  const isProxyModel = (object) => {
    return object && object.userData && object.userData.isTransformProxy;
  };

  /**
   * 获取代理对应的原始模型
   * @param {THREE.Object3D} proxyModel - 代理模型
   * @returns {THREE.Object3D} - 原始模型
   */
  const getOriginalFromProxy = (proxyModel) => {
    if (!isProxyModel(proxyModel)) return null;

    const originalModelId = proxyModel.userData.originalModelId;
    if (!originalModelId || !proxyModels.has(originalModelId)) return null;

    return proxyModels.get(originalModelId).original;
  };

  return {
    createModelProxy,
    syncTransformFromProxy,
    destroyModelProxy,
    destroyAllProxies,
    isProxyModel,
    getOriginalFromProxy
  };
} 
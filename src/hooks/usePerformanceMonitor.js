// 性能监控工具
export function setupPerformanceMonitoring(transformControlsState) {
  if (typeof window === 'undefined') return;

  // 存储FPS数据的变量
  window._fpsMonitor = {
    frames: 0,
    lastTime: performance.now(),
    frameRates: [], // 存储最近30秒的帧率
    transformControlsActive: false,
    startMonitoringTime: null,
    memoryUsage: [],
    renderTimes: [],
    currentFPS: 0,
    lowFpsCount: 0
  };

  // 添加帧率检测
  const checkFPS = () => {
    const now = performance.now();

    // 增加帧计数
    window._fpsMonitor.frames++;

    // 计算FPS并存储
    if (now - window._fpsMonitor.lastTime >= 1000) {
      const fps = window._fpsMonitor.frames * 1000 / (now - window._fpsMonitor.lastTime);

      // 存储帧率记录
      window._fpsMonitor.frameRates.push({
        time: new Date().toISOString(),
        fps
      });

      // 保持历史记录在合理大小
      if (window._fpsMonitor.frameRates.length > 60) {
        window._fpsMonitor.frameRates.shift();
      }

      // 记录当前帧率
      window._fpsMonitor.currentFPS = fps;

      // 检查是否是变换控制激活状态
      const isTransformActive = window.transformBusy ||
        (transformControlsState && transformControlsState.enabled);

      // 如果帧率过低且TransformControls活跃，记录性能问题
      if (fps < 30 && isTransformActive) {
        console.warn(`检测到低帧率: ${Math.round(fps)} FPS，TransformControls活跃中`);

        // 增加低帧率计数
        window._fpsMonitor.lowFpsCount = (window._fpsMonitor.lowFpsCount || 0) + 1;

        // 连续3次低帧率提示用户是否激活紧急模式，而不是自动激活
        if (window._fpsMonitor.lowFpsCount >= 3 && !window._emergencyPerformanceMode) {
          // 检查GPU使用率，如果GPU使用率低，很可能是CPU瓶颈
          const isLikelyCPUBottleneck = fps < 20 && !window._lastGPUCheckResult?.isGPUBottleneck;

          // 提示用户是否激活紧急模式
          console.warn('检测到持续低帧率，可能需要优化');

          // 使用confirm提示而不是自动激活
          if (window.confirm('检测到性能问题，是否激活紧急性能模式？这将降低图形质量以提高操作流畅度。')) {
            console.warn('用户确认激活紧急性能模式');

            // 判断是CPU还是GPU瓶颈，提供更有针对性的优化
            if (isLikelyCPUBottleneck) {
              console.warn('可能的CPU瓶颈，应用CPU优化策略');
              if (window.toggleEmergencyPerformanceMode) {
                window.toggleEmergencyPerformanceMode(true, 'cpu');
              }
            } else {
              console.warn('可能的GPU瓶颈，应用GPU优化策略');
              if (window.toggleEmergencyPerformanceMode) {
                window.toggleEmergencyPerformanceMode(true, 'gpu');
              }
            }
          }
        }

        // 尝试收集内存使用情况，如果浏览器支持
        if (window.performance && performance.memory) {
          window._fpsMonitor.memoryUsage.push({
            time: new Date().toISOString(),
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize
          });
        }

        // 检查是否有绘制时间过长的问题
        if (window._lastDrawTime && window._currentDrawTime) {
          const drawTime = window._currentDrawTime - window._lastDrawTime;
          window._fpsMonitor.renderTimes.push({
            time: new Date().toISOString(),
            drawTime
          });
        }
      } else {
        // 如果帧率正常，重置计数
        window._fpsMonitor.lowFpsCount = 0;
      }

      // 重置计数器
      window._fpsMonitor.frames = 0;
      window._fpsMonitor.lastTime = now;
    }

    // 继续监控
    window._fpsMonitor.rafId = requestAnimationFrame(checkFPS);
  };

  // 开始监控
  window._fpsMonitor.rafId = requestAnimationFrame(checkFPS);

  // 添加诊断函数
  window.diagnoseTransformControlsPerformance = () => {
    if (!window._fpsMonitor) {
      console.log('性能监控未启动，无法提供诊断');
      return;
    }

    const recentFrameRates = window._fpsMonitor.frameRates;
    const transformActiveFrames = recentFrameRates.filter(f => f.transformActive);
    const normalFrames = recentFrameRates.filter(f => !f.transformActive);

    // 计算平均帧率
    const calcAvgFPS = frames =>
      frames.length === 0 ? 0 :
        frames.reduce((sum, f) => sum + f.fps, 0) / frames.length;

    const avgNormalFPS = calcAvgFPS(normalFrames);
    const avgTransformFPS = calcAvgFPS(transformActiveFrames);

    console.log('---- TransformControls性能诊断 ----');
    console.log(`正常状态平均帧率: ${avgNormalFPS.toFixed(1)} FPS`);
    console.log(`变换控制状态平均帧率: ${avgTransformFPS.toFixed(1)} FPS`);
    console.log(`性能下降: ${avgNormalFPS > 0 ? ((avgNormalFPS - avgTransformFPS) / avgNormalFPS * 100).toFixed(1) + '%' : '无法计算'}`);

    if (window._fpsMonitor.memoryUsage.length > 0) {
      const lastMemory = window._fpsMonitor.memoryUsage[window._fpsMonitor.memoryUsage.length - 1];
      console.log(`内存占用: ${(lastMemory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB / ${(lastMemory.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB`);
    }

    if (avgTransformFPS < 30) {
      console.warn('建议优化措施:');
      console.warn('1. 减少场景复杂度，特别是在变换操作期间');
      console.warn('2. 考虑在变换操作时临时隐藏其他复杂模型');
      console.warn('3. 检查是否有多个渲染循环或重复的动画');
      console.warn('4. 检查使用的着色器复杂度');
      console.warn('5. 查看浏览器任务管理器，检查哪个进程占用过高');

      // 检查是否可能是浏览器限制导致的问题
      if (document.hidden || document.visibilityState === 'hidden') {
        console.warn('检测到页面处于后台状态，浏览器可能限制了渲染性能');
      }

      // 提供解决方案
      console.log('\n可以在控制台运行以下命令临时提高变换操作性能:');
      console.log('window.toggleUltraPerformanceMode(true);');
    }

    return {
      avgNormalFPS,
      avgTransformFPS,
      performanceDrop: avgNormalFPS > 0 ? (avgNormalFPS - avgTransformFPS) / avgNormalFPS : 0,
      memoryUsage: window._fpsMonitor.memoryUsage,
      renderTimes: window._fpsMonitor.renderTimes
    };
  };

  // 添加GPU性能瓶颈检测
  window.checkGPUPerformance = () => {
    if (!window._fpsMonitor) {
      console.warn('性能监控未初始化');
      return null;
    }

    const diagnosisResult = {
      possibleBottlenecks: [],
      recommendations: [],
      measurements: {
        avgFPS: 0,
        renderTimes: [],
        gpuUtilization: 'unknown'
      }
    };

    // 分析帧率数据
    const fpsData = window._fpsMonitor.frameRates.map(f => f.fps);
    if (fpsData.length > 0) {
      const avgFPS = fpsData.reduce((sum, fps) => sum + fps, 0) / fpsData.length;
      diagnosisResult.measurements.avgFPS = Math.round(avgFPS);

      // 判断帧率是否存在问题
      if (avgFPS < 30) {
        diagnosisResult.possibleBottlenecks.push({
          type: 'fps',
          severity: avgFPS < 15 ? 'high' : 'medium',
          description: `平均帧率较低 (${Math.round(avgFPS)} FPS)`
        });
      }
    }

    // 分析渲染时间
    const renderTimeData = window._fpsMonitor.renderTimes;
    if (renderTimeData.length > 0) {
      const renderTimes = renderTimeData.map(item => item.drawTime);
      const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      diagnosisResult.measurements.renderTimes = renderTimes;

      // 判断渲染时间是否过长
      if (avgRenderTime > 16) { // 超过16ms（约60fps）
        diagnosisResult.possibleBottlenecks.push({
          type: 'renderTime',
          severity: avgRenderTime > 33 ? 'high' : 'medium', // 33ms约为30fps
          description: `平均渲染时间过长 (${Math.round(avgRenderTime)}ms)`
        });
      }
    }

    // 尝试检测WebGL上下文丢失或渲染问题
    if (window.TresCanvas && window.TresCanvas.renderer) {
      const renderer = window.TresCanvas.renderer;
      const gl = renderer.getContext();

      if (gl) {
        // 检查WebGL上下文状态
        if (gl.isContextLost()) {
          diagnosisResult.possibleBottlenecks.push({
            type: 'webglContext',
            severity: 'critical',
            description: 'WebGL上下文已丢失，这通常是由于GPU崩溃引起的'
          });
        }

        // 检查WebGL扩展支持
        const extensions = {
          'OES_texture_float': gl.getExtension('OES_texture_float'),
          'WEBGL_depth_texture': gl.getExtension('WEBGL_depth_texture'),
          'OES_element_index_uint': gl.getExtension('OES_element_index_uint')
        };

        const missingExtensions = Object.entries(extensions)
          .filter(([, ext]) => !ext)
          .map(([name]) => name);

        if (missingExtensions.length > 0) {
          diagnosisResult.possibleBottlenecks.push({
            type: 'webglExtensions',
            severity: 'medium',
            description: `缺少关键WebGL扩展: ${missingExtensions.join(', ')}`
          });
        }
      }
    }

    // 生成推荐
    if (diagnosisResult.possibleBottlenecks.length > 0) {
      // 根据检测到的瓶颈提供推荐
      if (diagnosisResult.possibleBottlenecks.some(b => b.type === 'fps' && b.severity === 'high')) {
        diagnosisResult.recommendations.push('启用TransformControls紧急性能模式: window.toggleUltraPerformanceMode(true)');
        diagnosisResult.recommendations.push('考虑使用模型变换代理工具代替直接操作复杂模型');
        diagnosisResult.recommendations.push('降低场景复杂度，减少可见对象数量');
      }

      if (diagnosisResult.possibleBottlenecks.some(b => b.type === 'renderTime')) {
        diagnosisResult.recommendations.push('减少场景中的光源数量和阴影光源');
        diagnosisResult.recommendations.push('禁用或简化后期处理效果');
        diagnosisResult.recommendations.push('使用更简单的材质（MeshBasicMaterial替代PBR材质）');
      }

      if (diagnosisResult.possibleBottlenecks.some(b => b.type === 'webglContext')) {
        diagnosisResult.recommendations.push('更新显卡驱动');
        diagnosisResult.recommendations.push('减少GPU内存使用，降低纹理分辨率');
        diagnosisResult.recommendations.push('考虑使用软件渲染模式或禁用硬件加速');
      }
    } else {
      diagnosisResult.recommendations.push('GPU性能正常，无需优化');
    }

    return diagnosisResult;
  };

  // 添加CPU性能监控功能
  window.checkCPUPerformance = () => {
    if (!window._fpsMonitor) {
      console.warn('性能监控未初始化');
      return null;
    }

    console.log('开始CPU性能分析...');

    // 收集CPU相关性能指标
    const cpuResults = {
      mainThreadBlocked: false,
      longTasksCount: 0,
      potentialIssues: [],
      recommendations: []
    };

    // 分析当前帧率数据来推断CPU性能
    const recentFPS = window._fpsMonitor.frameRates.slice(-10); // 最近10帧数据

    if (recentFPS.length > 0) {
      const avgFPS = recentFPS.reduce((sum, item) => sum + item.fps, 0) / recentFPS.length;
      cpuResults.avgFPS = avgFPS;

      // 分析帧率波动情况
      const fpsValues = recentFPS.map(item => item.fps);
      const minFPS = Math.min(...fpsValues);
      const maxFPS = Math.max(...fpsValues);
      const fpsVariation = maxFPS - minFPS;

      cpuResults.fpsVariation = fpsVariation;

      // 帧率波动大通常表示主线程被阻塞
      if (fpsVariation > 20 && minFPS < 20) {
        cpuResults.mainThreadBlocked = true;
        cpuResults.potentialIssues.push("检测到主线程被阻塞：帧率波动大");
      }

      // 持续低帧率且GPU使用率低，通常是CPU瓶颈
      if (avgFPS < 30) {
        cpuResults.potentialIssues.push("CPU可能成为瓶颈：持续低帧率");
      }
    }

    // 收集延迟和时间信息
    if (window.performance && typeof window.performance.now === 'function') {
      const performanceTimings = {
        totalJSTime: 0,
        layoutTime: 0,
        paintTime: 0
      };

      // 尝试使用Performance Timeline API
      if (typeof window.performance.getEntriesByType === 'function') {
        try {
          // 分析长任务
          const longTasks = window.performance.getEntriesByType('longtask') || [];
          cpuResults.longTasksCount = longTasks.length;

          if (longTasks.length > 0) {
            cpuResults.mainThreadBlocked = true;
            cpuResults.potentialIssues.push(`检测到${longTasks.length}个长任务，导致主线程阻塞`);

            // 计算平均长任务时间
            const avgTaskDuration = longTasks.reduce((sum, task) => sum + task.duration, 0) / longTasks.length;
            cpuResults.avgLongTaskDuration = avgTaskDuration;
          }

          // 分析其他性能指标
          const paintEntries = window.performance.getEntriesByType('paint') || [];
          if (paintEntries.length > 0) {
            performanceTimings.paintTime = paintEntries.reduce((sum, entry) => sum + entry.duration, 0);
          }

          // 添加性能评估
          cpuResults.performanceTimings = performanceTimings;
        } catch (e) {
          console.error('分析性能时间线失败:', e);
        }
      }
    }

    // 检查requestAnimationFrame调用情况
    if (window._renderLoopDetector) {
      const rafRate = window._renderLoopDetector.rafCount * 1000 /
        (performance.now() - window._renderLoopDetector.lastCheck);

      cpuResults.rafCallRate = rafRate;

      if (rafRate > 100) {
        cpuResults.potentialIssues.push(`检测到异常高的requestAnimationFrame调用率: ${Math.round(rafRate)}/秒`);
        cpuResults.recommendations.push('检查是否有多个重复的渲染循环');
      }
    }

    // 生成建议
    if (cpuResults.potentialIssues.length > 0) {
      // 基于发现的问题生成针对性建议
      if (cpuResults.mainThreadBlocked) {
        cpuResults.recommendations.push('减少JavaScript计算开销，特别是在渲染循环中的计算');
        cpuResults.recommendations.push('将复杂计算从主线程移到Web Worker中');
      }

      if (cpuResults.longTasksCount > 0) {
        cpuResults.recommendations.push('将长任务拆分为更小的任务，或推迟到用户交互之后执行');
        cpuResults.recommendations.push('检查是否有不必要的计算任务阻塞主线程');
      }

      // 添加降低样式计算和布局成本的建议
      cpuResults.recommendations.push('减少DOM操作，特别是那些会引起重排的操作');
      cpuResults.recommendations.push('使用更简单的CSS选择器，减少样式计算成本');

      // 添加通用优化建议
      cpuResults.recommendations.push('尝试使用requestIdleCallback延迟非关键任务');
      cpuResults.recommendations.push('检查是否有闭包或内存泄漏导致垃圾回收频繁');
    } else {
      cpuResults.recommendations.push('未检测到明显的CPU性能问题');
    }

    // 日志输出主要发现
    console.log('CPU性能分析结果:');
    if (cpuResults.potentialIssues.length > 0) {
      console.log('- 潜在问题:');
      cpuResults.potentialIssues.forEach(issue => console.log('  * ' + issue));
    } else {
      console.log('- 未发现明显CPU性能问题');
    }

    console.log('- 优化建议:');
    cpuResults.recommendations.forEach(rec => console.log('  * ' + rec));

    return cpuResults;
  };

  // 修改日志输出，增加更多使用信息
  console.log('性能诊断工具已初始化，可使用以下命令:');
  console.log('- window.diagnoseTransformControlsPerformance() - 分析变换控制器性能');
  console.log('- window.checkGPUPerformance() - 检测GPU性能瓶颈');
  console.log('- window.checkCPUPerformance() - 检测CPU性能瓶颈');
  console.log('- window.toggleUltraPerformanceMode(true) - 手动激活超级性能模式');
  console.log('- Alt+P - 快捷键切换紧急性能模式');

  return {
    toggleUltraPerformanceMode: window.toggleUltraPerformanceMode,
    checkGPUPerformance: window.checkGPUPerformance,
    checkCPUPerformance: window.checkCPUPerformance,
    diagnoseTransformControlsPerformance: window.diagnoseTransformControlsPerformance
  };
}

// 增强setupUltraPerformanceMode函数，添加更激进的优化选项
export function setupUltraPerformanceMode(TresCanvasRef, transformRef) {
  if (typeof window === 'undefined') return;

  // 初始化超级性能模式标志
  window._enableUltraPerformanceMode = false;

  // 初始化材质备份
  const materialBackups = new Map();
  const sceneBackups = {};

  // 启用超级性能模式处理函数 - 添加更激进的优化
  const enableUltraPerformanceMode = () => {
    if (!TresCanvasRef.value?.renderer) return;

    console.log('启用超级性能模式 - 大幅降低渲染质量以提高变换操作性能');

    // 保存原始设置
    if (!window._origRenderSettings) {
      const renderer = TresCanvasRef.value.renderer;
      window._origRenderSettings = {
        pixelRatio: renderer.getPixelRatio(),
        shadowMap: renderer.shadowMap ? renderer.shadowMap.enabled : false,
        outputEncoding: renderer.outputEncoding,
        toneMappingExposure: renderer.toneMappingExposure,
        antialias: renderer.antialias,
        logarithmicDepthBuffer: renderer.logarithmicDepthBuffer
      };

      // 极低质量渲染设置
      renderer.setPixelRatio(0.3); // 极低分辨率
      if (renderer.shadowMap) renderer.shadowMap.enabled = false;

      // 禁用所有后处理效果
      if (renderer.postProcessing) {
        sceneBackups.postProcessing = renderer.postProcessing.enabled;
        renderer.postProcessing.enabled = false;
      }

      // 禁用额外的渲染通道
      if (renderer.info) {
        console.log('渲染器信息:', renderer.info);
      }

      // 场景设置优化
      const scene = TresCanvasRef.value.scene;
      if (scene) {
        // 保存场景设置
        sceneBackups.fog = scene.fog;
        sceneBackups.background = scene.background;
        sceneBackups.environment = scene.environment;

        // 禁用雾和环境贴图
        scene.fog = null;
        scene.background = null;
        scene.environment = null;

        // 遍历场景中的所有对象
        scene.traverse(object => {
          if (object.isMesh && object !== transformRef.value) {
            // 保存原始状态
            const materialBackup = {
              visible: object.visible,
              material: object.material ? {
                wireframe: object.material.wireframe,
                flatShading: object.material.flatShading,
                roughness: object.material.roughness,
                metalness: object.material.metalness,
                map: object.material.map,
                normalMap: object.material.normalMap,
                aoMap: object.material.aoMap,
                emissiveMap: object.material.emissiveMap,
                displacementMap: object.material.displacementMap,
                envMap: object.material.envMap,
                side: object.material.side
              } : null
            };

            // 保存备份
            materialBackups.set(object.uuid, materialBackup);

            // 大幅简化复杂几何体
            if (object.geometry && object.geometry.attributes &&
              object.geometry.attributes.position &&
              object.geometry.attributes.position.count > 10000) {
              // 复杂模型直接隐藏以降低GPU负担
              if (object !== transformRef.value) {
                object.visible = false;
              }
            }
            // 简化中等复杂度的几何体
            else if (object.geometry && object.geometry.attributes &&
              object.geometry.attributes.position &&
              object.geometry.attributes.position.count > 1000) {
              // 对于当前操作的物体保持可见，但简化其他物体
              if (object !== transformRef.value) {
                if (object.material) {
                  // 极低质量材质设置
                  object.material.wireframe = false;
                  object.material.flatShading = true;
                  if ('metalness' in object.material) object.material.metalness = 0;
                  if ('roughness' in object.material) object.material.roughness = 1;

                  // 禁用所有贴图
                  object.material.map = null;
                  object.material.normalMap = null;
                  object.material.aoMap = null;
                  object.material.emissiveMap = null;
                  object.material.displacementMap = null;
                  object.material.envMap = null;

                  object.material.needsUpdate = true;
                }
              }
            }
          }

          // 禁用粒子系统
          if (object.isPoints || object.isSprite) {
            if (object !== transformRef.value) {
              object._wasVisible = object.visible;
              object.visible = false;
            }
          }
        });
      }

      // 添加性能监控输出
      console.log('应用了以下GPU性能优化:');
      console.log('- 渲染分辨率降低至30%');
      console.log('- 禁用阴影和后处理');
      console.log('- 隐藏复杂网格并简化材质');
      console.log('- 禁用场景雾和环境贴图');
    }
  };

  // 禁用超级性能模式处理函数
  const disableUltraPerformanceMode = () => {
    if (!window._origRenderSettings || !TresCanvasRef.value?.renderer) return;

    console.log('禁用超级性能模式 - 恢复正常渲染质量');

    // 恢复渲染器设置
    const renderer = TresCanvasRef.value.renderer;
    renderer.setPixelRatio(window._origRenderSettings.pixelRatio);
    if (renderer.shadowMap) renderer.shadowMap.enabled = window._origRenderSettings.shadowMap;

    // 恢复后处理效果
    if (renderer.postProcessing && sceneBackups.postProcessing !== undefined) {
      renderer.postProcessing.enabled = sceneBackups.postProcessing;
    }

    // 恢复场景设置
    const scene = TresCanvasRef.value.scene;
    if (scene) {
      // 恢复场景属性
      if (sceneBackups.fog !== undefined) scene.fog = sceneBackups.fog;
      if (sceneBackups.background !== undefined) scene.background = sceneBackups.background;
      if (sceneBackups.environment !== undefined) scene.environment = sceneBackups.environment;

      // 恢复所有对象的原始状态
      scene.traverse(object => {
        if (object.isMesh || object.isPoints || object.isSprite) {
          const backup = materialBackups.get(object.uuid);

          if (backup) {
            // 恢复可见性
            if (backup.visible !== undefined) {
              object.visible = backup.visible;
            }

            // 恢复材质属性
            if (object.material && backup.material) {
              // 恢复所有材质属性
              if (backup.material.wireframe !== undefined)
                object.material.wireframe = backup.material.wireframe;
              if (backup.material.flatShading !== undefined)
                object.material.flatShading = backup.material.flatShading;
              if (backup.material.roughness !== undefined && 'roughness' in object.material)
                object.material.roughness = backup.material.roughness;
              if (backup.material.metalness !== undefined && 'metalness' in object.material)
                object.material.metalness = backup.material.metalness;
              if (backup.material.side !== undefined)
                object.material.side = backup.material.side;

              // 恢复所有贴图
              if (backup.material.map !== undefined)
                object.material.map = backup.material.map;
              if (backup.material.normalMap !== undefined)
                object.material.normalMap = backup.material.normalMap;
              if (backup.material.aoMap !== undefined)
                object.material.aoMap = backup.material.aoMap;
              if (backup.material.emissiveMap !== undefined)
                object.material.emissiveMap = backup.material.emissiveMap;
              if (backup.material.displacementMap !== undefined)
                object.material.displacementMap = backup.material.displacementMap;
              if (backup.material.envMap !== undefined)
                object.material.envMap = backup.material.envMap;

              object.material.needsUpdate = true;
            }
          }

          // 恢复其他暂存属性
          if (object._wasVisible !== undefined) {
            object.visible = object._wasVisible;
            delete object._wasVisible;
          }
        }
      });
    }

    // 清除备份
    materialBackups.clear();
    Object.keys(sceneBackups).forEach(key => delete sceneBackups[key]);
    window._origRenderSettings = null;

    console.log('已恢复所有正常渲染设置');
  };

  // 增强切换函数，提供更多性能优化级别
  window.toggleUltraPerformanceMode = (enable, level = 'high') => {
    const newValue = enable !== undefined ? Boolean(enable) : !window._enableUltraPerformanceMode;
    window._enableUltraPerformanceMode = newValue;

    if (newValue) {
      enableUltraPerformanceMode();
    } else {
      disableUltraPerformanceMode();
    }

    return window._enableUltraPerformanceMode;
  };

  // 添加GPU性能检测工具
  window.detectGPUBottlenecks = () => {
    console.log('开始GPU性能分析...');

    if (!TresCanvasRef.value?.renderer) {
      console.error('找不到渲染器，无法分析GPU性能');
      return;
    }

    const renderer = TresCanvasRef.value.renderer;
    const scene = TresCanvasRef.value.scene;

    // 收集渲染统计信息
    const renderStats = renderer.info ? {
      memory: renderer.info.memory,
      render: renderer.info.render,
      programs: renderer.info.programs?.length || 0
    } : '不可用';

    console.log('当前渲染统计:', renderStats);

    // 查找潜在的性能瓶颈
    const bottlenecks = [];
    let totalTriangles = 0;
    let heavyObjectsCount = 0;
    let complexMaterialCount = 0;

    if (scene) {
      // 分析场景复杂度
      scene.traverse(object => {
        if (object.isMesh) {
          // 计算三角形数量
          const triangleCount =
            object.geometry.index ? object.geometry.index.count / 3 :
              object.geometry.attributes.position?.count / 3 || 0;

          totalTriangles += triangleCount;

          // 检查重量级网格
          if (triangleCount > 10000) {
            heavyObjectsCount++;
            bottlenecks.push(`发现高面数模型: ${object.name || object.uuid} (${Math.round(triangleCount)} 三角形)`);
          }

          // 检查复杂材质
          if (object.material) {
            let textureCount = 0;
            if (object.material.map) textureCount++;
            if (object.material.normalMap) textureCount++;
            if (object.material.roughnessMap) textureCount++;
            if (object.material.metalnessMap) textureCount++;
            if (object.material.aoMap) textureCount++;
            if (object.material.emissiveMap) textureCount++;
            if (object.material.envMap) textureCount++;

            if (textureCount >= 3) {
              complexMaterialCount++;
              bottlenecks.push(`发现复杂材质: ${object.name || object.uuid} (${textureCount} 贴图)`);
            }
          }
        }
      });
    }

    // 生成报告
    console.log('GPU性能分析报告:');
    console.log(`- 总三角形数: ${totalTriangles.toLocaleString()}`);
    console.log(`- 高面数模型数量: ${heavyObjectsCount}`);
    console.log(`- 复杂材质数量: ${complexMaterialCount}`);

    if (bottlenecks.length > 0) {
      console.log('\n潜在性能瓶颈:');
      bottlenecks.forEach((item, i) => console.log(`${i + 1}. ${item}`));

      console.log('\n建议优化措施:');
      if (totalTriangles > 1000000) {
        console.log('- 场景总三角形数过多，考虑LOD或简化模型');
      }
      if (heavyObjectsCount > 5) {
        console.log('- 减少高面数模型数量，或在变换操作时临时隐藏');
      }
      if (complexMaterialCount > 10) {
        console.log('- 减少复杂材质的使用，合并贴图或使用烘焙');
      }

      // 提供使用超级性能模式的提示
      console.log('\n可使用超级性能模式临时解决:');
      console.log('window.toggleUltraPerformanceMode(true)');
    } else {
      console.log('未发现明显性能瓶颈');
    }

    return {
      totalTriangles,
      heavyObjectsCount,
      complexMaterialCount,
      bottlenecks,
      renderStats
    };
  };

  console.log('性能诊断工具已初始化，可使用以下命令:');
  console.log('- window.toggleUltraPerformanceMode() - 切换超级性能模式');
  console.log('- window.detectGPUBottlenecks() - 检测GPU性能瓶颈');

  return {
    toggleUltraPerformanceMode: window.toggleUltraPerformanceMode,
    detectGPUBottlenecks: window.detectGPUBottlenecks
  };
} 
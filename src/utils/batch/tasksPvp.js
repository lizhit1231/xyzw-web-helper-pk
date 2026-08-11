/**
 * 批量切磋任务
 * 对选中账号逐个与指定目标ID进行PvP切磋
 */

/**
 * 创建切磋任务执行器
 * @param {Object} deps - 依赖项
 * @returns {Object} 任务函数集合
 */
export function createTasksPvp(deps) {
  const {
    selectedTokens,
    tokens,
    tokenStatus,
    isRunning,
    shouldStop,
    ensureConnection,
    releaseConnectionSlot,
    connectionQueue,
    batchSettings,
    tokenStore,
    addLog,
    message,
    currentRunningTokenId,
  } = deps;

  /**
   * 批量切磋
   * @param {number} targetId - 切磋目标ID
   * @param {number} fightNum - 每个账号切磋次数
   */
  const batchPvpFight = async (targetId, fightNum) => {
    if (selectedTokens.value.length === 0) {
      message.warning("请先选择账号");
      return [];
    }
    if (!targetId || targetId <= 0) {
      message.warning("请输入有效的对手ID");
      return [];
    }
    if (!fightNum || fightNum <= 0) {
      message.warning("请输入切磋次数");
      return [];
    }

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const results = [];

    // 逐个账号执行切磋
    for (const tokenId of selectedTokens.value) {
      if (shouldStop.value) break;

      tokenStatus.value[tokenId] = "running";
      currentRunningTokenId.value = tokenId;
      const token = tokens.value.find((t) => t.id === tokenId);

      let winCount = 0;
      let drawCount = 0;
      let lossCount = 0;
      let connected = false;

      try {
        await ensureConnection(tokenId);
        connected = true;
        if (shouldStop.value) break;

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token?.name || tokenId} 开始切磋目标 ${targetId}，共 ${fightNum} 次 ===`,
          type: "info",
        });

        for (let i = 0; i < fightNum; i++) {
          if (shouldStop.value) break;

          try {
            const result = await tokenStore.sendMessageWithPromise(
              tokenId,
              "fight_startpvp",
              { targetId: Number(targetId) },
              8000,
            );

            if (!result || !result.battleData) {
              lossCount++;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token?.name} 第${i + 1}场: 返回数据异常，计为失败`,
                type: "warning",
              });
            } else {
              if (result.battleData.result.isWin) {
                winCount++;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token?.name} 第${i + 1}场: 胜利`,
                  type: "success",
                });
              } else {
                lossCount++;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token?.name} 第${i + 1}场: 失败`,
                  type: "error",
                });
              }
            }
          } catch (error) {
            lossCount++;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token?.name} 第${i + 1}场切磋失败: ${error.message}`,
              type: "error",
            });
          }

          // 相邻两次切磋间隔 500-800 毫秒
          if (i < fightNum - 1 && !shouldStop.value) {
            const delay = 500 + Math.random() * 300;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token?.name} 切磋完成: 胜${winCount} 平${drawCount} 负${lossCount} ===`,
          type: "info",
        });
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token?.name} 切磋出错: ${error.message}`,
          type: "error",
        });
      } finally {
        if (connected) {
          releaseConnectionSlot();
        }
        tokenStatus.value[tokenId] = "completed";
      }

      results.push({
        tokenId,
        name: token?.name || "未知",
        winCount,
        drawCount,
        lossCount,
        totalFights: winCount + drawCount + lossCount,
      });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;

    if (shouldStop.value) {
      message.info("切磋已中止");
    } else {
      message.success(`批量切磋完成，共完成 ${results.length} 个账号`);
    }

    return results;
  };

  return { batchPvpFight };
}

<template>
  <div class="club-fight-pvp-container">
    <div class="status-card main-card">
      <!-- 卡片头部 -->
      <div class="card-header">
        <img
          src="/icons/1733492491706152.png"
          alt="俱乐部切磋图标"
          class="status-icon"
        />
        <div class="status-info">
          <h3>俱乐部切磋</h3>
          <p>输入俱乐部名字，与俱乐部所有成员逐一进行切磋</p>
        </div>
      </div>

      <!-- 操作区域 -->
      <div class="action-section">
        <div class="input-group">
          <n-input
            v-model:value="clubName"
            type="text"
            placeholder="俱乐部ID / 俱乐部名字 / 成员ID列表（逗号或换行分隔）"
            class="target-input"
            size="medium"
            clearable
            @keyup.enter="searchClubs"
          />
          <n-button
            type="primary"
            :disabled="loading || !clubName.trim()"
            @click="searchClubs"
            size="medium"
          >
            <template #icon>
              <n-icon>
                <Refresh />
              </n-icon>
            </template>
            搜索俱乐部
          </n-button>
        </div>

        <!-- 帮助提示 -->
        <div class="input-hint">
          <n-tooltip trigger="hover" placement="bottom">
            <template #trigger>
              <span class="hint-link">📖 如何获取俱乐部成员ID？</span>
            </template>
            <div class="hint-content">
              <p><strong>方式一：游戏内复制</strong></p>
              <p>打开游戏 → 俱乐部 → 成员列表 → 点击成员头像旁的ID数字，复制后粘贴到此处，用逗号或换行分隔</p>
              <p><strong>方式二：输入俱乐部ID</strong></p>
              <p>在游戏俱乐部信息页可查看俱乐部ID，输入后自动查询成员（服务器最多返回3名）</p>
              <p><strong>方式三：输入俱乐部名字</strong></p>
              <p>仅在当前盐场赛区榜（前100名）中搜索，若找不到请改用ID查询</p>
            </div>
          </n-tooltip>
        </div>

        <!-- 切磋次数 -->
        <div class="fight-options">
          <div class="option-item">
            <span class="option-label">每人切磋次数：</span>
            <n-select
              v-model:value="fightNum"
              :options="options"
              size="medium"
              class="fight-count-select"
              filterable
              tag
              allow-create
              :placeholder="'请选择或输入切磋次数'"
              @update:value="handleFightNumChange"
            />
          </div>

          <div class="option-actions">
            <n-button
              type="success"
              :disabled="
                fighting || !selectedClub || !memberList.length || !fightNum
              "
              @click="startClubFight"
              size="medium"
            >
              <template #icon>
                <n-icon>
                  <Trophy />
                </n-icon>
              </template>
              开始切磋
            </n-button>

            <n-button
              v-if="fighting"
              type="error"
              @click="cancelFight"
              size="medium"
            >
              中止
            </n-button>

            <n-button
              type="default"
              :disabled="!fightResultList.length"
              @click="handleExport"
              size="medium"
            >
              <template #icon>
                <n-icon>
                  <Copy />
                </n-icon>
              </template>
              导出数据
            </n-button>

            <n-button
              type="default"
              :disabled="!fightResultList.length"
              @click="handleExportImage"
              size="medium"
            >
              <template #icon>
                <n-icon>
                  <Copy />
                </n-icon>
              </template>
              导出图片
            </n-button>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-section">
        <n-spin size="large">
          <template #description>
            {{ loadingText }}
          </template>
        </n-spin>
      </div>

      <!-- 搜索结果：俱乐部列表 -->
      <div v-else-if="searchedClubList.length" class="content-section">
        <div class="info-card">
          <div class="card-title">
            <h4>匹配的俱乐部（点击选择）</h4>
            <span class="hero-count">共 {{ searchedClubList.length }} 个</span>
          </div>
          <div class="club-search-list">
            <div
              v-for="club in searchedClubList"
              :key="club.id"
              :class="[
                'club-search-item',
                {
                  selected:
                    selectedClub && selectedClub.id === club.id,
                },
              ]"
              @click="selectClub(club)"
            >
              <n-avatar
                round
                :size="36"
                :src="club.logo"
                class="club-logo"
              >
                {{ club.name?.charAt(0) || "?" }}
              </n-avatar>
              <div class="club-search-info">
                <div class="club-search-name">
                  {{ club.name }}
                  <n-tag
                    v-if="selectedClub && selectedClub.id === club.id"
                    type="success"
                    size="small"
                    >已选</n-tag
                  >
                </div>
                <div class="club-search-meta">
                  <span>ID: {{ club.id }}</span>
                  <span v-if="club.serverId"
                    >区服: {{ club.serverId - 27 }}</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 选中俱乐部的成员列表 + 切磋进度 -->
      <div v-if="selectedClub" class="content-section">
        <!-- 成员数量限制警告 -->
        <n-alert
          v-if="memberCountLimitWarning"
          type="warning"
          :bordered="false"
          show-icon
          closable
          @close="memberCountLimitWarning = ''"
        >
          <template #header>
            ⚠️ 成员数量限制
          </template>
          <div class="warning-content">
            {{ memberCountLimitWarning }}
            <n-button
              size="small"
              type="warning"
              ghost
              @click="copyMemberIdsToClipboard"
              style="margin-left: 12px"
            >
              复制当前成员ID
            </n-button>
          </div>
        </n-alert>

        <!-- 俱乐部概览 -->
        <div class="info-card">
          <div class="card-title">
            <h4>已选俱乐部</h4>
            <div class="card-title-actions">
              <span class="hero-count"
                >成员 {{ memberList.length }} 人（已排除自己）</span
              >
              <n-button
                size="small"
                type="info"
                ghost
                :disabled="!memberList.length"
                @click="copyMemberIdsToClipboard"
              >
                复制成员ID
              </n-button>
            </div>
          </div>
          <div class="selected-club-info">
            <n-avatar
              round
              :size="48"
              :src="selectedClub.logo"
              class="club-logo"
            />
            <div class="club-detail">
              <div class="club-name">{{ selectedClub.name }}</div>
              <div class="club-meta">
                <span>ID: {{ selectedClub.id }}</span>
                <span v-if="selectedClub.serverId"
                  >区服: {{ selectedClub.serverId - 27 }}</span
                >
                <span>切磋次数: {{ fightNum }} / 人</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 切磋进度 -->
        <div v-if="fighting || fightResultList.length" class="info-card">
          <div class="card-title">
            <h4>切磋进度</h4>
            <div class="progress-summary">
              <span class="summary-label">已完成：</span>
              <span class="summary-value"
                >{{ completedCount }} / {{ memberList.length }}</span
              >
              <span v-if="currentFightingName" class="current-fighting">
                正在切磋: {{ currentFightingName }}
              </span>
            </div>
          </div>
          <n-progress
            type="line"
            :percentage="progressPercentage"
            :status="fighting ? 'default' : 'success'"
          />
          <!-- 汇总统计 -->
          <div v-if="fightResultList.length" class="overall-summary">
            <div class="summary-item win-count">
              <span class="summary-label">总胜：</span>
              <span class="summary-value">{{ overallWin }}</span>
            </div>
            <div class="summary-item draw-count">
              <span class="summary-label">总平：</span>
              <span class="summary-value">{{ overallDraw }}</span>
            </div>
            <div class="summary-item loss-count">
              <span class="summary-label">总负：</span>
              <span class="summary-value">{{ overallLoss }}</span>
            </div>
            <div class="summary-item fail-count">
              <span class="summary-label">网络失败：</span>
              <span class="summary-value">{{ overallNetworkFail }}</span>
            </div>
            <div class="summary-item win-rate">
              <span class="summary-label">总胜率：</span>
              <span class="summary-value">{{ overallWinRate }}%</span>
            </div>
          </div>
        </div>

        <!-- 切磋结果表格 -->
        <div
          v-if="fightResultList.length"
          ref="exportDom"
          class="info-card result-table-card"
        >
          <div class="card-title">
            <h4>切磋结果（按胜率、我方满编率降序）</h4>
          </div>
          <n-data-table
            :columns="resultColumns"
            :data="sortedResultList"
            :bordered="false"
            size="small"
            striped
            :row-key="(row) => row.roleId"
            :flex-height="!exporting"
            :scroll-x="1500"
            :style="exporting ? {} : { height: '500px' }"
          />
        </div>

        <!-- 成员列表（未切磋时显示） -->
        <div
          v-if="!fightResultList.length && memberList.length"
          class="info-card"
        >
          <div class="card-title">
            <h4>俱乐部成员</h4>
            <span class="hero-count">共 {{ memberList.length }} 人</span>
          </div>
          <n-data-table
            :columns="memberColumns"
            :data="memberList"
            :bordered="false"
            size="small"
            striped
            :row-key="(row) => row.roleId"
            flex-height
            :scroll-x="1300"
            style="height: 400px"
          />
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="!loading && !searchedClubList.length"
        class="empty-state"
      >
        <n-empty description="请输入俱乐部名字并点击搜索按钮" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, h, nextTick } from "vue";
import { useMessage, NDataTable, NAvatar, NTag, NButton, NIcon, NProgress } from "naive-ui";
import { Trophy, Refresh, Copy } from "@vicons/ionicons5";
import { useTokenStore } from "@/stores/tokenStore";
import { getLineupType, LINEUP_RULES, legacycolor, formatWeapon } from "@/utils/HeroList";
import { getShowPet } from "@/utils/PetList";
import html2canvas from "html2canvas";

const message = useMessage();
const tokenStore = useTokenStore();

const clubName = ref("");
const loading = ref(false);
const loadingText = ref("正在搜索俱乐部...");
const fighting = ref(false);
const cancelFlag = ref(false);

// 搜索到的俱乐部列表
const searchedClubList = ref([]);
// 选中的俱乐部
const selectedClub = ref(null);
// 俱乐部成员数量限制警告
const memberCountLimitWarning = ref("");
// 搜索模式：'clubId' | 'clubName' | 'memberIds'
const searchMode = ref("");
// 俱乐部成员列表
const memberList = ref([]);
// 切磋结果列表
const fightResultList = ref([]);
// 当前正在切磋的成员名
const currentFightingName = ref("");

// 切磋次数
const fightNum = ref(1);
const options = [
  { label: "1", value: 1 },
  { label: "5", value: 5 },
  { label: "10", value: 10 },
  { label: "20", value: 20 },
  { label: "30", value: 30 },
  { label: "50", value: 50 },
];

const exportDom = ref(null);
// 是否正在导出图片（用于解除表格高度限制以截全图）
const exporting = ref(false);

// 处理切磋次数变化
const handleFightNumChange = (value) => {
  if (typeof value === "string") {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0 && num <= 50) {
      fightNum.value = num;
    } else {
      fightNum.value = 1;
    }
  } else {
    if (value > 0 && value <= 50) {
      fightNum.value = value;
    } else {
      fightNum.value = 1;
    }
  }
};

// 格式化战力
const formatPower = (power) => {
  if (!power) return "0";
  if (power >= 100000000) return (power / 100000000).toFixed(2) + "亿";
  if (power >= 10000) return (power / 10000).toFixed(2) + "万";
  return String(power);
};

// 检查 WebSocket 连接
const checkConnection = () => {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择游戏角色");
    return false;
  }
  const tokenId = tokenStore.selectedToken.id;
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== "connected") {
    message.error("WebSocket未连接，无法执行操作");
    return false;
  }
  return true;
};

// 获取自己的 roleId
const getSelfRoleId = () => {
  return tokenStore.gameData?.roleInfo?.role?.roleId;
};

// 解析成员ID列表（支持逗号、换行、空格、分号、顿号分隔）
const parseMemberIds = (input) => {
  return input
    .split(/[\s,;，；、\n\r]+/)
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s))
    .map((s) => Number(s));
};

// 检查输入是否为成员ID列表（包含分隔符或多个数字）
const isMemberIdList = (input) => {
  // 去掉所有空白字符
  const cleaned = input.trim();
  // 如果包含分隔符（逗号、换行、分号、顿号），则视为列表
  if (/[,，;；、\n\r]/.test(cleaned)) return true;
  // 如果是纯数字但长度超过8位，可能是成员ID（roleId通常8位以上）
  if (/^\d{8,}$/.test(cleaned)) return false; // 单个长数字不是列表，按俱乐部ID处理
  // 如果是多个数字用空格分隔
  if (/^\d+\s+\d+/.test(cleaned)) return true;
  return false;
};

// 搜索俱乐部
const searchClubs = async () => {
  if (!clubName.value.trim()) {
    message.warning("请输入俱乐部ID、名字或成员ID列表");
    return;
  }
  if (!checkConnection()) return;

  const tokenId = tokenStore.selectedToken.id;
  const input = clubName.value.trim();
  loading.value = true;
  searchedClubList.value = [];
  selectedClub.value = null;
  memberList.value = [];
  fightResultList.value = [];
  memberCountLimitWarning.value = "";
  searchMode.value = "";

  // 模式1：成员ID列表 → 逐个查询成员信息
  if (isMemberIdList(input)) {
    loadingText.value = "正在查询成员信息...";
    const ids = parseMemberIds(input);
    if (ids.length === 0) {
      message.warning("未解析出有效的成员ID");
      loading.value = false;
      return;
    }
    if (ids.length > 100) {
      message.warning(`一次最多查询100名成员，当前解析到${ids.length}个`);
      loading.value = false;
      return;
    }
    try {
      const list = await fetchMembersByIds(tokenId, ids);
      if (list.length === 0) {
        message.warning("未查询到任何成员信息");
        return;
      }
      // 直接设置成员列表（不关联具体俱乐部）
      selectedClub.value = {
        id: 0,
        name: `自定义成员列表（${list.length}人）`,
        logo: "",
        serverId: 0,
      };
      memberList.value = list;
      searchMode.value = "memberIds";
      message.success(`获取到 ${list.length} 名成员`);
    } catch (error) {
      message.error(`查询失败: ${error.message}`);
    } finally {
      loading.value = false;
      loadingText.value = "正在搜索俱乐部...";
    }
    return;
  }

  // 模式2：单个数字 → 按俱乐部ID查询（不限赛区）
  if (/^\d+$/.test(input)) {
    loadingText.value = "正在按俱乐部ID查询...";
    try {
      const detail = await tokenStore.sendMessageWithPromise(
        tokenId,
        "legion_getinfobyid",
        { legionId: Number(input) },
        10000,
      );
      if (!detail?.legionData) {
        message.warning(
          "未查询到该ID对应的俱乐部。若这是成员ID，请在ID后加空格或逗号再搜索",
        );
        return;
      }
      const ld = detail.legionData;
      const club = {
        id: ld.id,
        name: ld.name,
        logo: ld.logo,
        serverId: ld.serverId,
      };
      searchedClubList.value = [club];
      // 直接选中并加载成员（复用已查询到的 detail，避免重复请求）
      await selectClub(club, detail);
      message.success(`找到俱乐部：${ld.name}`);
      searchMode.value = "clubId";
      // 俱乐部ID查询服务器最多返回3名成员，始终显示警告
      const memberCount = Object.keys(detail?.legionData?.members || {}).length;
      memberCountLimitWarning.value = `通过俱乐部ID查询时，服务器最多返回 ${memberCount} 名成员。如需切磋全部成员，请从游戏内复制成员ID列表粘贴（支持逗号或换行分隔）`;
    } catch (error) {
      message.error(`查询失败: ${error.message}`);
    } finally {
      loading.value = false;
      loadingText.value = "正在搜索俱乐部...";
    }
    return;
  }

  // 模式3：文字 → 在当前盐场赛区榜中模糊搜索
  loadingText.value = "正在搜索俱乐部...";
  try {
    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      "legion_getarearank",
      {},
      10000,
    );

    if (!result?.list) {
      message.warning("未查询到俱乐部数据");
      return;
    }

    const keyword = input.toLowerCase();
    const matched = result.list.filter((club) => {
      const name = (club.name || "").toLowerCase();
      return name.includes(keyword);
    });

    if (matched.length === 0) {
      message.warning(
        `未在当前盐场赛区榜找到"${input}"。请改用俱乐部ID或成员ID列表查询`,
      );
      return;
    }

    searchedClubList.value = matched;
    searchMode.value = "clubName";
    message.success(`找到 ${matched.length} 个匹配的俱乐部`);
  } catch (error) {
    message.error(`搜索失败: ${error.message}`);
  } finally {
    loading.value = false;
    loadingText.value = "正在搜索俱乐部...";
  }
};

// 获取装备信息红数和孔数
const getEquipment = (equipment) => {
  let redCount = 0;
  let holeCount = 0;
  if (!equipment) return { redCount, holeCount };
  Object.values(equipment).forEach((equ) => {
    if (!equ?.quenches) return;
    Object.values(equ.quenches).forEach((item) => {
      holeCount++;
      if (item.colorId == 6) {
        redCount++;
      }
    });
  });
  return { redCount, holeCount };
};

// 从英雄装备中计算总红淬数
const calcRedQuenchFromHeroes = (heroes) => {
  if (!heroes) return 0;
  let total = 0;
  const arr = Array.isArray(heroes)
    ? heroes
    : Object.values(heroes);
  arr.forEach((hero) => {
    if (!hero?.equipment) return;
    const { redCount } = getEquipment(hero.equipment);
    total += redCount;
  });
  return total;
};

// 批量查询成员信息（通过 rank_getroleinfo）
const fetchMembersByIds = async (tokenId, roleIds) => {
  const selfRoleId = getSelfRoleId();
  const list = [];
  const chunkSize = 5; // 每批5个，避免请求过快

  for (let i = 0; i < roleIds.length; i += chunkSize) {
    const chunk = roleIds.slice(i, i + chunkSize);
    const promises = chunk.map(async (roleId) => {
      try {
        const res = await tokenStore.sendMessageWithPromise(
          tokenId,
          "rank_getroleinfo",
          {
            roleId: roleId,
            includeBottleTeam: false,
            isSearch: false,
            bottleType: 0,
            includeHero: true,
            includeHeroDetail: true,
            includePearl: false,
          },
          8000,
        );
        if (res?.roleInfo) {
          const ri = res.roleInfo;
          // 优先用英雄装备计算红淬数，roleInfo.red 是红鼓数不是红淬数
          const redQuench = calcRedQuenchFromHeroes(ri.heroes);
          // 判断阵容类型
          const heroesArr = ri.heroes
            ? (Array.isArray(ri.heroes)
                ? ri.heroes
                : Object.values(ri.heroes))
            : [];
          const lineupType = getLineupType(heroesArr);
          return {
            roleId: Number(ri.roleId || roleId),
            name: ri.name || "未知",
            headImg: ri.headImg || "",
            power: ri.power || 0,
            redQuench,
            legacy: ri.legacy?.color || 0,
            toyName: formatWeapon(ri.lordWeaponId) || "",
            pet: getShowPet(res),
            lineupType,
          };
        }
      } catch (e) {
        console.error(`查询成员 ${roleId} 失败:`, e);
      }
      return null;
    });

    const results = await Promise.all(promises);
    for (const r of results) {
      if (r && selfRoleId && r.roleId !== selfRoleId) {
        list.push(r);
      }
    }
  }

  // 按战力降序
  list.sort((a, b) => b.power - a.power);
  return list;
};

// 复制当前成员ID到剪贴板
const copyMemberIdsToClipboard = async () => {
  if (!memberList.value.length) {
    message.warning("没有可复制的成员");
    return;
  }
  const ids = memberList.value.map((m) => m.roleId).join(", ");
  try {
    await navigator.clipboard.writeText(ids);
    message.success(`已复制 ${memberList.value.length} 个成员ID到剪贴板`);
  } catch (e) {
    // 降级方案
    const textarea = document.createElement("textarea");
    textarea.value = ids;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    message.success(`已复制 ${memberList.value.length} 个成员ID到剪贴板`);
  }
};

// 选择俱乐部，获取成员（presetDetail 用于复用已查询到的详情，避免重复请求）
const selectClub = async (club, presetDetail = null) => {
  if (fighting.value) {
    message.warning("切磋进行中，请先中止");
    return;
  }
  if (!checkConnection()) return;

  const tokenId = tokenStore.selectedToken.id;
  selectedClub.value = club;
  memberList.value = [];
  fightResultList.value = [];

  loading.value = true;
  loadingText.value = "正在获取俱乐部成员...";

  try {
    const detail =
      presetDetail ||
      (await tokenStore.sendMessageWithPromise(
        tokenId,
        "legion_getinfobyid",
        { legionId: club.id },
        10000,
      ));

    const members = detail?.legionData?.members || {};
    const selfRoleId = getSelfRoleId();
    const list = [];
    for (const [roleId, m] of Object.entries(members)) {
      // 排除自己
      if (selfRoleId && Number(roleId) === Number(selfRoleId)) continue;
      list.push({
        roleId: Number(roleId),
        name: m.name || m.custom?.name || "未知",
        headImg: m.headImg || m.custom?.headImg || "",
        power: m.power || m.custom?.s_power || 0,
        redQuench: m.custom?.red_quench_cnt || 0,
        legacy: 0,
        toyName: "",
        pet: null,
        lineupType: "-",
      });
    }
    // 按战力降序
    list.sort((a, b) => b.power - a.power);
    memberList.value = list;
    message.success(`获取到 ${list.length} 名成员（已排除自己）`);
  } catch (error) {
    message.error(`获取成员失败: ${error.message}`);
  } finally {
    loading.value = false;
    loadingText.value = "正在搜索俱乐部...";
  }
};

// 进度
const completedCount = computed(() => fightResultList.value.length);
const progressPercentage = computed(() => {
  if (!memberList.value.length) return 0;
  return Math.round((completedCount.value / memberList.value.length) * 100);
});

// 汇总
const overallWin = computed(() =>
  fightResultList.value.reduce((s, r) => s + r.winCount, 0),
);
const overallDraw = computed(() =>
  fightResultList.value.reduce((s, r) => s + r.drawCount, 0),
);
const overallLoss = computed(() =>
  fightResultList.value.reduce((s, r) => s + r.lossCount, 0),
);
const overallNetworkFail = computed(() =>
  fightResultList.value.reduce((s, r) => s + (r.networkFailCount || 0), 0),
);
const overallWinRate = computed(() => {
  const total = overallWin.value + overallDraw.value + overallLoss.value;
  if (total === 0) return "0.00";
  return ((overallWin.value / total) * 100).toFixed(2);
});

// 结果排序（按胜率降序，胜率相同按我方满编率降序）
const sortedResultList = computed(() => {
  const validTotal = (r) => r.winCount + r.drawCount + r.lossCount;
  const winRate = (r) =>
    validTotal(r) === 0 ? 0 : r.winCount / validTotal(r);
  const ourFullTeamRate = (r) =>
    validTotal(r) === 0 ? 0 : (r.ourFullTeamCount || 0) / validTotal(r);

  return [...fightResultList.value].sort((a, b) => {
    const rateDiff = winRate(b) - winRate(a);
    if (rateDiff !== 0) return rateDiff;
    return ourFullTeamRate(b) - ourFullTeamRate(a);
  });
});

// 珍卡标签
const renderLegacy = (row) => {
  const cfg = legacycolor[row.legacy];
  if (!row.legacy || !cfg) {
    return h("span", { class: "legacy-none" }, "—");
  }
  return h(
    NTag,
    {
      size: "small",
      bordered: false,
      color: { color: cfg.value, textColor: "#fff" },
    },
    { default: () => cfg.name },
  );
};

// 玩具名称
const renderToy = (row) => {
  if (!row.toyName) {
    return h("span", { class: "toy-none" }, "—");
  }
  return h("span", { class: "toy-name" }, row.toyName);
};

// 宠物：图标 + 名称/等级
const renderPet = (row) => {
  const pet = row.pet;
  if (!pet) return h("span", { class: "pet-none" }, "—");

  const children = [];
  if (pet.icon) {
    children.push(
      h("img", {
        class: "pet-icon",
        src: pet.icon,
        alt: pet.name,
        loading: "lazy",
        onError: (e) => {
          e.target.style.display = "none";
        },
      }),
    );
  }
  children.push(
    h("div", { class: "pet-text" }, [
      h("span", { class: "pet-name", style: { color: pet.color } }, pet.name),
      pet.level ? h("span", { class: "pet-level" }, `Lv.${pet.level}`) : null,
    ]),
  );

  return h("div", { class: "pet-cell" }, children);
};

const memberInfoColumns = [
  { title: "珍卡", key: "legacy", width: 80, align: "center", render: renderLegacy },
  { title: "玩具", key: "toyName", width: 100, align: "center", render: renderToy },
  { title: "宠物", key: "pet", width: 95, align: "center", render: renderPet },
];

// 成员表格列
const memberColumns = computed(() => [
  {
    title: "序号",
    key: "index",
    width: 60,
    align: "center",
    render: (_, index) => index + 1,
  },
  {
    title: "头像",
    key: "headImg",
    width: 60,
    align: "center",
    render: (row) =>
      row.headImg
        ? h("img", {
            src: row.headImg,
            style: {
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              objectFit: "cover",
            },
            alt: row.name,
          })
        : h(
            "div",
            {
              style: {
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#f0f0f0",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                color: "#999",
              },
            },
            row.name?.charAt(0) || "?",
          ),
  },
  { title: "成员", key: "name", minWidth: 100, align: "left" },
  {
    title: "ID",
    key: "roleId",
    width: 120,
    align: "center",
  },
  {
    title: "战力",
    key: "power",
    width: 100,
    align: "center",
    render: (row) => formatPower(row.power),
  },
  {
    title: "红淬",
    key: "redQuench",
    width: 80,
    align: "center",
    render: (row) =>
      h(
        "span",
        { style: { color: "#ff4d4f" } },
        `${row.redQuench}红`,
      ),
  },
  ...memberInfoColumns,
  {
    title: "阵容",
    key: "lineupType",
    width: 90,
    align: "center",
    render: (row) => {
      if (!row.lineupType || row.lineupType === "-") {
        return h("span", { style: { color: "#bfbfbf", fontSize: "12px" } }, "-");
      }
      const rule = LINEUP_RULES.find((r) => r.name === row.lineupType);
      const colorProps = rule?.colorProps || { color: "#8c8c8c", textColor: "#fff" };
      return h(
        "span",
        {
          style: {
            padding: "2px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            backgroundColor: colorProps.color,
            color: colorProps.textColor,
          },
        },
        row.lineupType,
      );
    },
  },
]);

// 结果表格列
const resultColumns = computed(() => [
  {
    title: "排名",
    key: "rank",
    width: 60,
    align: "center",
    render: (_, index) => index + 1,
  },
  {
    title: "头像",
    key: "headImg",
    width: 56,
    align: "center",
    render: (row) =>
      row.headImg
        ? h("img", {
            src: row.headImg,
            style: {
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              objectFit: "cover",
            },
            alt: row.name,
          })
        : h(
            "div",
            {
              style: {
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#f0f0f0",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                color: "#999",
              },
            },
            row.name?.charAt(0) || "?",
          ),
  },
  { title: "成员", key: "name", minWidth: 100, align: "left" },
  {
    title: "ID",
    key: "roleId",
    width: 110,
    align: "center",
  },
  {
    title: "战力",
    key: "power",
    width: 90,
    align: "center",
    render: (row) => formatPower(row.power),
  },
  {
    title: "红淬",
    key: "redQuench",
    width: 80,
    align: "center",
    render: (row) =>
      h(
        "span",
        { style: { color: "#ff4d4f" } },
        `${row.redQuench}红`,
      ),
  },
  ...memberInfoColumns,
  {
    title: "阵容",
    key: "lineupType",
    width: 90,
    align: "center",
    render: (row) => {
      if (!row.lineupType || row.lineupType === "-") {
        return h("span", { style: { color: "#bfbfbf", fontSize: "12px" } }, "-");
      }
      const rule = LINEUP_RULES.find((r) => r.name === row.lineupType);
      const colorProps = rule?.colorProps || { color: "#8c8c8c", textColor: "#fff" };
      return h(
        "span",
        {
          style: {
            padding: "2px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            backgroundColor: colorProps.color,
            color: colorProps.textColor,
          },
        },
        row.lineupType,
      );
    },
  },
  {
    title: "总场次",
    key: "total",
    width: 80,
    align: "center",
    render: (row) => row.winCount + row.drawCount + row.lossCount,
  },
  {
    title: "胜",
    key: "winCount",
    width: 64,
    align: "center",
    render: (row) =>
      h(
        "span",
        { style: { color: "#18a058", fontWeight: 600 } },
        row.winCount,
      ),
  },
  {
    title: "平",
    key: "drawCount",
    width: 64,
    align: "center",
    render: (row) =>
      h(
        "span",
        { style: { color: "#f0a020", fontWeight: 600 } },
        row.drawCount,
      ),
  },
  {
    title: "负",
    key: "lossCount",
    width: 64,
    align: "center",
    render: (row) =>
      h(
        "span",
        { style: { color: "#d03050", fontWeight: 600 } },
        row.lossCount,
      ),
  },
  {
    title: "网络失败",
    key: "networkFailCount",
    width: 80,
    align: "center",
    render: (row) =>
      h(
        "span",
        { style: { color: "#8c8c8c", fontWeight: 600 } },
        row.networkFailCount || 0,
      ),
  },
  {
    title: "胜率",
    key: "winRate",
    width: 80,
    align: "center",
    render: (row) => {
      const total = row.winCount + row.drawCount + row.lossCount;
      const rate = total === 0 ? "0.00" : ((row.winCount / total) * 100).toFixed(2);
      return h(
        "span",
        { style: { color: "#18a058", fontWeight: 600 } },
        `${rate}%`,
      );
    },
  },
  {
    title: "我方满编率",
    key: "ourFullTeamRate",
    width: 90,
    align: "center",
    render: (row) => {
      const total = row.winCount + row.drawCount + row.lossCount;
      const rate = total === 0 ? "0.0" : ((row.ourFullTeamCount / total) * 100).toFixed(1);
      return h(
        "span",
        { style: { color: "#2080f0", fontWeight: 600 } },
        `${rate}%`,
      );
    },
  },
  {
    title: "敌方满编率",
    key: "enemyFullTeamRate",
    width: 90,
    align: "center",
    render: (row) => {
      const total = row.winCount + row.drawCount + row.lossCount;
      const rate = total === 0 ? "0.0" : ((row.enemyFullTeamCount / total) * 100).toFixed(1);
      return h(
        "span",
        { style: { color: "#d03050", fontWeight: 600 } },
        `${rate}%`,
      );
    },
  },
]);

// 开始俱乐部切磋
const startClubFight = async () => {
  if (!checkConnection()) return;
  if (!memberList.value.length) {
    message.warning("当前俱乐部没有可切磋的成员");
    return;
  }

  const tokenId = tokenStore.selectedToken.id;
  fighting.value = true;
  cancelFlag.value = false;
  fightResultList.value = [];

  try {
    for (const member of memberList.value) {
      if (cancelFlag.value) {
        message.info("切磋已中止");
        break;
      }
      currentFightingName.value = `${member.name}(ID:${member.roleId})`;
      const result = await fightOneMember(tokenId, member);
      fightResultList.value.push(result);
    }
    if (!cancelFlag.value) {
      message.success(
        `切磋完成，共完成 ${fightResultList.value.length} 名成员`,
      );
    }
  } catch (error) {
    message.error(`切磋过程出错: ${error.message}`);
  } finally {
    fighting.value = false;
    currentFightingName.value = "";
  }
};

// 执行单次切磋，失败时自动重试（最多3次）
const doFightOnce = async (tokenId, member) => {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await tokenStore.sendMessageWithPromise(
        tokenId,
        "fight_startpvp",
        { targetId: member.roleId },
        8000,
      );

      if (!result || !result.battleData) {
        // 服务器返回空数据，重试
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
        return {
          success: false,
          isWin: false,
          leftCount: 0,
          rightCount: 0,
          leftAlive: 0,
          rightAlive: 0,
        };
      }

      let leftCount = 0;
      let leftAlive = 0;
      result.battleData.result.sponsor.teamInfo.forEach((item) => {
        if (item.hp == 0) leftCount++;
        else leftAlive++;
      });

      let rightCount = 0;
      let rightAlive = 0;
      result.battleData.result.accept.teamInfo.forEach((item) => {
        if (item.hp == 0) rightCount++;
        else rightAlive++;
      });

      return {
        success: true,
        isWin: result.battleData.result.isWin,
        leftCount,
        rightCount,
        leftAlive,
        rightAlive,
      };
    } catch (error) {
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      // 重试耗尽，最后一次尝试用默认失败结果返回
      console.error(
        `切磋 ${member.name} 失败（已重试${maxRetries}次）:`,
        error,
      );
      return {
        success: false,
        isWin: false,
        leftCount: 0,
        rightCount: 0,
        leftAlive: 0,
        rightAlive: 0,
      };
    }
  }
  return {
    success: false,
    isWin: false,
    leftCount: 0,
    rightCount: 0,
    leftAlive: 0,
    rightAlive: 0,
  };
};

// 与单个成员切磋 fightNum 次
const fightOneMember = async (tokenId, member) => {
  let winCount = 0;
  let drawCount = 0;
  let lossCount = 0;
  let networkFailCount = 0;
  let ourFullTeamCount = 0;
  let enemyFullTeamCount = 0;

  for (let i = 0; i < fightNum.value; i++) {
    if (cancelFlag.value) break;

    const result = await doFightOnce(tokenId, member);

    if (result.success) {
      if (result.leftCount === 0) ourFullTeamCount++;
      if (result.rightCount === 0) enemyFullTeamCount++;
      // 平局：双方场上均有未阵亡的咸将
      if (result.leftAlive > 0 && result.rightAlive > 0) {
        drawCount++;
      } else if (result.isWin) {
        winCount++;
      } else {
        lossCount++;
      }
    } else {
      // 网络异常/重试耗尽不计入负场，单独统计
      networkFailCount++;
    }

    // 相邻两次切磋固定间隔 2 秒，避免请求过于频繁被系统检测
    if (i < fightNum.value - 1 && !cancelFlag.value) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return {
    roleId: member.roleId,
    name: member.name,
    headImg: member.headImg,
    power: member.power,
    redQuench: member.redQuench || 0,
    legacy: member.legacy || 0,
    toyName: member.toyName || "",
    pet: member.pet || null,
    lineupType: member.lineupType || "-",
    winCount,
    drawCount,
    lossCount,
    networkFailCount,
    ourFullTeamCount,
    enemyFullTeamCount,
  };
};

// 中止
const cancelFight = () => {
  cancelFlag.value = true;
  message.info("正在中止切磋...");
};

// 导出文本
const handleExport = () => {
  if (!fightResultList.value.length) {
    message.warning("没有可导出的数据");
    return;
  }
  const clubNameStr = selectedClub.value?.name || "俱乐部";
  const lines = [
    `俱乐部切磋结果 - ${clubNameStr}`,
    `每人切磋次数: ${fightNum.value}`,
    `完成人数: ${fightResultList.value.length}`,
    `总胜: ${overallWin.value}  总平: ${overallDraw.value}  总负: ${overallLoss.value}  网络失败: ${overallNetworkFail.value}  总胜率: ${overallWinRate.value}%`,
    "─".repeat(60),
    "排名\t成员\tID\t战力\t红淬\t珍卡\t玩具\t宠物\t阵容\t胜\t平\t负\t网络失败\t胜率%\t我方满编率%\t敌方满编率%",
  ];
  sortedResultList.value.forEach((r, idx) => {
    const total = r.winCount + r.drawCount + r.lossCount;
    const rate = total === 0 ? "0.00" : ((r.winCount / total) * 100).toFixed(2);
    lines.push(
      `${idx + 1}\t${r.name}\t${r.roleId}\t${formatPower(r.power)}\t${r.redQuench}红\t${legacycolor[r.legacy]?.name || "-"}\t${r.toyName || "-"}\t${r.pet ? `${r.pet.name}${r.pet.level ? ` Lv.${r.pet.level}` : ""}` : "-"}\t${r.lineupType}\t${r.winCount}\t${r.drawCount}\t${r.lossCount}\t${r.networkFailCount || 0}\t${rate}\t${total === 0 ? "0.0" : ((r.ourFullTeamCount / total) * 100).toFixed(1)}\t${total === 0 ? "0.0" : ((r.enemyFullTeamCount / total) * 100).toFixed(1)}`,
    );
  });
  const text = lines.join("\n");

  try {
    const blob = new Blob(["\ufeff" + text], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `俱乐部切磋结果_${clubNameStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success("导出成功");
  } catch (error) {
    message.error(`导出失败: ${error.message}`);
  }
};

// 导出图片
const handleExportImage = async () => {
  if (!fightResultList.value.length) {
    message.warning("没有可导出的数据");
    return;
  }
  if (!exportDom.value) {
    message.error("无法获取结果区域");
    return;
  }
  const clubNameStr = selectedClub.value?.name || "俱乐部";
  // 解除表格高度限制，让所有行渲染出来以截取长图
  exporting.value = true;
  try {
    // 等待 DOM 更新完成
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const canvas = await html2canvas(exportDom.value, {
      backgroundColor: "#f5f7fa",
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: exportDom.value.scrollWidth,
      windowHeight: exportDom.value.scrollHeight,
    });
    const link = document.createElement("a");
    link.download = `俱乐部切磋结果_${clubNameStr}.png`;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success("图片导出成功");
  } catch (error) {
    message.error(`图片导出失败: ${error.message}`);
  } finally {
    exporting.value = false;
  }
};
</script>

<style scoped lang="scss">
.club-fight-pvp-container {
  width: 100%;
}

.main-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-xl);
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.main-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
}

.card-header .status-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 12px;
  margin-right: 16px;
}

.card-header .status-info {
  flex: 1;
}

.card-header .status-info h3 {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-header .status-info p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.action-section {
  margin-bottom: 24px;
}

.action-section .input-group {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.action-section .input-group .target-input {
  flex: 1;
}

.input-hint {
  margin: -4px 0 12px 0;

  .hint-link {
    font-size: 12px;
    color: var(--primary-color);
    cursor: pointer;
    text-decoration: underline;

    &:hover {
      color: var(--primary-color-hover);
    }
  }

  .hint-content {
    font-size: 13px;
    line-height: 1.6;
    max-width: 360px;

    p {
      margin: 4px 0;
    }
  }
}

.action-section .fight-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.action-section .fight-options .option-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-section .fight-options .option-item .option-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.action-section .fight-options .option-item .fight-count-select {
  width: 140px;
}

.action-section .fight-options .option-actions {
  display: flex;
  gap: 12px;
}

.loading-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  background: var(--bg-secondary);
  border-radius: var(--border-radius-medium);
}

.empty-state {
  padding: 40px 20px;
  background: var(--bg-secondary);
  border-radius: var(--border-radius-medium);
  text-align: center;
}

.content-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-large);
  padding: 12px;
  transition: all 0.3s ease;
}

.info-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.info-card .card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-light);
}

.info-card .card-title h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.info-card .card-title .hero-count {
  font-size: 13px;
  color: var(--text-secondary);
}

.info-card .card-title .card-title-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.warning-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-card .card-title .progress-summary .summary-value {
  font-weight: 600;
  color: var(--text-primary);
}

.info-card .card-title .progress-summary .current-fighting {
  color: var(--primary-color);
  font-style: italic;
}

/* 俱乐部搜索列表 */
.club-search-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
  padding: 4px;
}

.club-search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-medium);
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.club-search-item:hover {
  border-color: var(--primary-color-light);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.club-search-item.selected {
  border-color: var(--success-color);
  background: rgba(24, 160, 88, 0.06);
}

.club-search-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.club-search-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.club-search-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* 选中俱乐部信息 */
.selected-club-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 4px;
}

.selected-club-info .club-logo {
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 2px solid var(--primary-color-light);
}

.selected-club-info .club-detail {
  flex: 1;
}

.selected-club-info .club-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.selected-club-info .club-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  flex-wrap: wrap;
}

/* 汇总统计 */
.overall-summary {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--bg-primary);
  border-radius: var(--border-radius-medium);
  border: 1px solid var(--border-light);
}

.overall-summary .summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.overall-summary .summary-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.overall-summary .summary-value {
  font-size: 18px;
  font-weight: 600;
}

.overall-summary .win-count .summary-value {
  color: var(--success-color);
}

.overall-summary .draw-count .summary-value {
  color: var(--warning-color);
}

.overall-summary .loss-count .summary-value {
  color: var(--error-color);
}

.overall-summary .fail-count .summary-value {
  color: var(--text-secondary);
}

.overall-summary .win-rate .summary-value {
  color: var(--success-color);
}

.result-table-card {
  padding: 12px;
}

/* 珍卡 / 玩具 / 宠物 */
:deep(.legacy-none),
:deep(.toy-none),
:deep(.pet-none) {
  color: #d9d9d9;
  font-size: 12px;
}

:deep(.toy-name) {
  color: #c084fc;
  font-size: 12px;
  font-weight: 600;
}

:deep(.pet-cell) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

:deep(.pet-icon) {
  width: 26px;
  height: 26px;
  border-radius: 5px;
  object-fit: contain;
  background-color: rgba(64, 169, 255, 0.07);
  flex-shrink: 0;
}

:deep(.pet-text) {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.25;
  white-space: nowrap;
}

:deep(.pet-name) {
  font-size: 12px;
  font-weight: 600;
}

:deep(.pet-level) {
  font-size: 11px;
  color: #8c8c8c;
}

/* 响应式 */
@media (max-width: 1024px) {
  .action-section .fight-options {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 768px) {
  .main-card {
    padding: 12px;
  }

  .card-header {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .action-section .input-group {
    flex-direction: column;
  }

  .club-search-list {
    grid-template-columns: 1fr;
  }

  .overall-summary {
    flex-direction: column;
    gap: 8px;
  }
}
</style>

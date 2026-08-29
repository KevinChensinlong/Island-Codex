/**
 * dashboard.js
 * 島嶼圖鑑 Island Codex - 數據儀表板與成就系統邏輯
 */

let allAchievements = [];
let allPortsData = [];
let allStationsData = [];

const BASE_DATA_PATH = window.location.pathname.includes('/html/') ? '../data/' : './data/';

let smoothProgressInterval = null;
let currentProgressVal = 0; // 紀錄當前進度數值

// ==========================================
// 進度條控制模組
// ==========================================

// 輔助函式：更新進度條狀態
function updateProgress(percent, text = "資料載入中...") {
    const container = document.getElementById('loading-progress-container');
    const fill = document.getElementById('progress-bar-fill');
    const textElem = document.getElementById('progress-text');
    const dashboardContent = document.getElementById('achievement-list') || document.querySelector('.dashboard-container');

    if (container && fill) {
        container.style.display = 'block';
        if (dashboardContent) dashboardContent.style.opacity = '0.3';

        currentProgressVal = Math.min(100, Math.max(0, Math.round(percent)));
        fill.style.width = `${currentProgressVal}%`;
        if (textElem) textElem.textContent = `${text} (${currentProgressVal}%)`;
    }
}

// 輔助函式：平滑衝到 100% 後隱藏進度條
function finishProgress(statusText = "同步完成！", durationMs = 250) {
    stopTrickleProgress();

    const startVal = currentProgressVal;
    const startTime = performance.now();

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const current = startVal + (100 - startVal) * progress;

        updateProgress(current, statusText);

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            hideProgress();
        }
    }

    requestAnimationFrame(step);
}

// 輔助函式：隱藏進度條
function hideProgress() {
    const container = document.getElementById('loading-progress-container');
    const dashboardContent = document.getElementById('achievement-list') || document.querySelector('.dashboard-container');

    if (container) {
        setTimeout(() => {
            container.style.display = 'none';
            if (dashboardContent) dashboardContent.style.opacity = '1';
        }, 200);
    }
}

// 輔助函式：開啟平滑微量爬升進度條
function startTrickleProgress(startPercent = 40, statusText = "連線雲端資料中...") {
    if (smoothProgressInterval) clearInterval(smoothProgressInterval);

    let current = Math.max(currentProgressVal, startPercent);

    smoothProgressInterval = setInterval(() => {
        if (current < 85) {
            current += Math.random() * 3 + 1;
        } else if (current < 99) {
            const remaining = 99 - current;
            current += remaining * 0.08;
        }

        if (current >= 99) {
            current = 99;
        }

        updateProgress(current, statusText);
    }, 150);
}

// 輔助函式：停止爬升進度條
function stopTrickleProgress() {
    if (smoothProgressInterval) {
        clearInterval(smoothProgressInterval);
        smoothProgressInterval = null;
    }
}

// ==========================================
// 初始化與資料載入邏輯
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
  stopTrickleProgress();
  updateProgress(15, "初始化頁面元件...");

  // 1. 初始化 DOM 元件 (Header/Footer)
  initHeaderAndFooter();

  updateProgress(30, "讀取港口與臺鐵車站圖鑑清單...");
  // 2. 載入港口與車站 JSON 資料（動態取得目前所有車站與港口總數）
  await loadSpotsData();

  updateProgress(50, "讀取成就圖鑑資料...");
  // 3. 載入成就設定檔
  await loadAchievementsData();

  updateProgress(65, "驗證打卡紀錄...");
  // 4. 初始化打卡資料與進行成就判定
  await initDashboardData();
});

/**
 * 初始化 Header 與 Footer
 */
function initHeaderAndFooter() {
  if (typeof renderHeader === 'function') {
    renderHeader('header-container', 'dashboard');
  }
  if (typeof renderFooter === 'function') {
    renderFooter('footer-container');
  }
}

/**
 * 動態載入港口 (ports.json) 與車站 (TR_station.json) 資料
 */
async function loadSpotsData() {
  try {
    const [portsRes, stationsRes] = await Promise.all([
      fetch(`${BASE_DATA_PATH}ports.json?v=${Date.now()}`),
      fetch(`${BASE_DATA_PATH}TR_station.json?v=${Date.now()}`)
    ]);

    allPortsData = portsRes.ok ? await portsRes.json() : [];
    allStationsData = stationsRes.ok ? await stationsRes.json() : [];

    window.allPortsData = allPortsData;
    window.allStationsData = allStationsData;
  } catch (err) {
    console.error("無法載入景點/車站資料：", err);
    allPortsData = [];
    allStationsData = [];
  }
}

/**
 * 載入 achievements.json
 */
async function loadAchievementsData() {
  const container = document.getElementById('achievement-list');
  try {
    const res = await fetch(`${BASE_DATA_PATH}achievements.json?v=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP 錯誤: ${res.status}`);
    allAchievements = await res.json();
  } catch (err) {
    console.error('載入成就資料失敗：', err);
    if (container) {
      container.innerHTML = `
        <div class="port-notes" style="text-align: center; color: var(--text-secondary); grid-column: 1 / -1;">
          無法載入成就資料，請確認 ${BASE_DATA_PATH}achievements.json 是否存在。
        </div>
      `;
    }
  }
}

/**
 * 取得當前使用者打卡紀錄 (整合 LocalStorage 快取與全域變數)
 */
function getTargetUserCheckins() {
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const cacheKey = currentUser && currentUser.account ? `checkins_${currentUser.account}` : 'checkins_guest';

  // 1. 優先從記憶體全域變數取得
  let checkins = (window.AppState && window.AppState.checkins) || window.currentUserCheckins || [];

  // 2. 若全域變數為空，從正確的 LocalStorage Cache Key 讀取
  if (!Array.isArray(checkins) || checkins.length === 0) {
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        checkins = JSON.parse(cachedData);
      }
    } catch (e) {
      console.warn("解析打卡快取失敗：", e);
    }
  }

  // 同步至記憶體
  window.currentUserCheckins = checkins;
  window.AppState = window.AppState || {};
  window.AppState.checkins = checkins;

  return checkins;
}

/**
 * 遠端同步資料並初始化儀表板
 */
async function initDashboardData() {
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const cacheKey = currentUser && currentUser.account ? `checkins_${currentUser.account}` : 'checkins_guest';

  let userCheckins = getTargetUserCheckins();
  let hasCache = userCheckins.length > 0;

  // 先使用快取資料計算與渲染一次成就與分類打卡進度
  refreshDashboard();

  // 快取處理進度條表現
  if (hasCache) {
    finishProgress("載入完成！", 180);
  } else {
    if (currentUser && currentUser.account) {
      startTrickleProgress(75, `同步 ${currentUser.name || currentUser.account} 的打卡紀錄...`);
    } else {
      updateProgress(85, "計算打卡與成就統計中...");
    }
  }

  // 若已登入且有 API 網址，向後端同步最新的打卡紀錄
  if (currentUser && currentUser.account && typeof CONFIG !== 'undefined' && CONFIG.apiUrl) {
    try {
      const requestUrl = `${CONFIG.apiUrl}?action=getUserData&account=${encodeURIComponent(currentUser.account)}&t=${Date.now()}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(requestUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        userCheckins = data.records;
        window.currentUserCheckins = userCheckins;
        window.AppState.checkins = userCheckins;
        localStorage.setItem(cacheKey, JSON.stringify(userCheckins));

        // 雲端資料回來後刷新統計
        refreshDashboard();
      }
    } catch (err) {
      console.warn("成就頁面同步雲端打卡資料失敗，改用本地快取：", err);
    } finally {
      if (!hasCache) {
        finishProgress("同步完成！", 300);
      }
    }
  } else if (!hasCache) {
    finishProgress("載入完成！", 250);
  }
}

/**
 * 輔助函式：標準化 ID (忽略大小寫與常規前綴)
 */
function normalizeId(id) {
  if (!id) return '';
  return String(id).toLowerCase().replace(/^(port_|tr_station_|station_)/, '');
}

/**
 * 計算與刷新成就頁面與頂部數據
 */
function refreshDashboard() {
  const checkins = getTargetUserCheckins();
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  // 1. 更新頂部港口與台鐵打卡數據 (動態調用當前資料總量)
  updateTypeProgress(allPortsData, allStationsData, checkins);

  if (!allAchievements || allAchievements.length === 0) return;

  // 建立已造訪的 ID 集合 (標準化與原始值皆保留)
  const visitedSet = new Set();
  const normalizedVisitedSet = new Set();

  checkins.forEach(c => {
    const rawSpotId = String(c.spotId || c.id || '');
    const matchUser = !currentUser || !c.userId || String(c.userId || c.account) === String(currentUser.account);
    
    if (rawSpotId && matchUser) {
      visitedSet.add(rawSpotId);
      normalizedVisitedSet.add(normalizeId(rawSpotId));
    }
  });

  // 判定每個成就的解鎖狀態
  allAchievements.forEach(ach => {
    const cond = ach.condition;
    let unlocked = false;

    if (!cond) {
      ach.isUnlocked = false;
      return;
    }

    switch (cond.type) {
      case 'total_count':
        // 總打卡數達標
        unlocked = visitedSet.size >= cond.target;
        break;

      case 'specific_list':
        // 指定點位清單全部完成
        if (Array.isArray(cond.targetIds) && cond.targetIds.length > 0) {
          unlocked = cond.targetIds.every(targetId => {
            const strTarget = String(targetId);
            return visitedSet.has(strTarget) || normalizedVisitedSet.has(normalizeId(strTarget));
          });
        }
        break;

      case 'target_type_count':
        // 特定類型（車站 station 或 港口 port）踩點數達標
        if (cond.targetType) {
          let count = 0;
          visitedSet.forEach(id => {
            const strId = String(id).toLowerCase();
            if (cond.targetType === 'station' && (strId.includes('station') || strId.startsWith('tr_'))) {
              count++;
            } else if (cond.targetType === 'port' && (!strId.startsWith('tr_') && !strId.includes('station'))) {
              count++;
            }
          });
          unlocked = count >= cond.target;
        }
        break;

      default:
        unlocked = false;
        break;
    }

    ach.isUnlocked = unlocked;
  });

  // 更新成就數據與卡片列表
  updateOverallProgress();
  renderAchievementCards();
}

/**
 * 計算港口與車站的動態打卡統計並寫入 HTML 元素
 */
function updateTypeProgress(ports, stations, checkins) {
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  // 取得使用者打卡過的所有點位 ID 集合
  const visitedSet = new Set();
  const normalizedVisitedSet = new Set();

  checkins.forEach(c => {
    const rawSpotId = String(c.spotId || c.id || '');
    const matchUser = !currentUser || !c.userId || String(c.userId || c.account) === String(currentUser.account);

    if (rawSpotId && matchUser) {
      visitedSet.add(rawSpotId);
      normalizedVisitedSet.add(normalizeId(rawSpotId));
    }
  });

  // 1. 計算港口打卡數與總數
  const totalPorts = ports.length;
  let visitedPortsCount = 0;
  ports.forEach(p => {
    const pId = String(p.id || '');
    if (visitedSet.has(pId) || normalizedVisitedSet.has(normalizeId(pId))) {
      visitedPortsCount++;
    }
  });
  const portPercent = totalPorts > 0 ? ((visitedPortsCount / totalPorts) * 100).toFixed(1) : "0.0";

  // 2. 計算臺鐵車站打卡數與總數（依據 TR_station.json 現有資料量）
  const totalStations = stations.length;
  let visitedStationsCount = 0;
  stations.forEach(s => {
    const sId = String(s.id || '');
    if (visitedSet.has(sId) || normalizedVisitedSet.has(normalizeId(sId))) {
      visitedStationsCount++;
    }
  });
  const stationPercent = totalStations > 0 ? ((visitedStationsCount / totalStations) * 100).toFixed(1) : "0.0";

  // 3. 渲染至畫面 HTML 元素
  const portTextEl = document.getElementById('port-progress-text');
  const portFillEl = document.getElementById('port-progress-fill');
  const stationTextEl = document.getElementById('station-progress-text');
  const stationFillEl = document.getElementById('station-progress-fill');

  if (portTextEl) portTextEl.textContent = `${visitedPortsCount} / ${totalPorts} (${portPercent}%)`;
  if (portFillEl) portFillEl.style.width = `${portPercent}%`;

  if (stationTextEl) stationTextEl.textContent = `${visitedStationsCount} / ${totalStations} (${stationPercent}%)`;
  if (stationFillEl) stationFillEl.style.width = `${stationPercent}%`;
}

/**
 * 更新頂部成就解鎖進度條與數據統計
 */
function updateOverallProgress() {
  const total = allAchievements.length;
  if (total === 0) return;

  const unlockedCount = allAchievements.filter(a => a.isUnlocked).length;
  const percentage = Math.round((unlockedCount / total) * 100);

  const statsDesc = document.getElementById('achievement-stats-desc');
  const percentBadge = document.getElementById('achievement-percent-badge');
  const progressFill = document.getElementById('achievement-progress-fill');

  if (statsDesc) statsDesc.textContent = `已解鎖 ${unlockedCount} / ${total} 個成就`;
  if (percentBadge) percentBadge.textContent = `${percentage}%`;
  if (progressFill) progressFill.style.width = `${percentage}%`;
}

/**
 * 渲染成就卡片列表
 */
function renderAchievementCards() {
  const container = document.getElementById('achievement-list');
  if (!container) return;

  const categoryVal = document.getElementById('categoryFilter')?.value || 'all';
  const statusVal = document.getElementById('statusFilter')?.value || 'all';

  const filtered = allAchievements.filter(ach => {
    if (categoryVal !== 'all' && ach.category !== categoryVal) {
      return false;
    }
    if (statusVal === 'unlocked' && !ach.isUnlocked) {
      return false;
    }
    if (statusVal === 'locked' && ach.isUnlocked) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="achievement-card" style="text-align: center; color: var(--text-secondary); grid-column: 1 / -1; justify-content: center;">
        沒有符合條件的成就勳章
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(ach => createAchievementCardHTML(ach)).join('');
}

/**
 * 生成單張成就卡片 HTML
 */
function createAchievementCardHTML(ach) {
  const isUnlocked = ach.isUnlocked;
  const statusBadge = isUnlocked
    ? `<span class="status-badge status-visited">已解鎖</span>`
    : `<span class="status-badge status-unvisited">未解鎖</span>`;

  return `
    <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
      <div class="achievement-icon">
        ${ach.svg || ''}
      </div>
      <div class="achievement-info">
        <div class="achievement-header">
          <h4 class="achievement-title">${escapeHTML(ach.title)}</h4>
          ${statusBadge}
        </div>
        <p class="achievement-desc">${escapeHTML(ach.description)}</p>
      </div>
    </div>
  `;
}

/**
 * 當篩選選單變動時觸發
 */
function handleCategoryChange() {
  renderAchievementCards();
}

/**
 * HTML 字串跳脫防 XSS
 */
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 當使用者登入成功時重新呼叫載入與繪製
async function onLoginSuccess() {
  await initDashboardData();
}
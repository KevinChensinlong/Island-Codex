/**
 * 島嶼圖鑑 Island Codex - 主應用程式入口 (app.js)
 */

// 判斷當前頁面類型（若網址包含 TR_stations.html 則為車站頁面，否則為港口頁面）
const PAGE_TYPE = window.location.pathname.includes('TR_stations.html') ? 'station' : 'port';

// 判斷當前是否在 html/ 子目錄下，自動調整 JSON 資料讀取路徑
const BASE_DATA_PATH = window.location.pathname.includes('/html/') ? '../data/' : './data/';

window.currentUserCheckins = [];
window.portsData = [];

let smoothProgressInterval = null;
let currentProgressVal = 0; // 紀錄當前進度數值

// 輔助函式：更新進度條狀態
function updateProgress(percent, text = "資料載入中...") {
    const container = document.getElementById('loading-progress-container');
    const fill = document.getElementById('progress-bar-fill');
    const textElem = document.getElementById('progress-text');
    const portList = document.getElementById('port-list');

    if (container && fill) {
        container.style.display = 'block';
        if (portList) portList.style.opacity = '0.3';

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
    const portList = document.getElementById('port-list');

    if (container) {
        setTimeout(() => {
            container.style.display = 'none';
            if (portList) portList.style.opacity = '1';
        }, 200);
    }
}

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

function stopTrickleProgress() {
    if (smoothProgressInterval) {
        clearInterval(smoothProgressInterval);
        smoothProgressInterval = null;
    }
}

// 動態載入 JSON 資料（依據目前 URL 位置尋找 ../data/ 或 ./data/）
async function loadPortsData() {
    const fileName = PAGE_TYPE === 'station' ? 'TR_station.json' : 'ports.json';
    const jsonPath = `${BASE_DATA_PATH}${fileName}`;
    
    try {
        const res = await fetch(`${jsonPath}?v=${new Date().getTime()}`);
        if (!res.ok) throw new Error(`HTTP 錯誤: ${res.status}`);
        const data = await res.json();
        window.portsData = data;
        return data;
    } catch (err) {
        console.error(`無法載入 ${jsonPath}：`, err);
        return [];
    }
}

async function initApp() {
    stopTrickleProgress();
    const targetLabel = PAGE_TYPE === 'station' ? '車站' : '景點';
    updateProgress(20, `讀取${targetLabel}清單...`);

    const ports = await loadPortsData();
    updateProgress(45, "驗證使用者狀態...");

    const currentUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    let userCheckins = [];
    let hasCache = false;

    const cacheKey = currentUser && currentUser.account ? `checkins_${currentUser.account}` : 'checkins_guest';

    // 1. 檢查快取
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        try {
            userCheckins = JSON.parse(cachedData);
            hasCache = userCheckins.length > 0;
        } catch (e) {
            console.warn("快取解析失敗：", e);
        }
    }

    // 將資料同步至全域
    window.currentUserCheckins = userCheckins;
    window.AppState = window.AppState || {};
    window.AppState.allPorts = ports;
    window.AppState.checkins = userCheckins;

    // 2. 初始化選單與卡片
    if (typeof initFilterOptions === 'function' && document.getElementById('countyFilter')) {
        initFilterOptions(ports);
    }

    if (typeof renderMapMarkers === 'function' && document.getElementById('map')) {
        renderMapMarkers(ports, userCheckins);
    }

    if (document.getElementById('port-list')) {
        if (typeof handleSearchAndFilter === 'function') {
            handleSearchAndFilter();
        } else if (typeof renderCards === 'function') {
            renderCards(ports, userCheckins);
        }
    }

    // 3. 有快取：快速滑動進度條到 100% 秒開；無快取/網路慢：啟動平滑爬升進度條
    if (hasCache) {
        // 快取秒開，進度條以極快速度 (180ms) 衝滿到 100%
        finishProgress("載入完成！", 180);
    } else {
        // 無快取時，開啟正常爬升進度條
        if (currentUser && currentUser.account) {
            startTrickleProgress(60, `同步 ${currentUser.name || currentUser.account} 的打卡紀錄...`);
        } else {
            updateProgress(75, "繪製卡片中...");
        }
    }

    // 4. 背景同步雲端最新打卡紀錄
    if (currentUser && currentUser.account) {
        try {
            const hasValidApiUrl = typeof CONFIG !== 'undefined' &&
                CONFIG.apiUrl &&
                !CONFIG.apiUrl.includes("https://script.google.com/macros/s/AKfycbwDjV3oGTBGdQOgKNCkCJZUc-_SRzehbNFeHQeJD6AT-_jJ3-XW86N54Lmtk4zJvA2W/exec");

            if (hasValidApiUrl) {
                const requestUrl = `${CONFIG.apiUrl}?action=getUserData&account=${encodeURIComponent(currentUser.account)}&t=${Date.now()}`;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);

                const res = await fetch(requestUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                const data = await res.json();
                if (data.success && Array.isArray(data.records)) {
                    const latestCheckins = data.records;

                    if (JSON.stringify(latestCheckins) !== JSON.stringify(userCheckins)) {
                        window.currentUserCheckins = latestCheckins;
                        window.AppState.checkins = latestCheckins;
                        localStorage.setItem(cacheKey, JSON.stringify(latestCheckins));

                        if (typeof handleSearchAndFilter === 'function') {
                            handleSearchAndFilter();
                        } else if (typeof renderCards === 'function') {
                            renderCards(ports, latestCheckins);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("讀取雲端打卡資料失敗（使用本地快取）：", err);
        } finally {
            // 如果原本沒有快取（代表進度條還在跑），當 API 完成時衝滿到 100%
            if (!hasCache) {
                finishProgress("同步完成！", 300);
            }
        }
    } else if (!hasCache) {
        finishProgress("載入完成！", 250);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof renderHeader === 'function') renderHeader();
    if (typeof renderFooter === 'function') renderFooter();

    initApp();
});

async function onLoginSuccess() {
    await initApp();
}

// 計算出最近地點後的渲染邏輯
function updateNearestPortUI(nearestPort, distance) {
    const card = document.getElementById('nearestPortCard');
    const nameEl = document.getElementById('nearestPortName');
    const descEl = document.getElementById('nearestPortDesc');
    const distEl = document.getElementById('nearestDistance');

    if (!nearestPort || !card) return;

    if (nameEl) nameEl.textContent = nearestPort.name;
    if (distEl) distEl.textContent = `${distance.toFixed(1)} km`;

    if (descEl) {
        if (typeof parseLocation === 'function') {
            const { county, town } = parseLocation(nearestPort);
            descEl.textContent = `${county} ${town}`.trim();
        } else {
            const rawLoc = nearestPort.county || nearestPort.city || nearestPort.location || '';
            descEl.textContent = rawLoc.length > 3 
                ? `${rawLoc.substring(0, 3)} ${rawLoc.substring(3)}` 
                : rawLoc;
        }
    }

    card.style.display = 'block';
}
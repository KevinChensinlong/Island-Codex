/**
 * 島嶼圖鑑 Island Codex - 主應用程式入口 (app.js)
 */

window.currentUserCheckins = [];
window.portsData = [];

let smoothProgressInterval = null;

// 輔助函式：更新進度條狀態
function updateProgress(percent, text = "資料載入中...") {
    const container = document.getElementById('loading-progress-container');
    const fill = document.getElementById('progress-bar-fill');
    const textElem = document.getElementById('progress-text');
    const portList = document.getElementById('port-list');

    if (container && fill) {
        container.style.display = 'block';
        if (portList) portList.style.opacity = '0.3';
        
        const safePercent = Math.min(100, Math.max(0, Math.round(percent)));
        fill.style.width = `${safePercent}%`;
        if (textElem) textElem.textContent = `${text} (${safePercent}%)`;
    }
}

// 輔助函式：隱藏進度條
function hideProgress() {
    const container = document.getElementById('loading-progress-container');
    const portList = document.getElementById('port-list');

    if (container) {
        setTimeout(() => {
            container.style.display = 'none';
            if (portList) portList.style.opacity = '1';
        }, 300);
    }
}

// 💡 智慧進度條：40%~85% 穩定前進，85% 以上開啟「無限極慢蠕動」，上限 99%
function startTrickleProgress(startPercent = 40, statusText = "連線雲端資料中...") {
    if (smoothProgressInterval) clearInterval(smoothProgressInterval);

    let current = startPercent;
    
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

// 停止偽進度動畫
function stopTrickleProgress() {
    if (smoothProgressInterval) {
        clearInterval(smoothProgressInterval);
        smoothProgressInterval = null;
    }
}

// 1. 載入 ports.json
async function loadPortsData() {
    try {
        const res = await fetch('./data/ports.json?v=' + new Date().getTime());
        if (!res.ok) throw new Error(`HTTP 錯誤: ${res.status}`);
        const data = await res.json();
        window.portsData = data;
        return data;
    } catch (err) {
        console.error("無法載入 ports.json：", err);
        return [];
    }
}

// 2. 初始化應用程式
async function initApp() {
    stopTrickleProgress();
    updateProgress(15, "讀取景點清單...");

    // 階段 1：下載 ports.json
    const ports = await loadPortsData();
    updateProgress(40, "驗證使用者狀態...");

    const currentUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    let userCheckins = [];

    // 階段 2：同步個人打卡紀錄
    if (currentUser && currentUser.account) {
        startTrickleProgress(40, `同步 ${currentUser.name || currentUser.account} 的打卡紀錄...`);

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
                    userCheckins = data.records;
                }
            }
        } catch (err) {
            console.error("讀取個人打卡資料失敗：", err);
        } finally {
            stopTrickleProgress();
        }
    }

    window.currentUserCheckins = userCheckins;

    // 階段 3：寫入全域 AppState 與初始化搜尋選單
    window.AppState = window.AppState || {};
    window.AppState.allPorts = ports;
    window.AppState.checkins = userCheckins;

    // 初始化縣市與鄉鎮選單
    if (typeof initFilterOptions === 'function') {
        initFilterOptions(ports);
    }

    updateProgress(98, "繪製地圖與景點卡片...");

    // 階段 4：渲染地圖標記與卡片
    if (typeof renderMapMarkers === 'function') {
        renderMapMarkers(ports, userCheckins);
    }

    // 優先執行四條件搜尋過濾，若無則降級為預設渲染
    if (typeof handleSearchAndFilter === 'function') {
        handleSearchAndFilter();
    } else if (typeof renderCards === 'function') {
        renderCards(ports, userCheckins);
    }

    // 完成！
    updateProgress(100, "同步完成！");
    hideProgress();
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function onLoginSuccess() {
    await initApp();
}
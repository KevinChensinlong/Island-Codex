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

function stopTrickleProgress() {
    if (smoothProgressInterval) {
        clearInterval(smoothProgressInterval);
        smoothProgressInterval = null;
    }
}

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

async function initApp() {
    stopTrickleProgress();
    updateProgress(15, "讀取景點清單...");

    const ports = await loadPortsData();
    updateProgress(40, "驗證使用者狀態...");

    const currentUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    let userCheckins = [];

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

    window.AppState = window.AppState || {};
    window.AppState.allPorts = ports;
    window.AppState.checkins = userCheckins;

    if (typeof initFilterOptions === 'function') {
        initFilterOptions(ports);
    }

    updateProgress(98, "繪製地圖與景點卡片...");

    if (typeof renderMapMarkers === 'function') {
        renderMapMarkers(ports, userCheckins);
    }

    if (typeof handleSearchAndFilter === 'function') {
        handleSearchAndFilter();
    } else if (typeof renderCards === 'function') {
        renderCards(ports, userCheckins);
    }

    updateProgress(100, "同步完成！");
    hideProgress();
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function onLoginSuccess() {
    await initApp();
}

// 計算出最近港口後的渲染邏輯
function updateNearestPortUI(nearestPort, distance) {
    const card = document.getElementById('nearestPortCard');
    const nameEl = document.getElementById('nearestPortName');
    const descEl = document.getElementById('nearestPortDesc');
    const distEl = document.getElementById('nearestDistance');

    if (nearestPort && card) {
        // 印出物件結構，方便在 F12 開發者工具觀察真正的 key 叫什麼
        console.log('最近港口資料物件：', nearestPort);

        if (nameEl) nameEl.textContent = nearestPort.name;

        if (descEl) {
            // 盡可能抓出任何可能包含地點字串的欄位
            const rawLoc = String(
                nearestPort.county || 
                nearestPort.city || 
                nearestPort.location || 
                nearestPort.region || 
                ''
            ).trim();

            // 如果字串長度大於 3（例如 "新北市八里區"），強制切開並補上全角中文空格 （顯眼效果更好）
            if (rawLoc.length > 3) {
                const countyStr = rawLoc.substring(0, 3);
                const townStr = rawLoc.substring(3);
                descEl.textContent = `${countyStr} ${townStr}`;
            } else if (nearestPort.county && nearestPort.town) {
                // 若剛好有獨立欄位
                descEl.textContent = `${nearestPort.county} ${nearestPort.town}`;
            } else {
                descEl.textContent = rawLoc;
            }
        }

        if (distEl) distEl.textContent = `${distance.toFixed(1)} km`;

        card.style.display = 'block';
    }
}
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
            // 前期：較快的速度升到 85%
            current += Math.random() * 3 + 1; 
        } else if (current < 99) {
            // 後期（超過 85%）：越接近 99% 爬得越慢，無限趨近但絕不達到 100%
            const remaining = 99 - current;
            current += remaining * 0.08; 
        }

        if (current >= 99) {
            current = 99; // 封頂 99%（獻給網路極差的情況 哈哈）
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
        const res = await fetch('./data/ports.json?v=' + new Date().getTime()); // cite: 4
        if (!res.ok) throw new Error(`HTTP 錯誤: ${res.status}`); // cite: 4
        const data = await res.json(); // cite: 4
        window.portsData = data; // cite: 4
        return data; // cite: 4
    } catch (err) {
        console.error("無法載入 ports.json：", err); // cite: 4
        return []; // cite: 4
    }
}

// 2. 初始化應用程式
async function initApp() {
    stopTrickleProgress();
    updateProgress(15, "讀取景點清單...");

    // 階段 1：下載 ports.json
    const ports = await loadPortsData(); // cite: 4
    updateProgress(40, "驗證使用者狀態...");

    const currentUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null; // cite: 4
    let userCheckins = [];

    // 階段 2：同步個人打卡紀錄
    if (currentUser && currentUser.account) { // cite: 4
        // 💡 啟動欺騙性動態進度：一路爬到 85%，之後開啟極慢蠕動直到 99%
        startTrickleProgress(40, `同步 ${currentUser.name || currentUser.account} 的打卡紀錄...`);

        try {
            const hasValidApiUrl = typeof CONFIG !== 'undefined' && 
                                   CONFIG.apiUrl && 
                                   !CONFIG.apiUrl.includes("https://script.google.com/macros/s/AKfycbwDjV3oGTBGdQOgKNCkCJZUc-_SRzehbNFeHQeJD6AT-_jJ3-XW86N54Lmtk4zJvA2W/exec"); // cite: 4

            if (hasValidApiUrl) { // cite: 4
                const requestUrl = `${CONFIG.apiUrl}?action=getUserData&account=${encodeURIComponent(currentUser.account)}&t=${Date.now()}`; // cite: 4
                const controller = new AbortController(); // cite: 4
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 延長至 8 秒防極差網路

                const res = await fetch(requestUrl, { signal: controller.signal }); // cite: 4
                clearTimeout(timeoutId); // cite: 4

                const data = await res.json(); // cite: 4
                if (data.success && Array.isArray(data.records)) { // cite: 4
                    userCheckins = data.records; // cite: 4
                }
            }
        } catch (err) {
            console.error("讀取個人打卡資料失敗：", err); // cite: 4
        } finally {
            // API 收到資料（或失敗）後，立即停止計時器
            stopTrickleProgress();
        }
    }

    window.currentUserCheckins = userCheckins; // cite: 4

    // 階段 3：資料到位！一口氣爆發到 100% 渲染畫面
    updateProgress(98, "繪製地圖與景點卡片...");

    if (typeof renderMapMarkers === 'function') { // cite: 4
        renderMapMarkers(ports, userCheckins); // cite: 4
    }

    if (typeof renderCards === 'function') { // cite: 4
        renderCards(ports, userCheckins); // cite: 4
    }

    // 完成！
    updateProgress(100, "同步完成！");
    hideProgress();
}

document.addEventListener('DOMContentLoaded', () => {
    initApp(); // cite: 4
});

async function onLoginSuccess() {
    await initApp(); // cite: 4
}
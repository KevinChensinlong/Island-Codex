/**
 * 島嶼圖鑑 Island Codex - 主應用程式入口 (app.js)
 */

window.currentUserCheckins = [];
window.portsData = [];

// 1. 載入 data/ports.json (修正為正確路徑 + 防快取)
async function loadPortsData() {
    try {
        const res = await fetch('./data/ports.json?v=' + new Date().getTime());
        if (!res.ok) throw new Error(`HTTP 錯誤: ${res.status}`);
        const data = await res.json();
        window.portsData = data;
        return data;
    } catch (err) {
        console.error("無法載入 data/ports.json 港口資料，請確認檔案位置：", err);
        return [];
    }
}

// 2. 初始化應用程式
async function initApp() {
    // 載入 data/ports.json 港口資料
    const ports = await loadPortsData();
    const currentUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    let userCheckins = [];

    // 若已登入，向 GAS API 抓取個人的打卡紀錄
    if (currentUser && currentUser.account) {
        try {
            // 簡化判斷：只要有設定 apiUrl 且不是預設佔位符 YOUR_GOOGLE_APPS_SCRIPT 就放行
            const hasValidApiUrl = typeof CONFIG !== 'undefined' && 
                                   CONFIG.apiUrl && 
                                   !CONFIG.apiUrl.includes("https://script.google.com/macros/s/AKfycbwDjV3oGTBGdQOgKNCkCJZUc-_SRzehbNFeHQeJD6AT-_jJ3-XW86N54Lmtk4zJvA2W/exec");

            if (hasValidApiUrl) {
                // 💡 加入 &t=${Date.now()} 強制打破瀏覽器 API 快取，確保每次都拿到最新試算表資料
                const requestUrl = `${CONFIG.apiUrl}?action=getUserData&account=${encodeURIComponent(currentUser.account)}&t=${Date.now()}`;
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 延長至 5 秒

                const res = await fetch(requestUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                const data = await res.json();
                if (data.success && Array.isArray(data.records)) {
                    userCheckins = data.records;
                }
            }
        } catch (err) {
            console.error("讀取個人打卡資料失敗或逾時：", err);
        }
    }

    window.currentUserCheckins = userCheckins;

    // 將 ports 與 userCheckins 帶入地圖與卡片
    if (typeof renderMapMarkers === 'function') {
        renderMapMarkers(ports, userCheckins);
    }

    if (typeof renderCards === 'function') {
        renderCards(ports, userCheckins);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// 當使用者在頁面上按下登入按鈕並登入成功時呼叫
async function onLoginSuccess() {
    await initApp();
}
// 更新按鈕顯示狀態（當前為 dark 則按鈕提示切換至「淺色」，反之亦然）
function updateThemeButton(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
        btn.textContent = theme === 'dark' ? '淺色模式' : '深色模式';
    }
}

// 主題切換邏輯
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeButton(newTheme);
}

// 初始化主題
function initTheme() {
    const body = document.body;
    const savedTheme = localStorage.getItem('theme');
    
    // 讀取 HTML <body> 上原本預設的 data-theme
    const defaultBodyTheme = body.getAttribute('data-theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    // 判定優先順序：使用者儲存紀錄 > HTML 預設屬性 > 系統深色偏好 > 預設 light
    const targetTheme = savedTheme || defaultBodyTheme || (systemPrefersDark ? 'dark' : 'light');

    body.setAttribute('data-theme', targetTheme);
    updateThemeButton(targetTheme);
}

// 頁面載入完成後初始化主題與按鈕文字
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
});
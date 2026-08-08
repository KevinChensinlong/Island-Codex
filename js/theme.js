// 主題切換邏輯
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeButton(newTheme);
}

// 更新按鈕顯示狀態
function updateThemeButton(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
        btn.textContent = theme === 'dark' ? '淺色模式' : '深色模式';
    }
}

// 初始化主題
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const targetTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    document.body.setAttribute('data-theme', targetTheme);
    updateThemeButton(targetTheme);
}

// 頁面載入完成後套用主題
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
});
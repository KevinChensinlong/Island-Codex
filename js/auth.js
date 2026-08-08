// 取得目前登入者資訊
function getCurrentUser() {
    const userJson = localStorage.getItem('island_codex_user');
    return userJson ? JSON.parse(userJson) : null;
}

// 開啟登入 / 註冊 Modal
function openAuthModal(mode = 'login') {
    const dialog = document.getElementById('auth-dialog');
    if (dialog) {
        switchAuthTab(mode);
        dialog.showModal();
    }
}

// 關閉 Modal
function closeAuthModal() {
    const dialog = document.getElementById('auth-dialog');
    if (dialog) dialog.close();
}

// 顯示 Modal 內部提示字串 (取代原本突兀的 alert)
function showAuthMessage(msg, type = 'error') {
    const msgBox = document.getElementById('auth-msg');
    if (!msgBox) return;

    msgBox.textContent = msg;
    msgBox.className = `auth-msg ${type}`;
    msgBox.style.display = 'block';
}

// 清除提示字串
function clearAuthMessage() {
    const msgBox = document.getElementById('auth-msg');
    if (msgBox) {
        msgBox.textContent = '';
        msgBox.style.display = 'none';
    }
}

// 切換 登入/註冊 分頁 Tab
function switchAuthTab(mode) {
    clearAuthMessage();
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');
    const loginBtn = document.getElementById('tab-login-btn');
    const registerBtn = document.getElementById('tab-register-btn');

    if (mode === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
        if (loginBtn) loginBtn.classList.add('active');
        if (registerBtn) registerBtn.classList.remove('active');
    } else {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        if (loginBtn) loginBtn.classList.remove('active');
        if (registerBtn) registerBtn.classList.add('active');
    }
}

// 處理帳密驗證登入 (查詢 Google 試算表 API)
async function handleLogin(event) {
    event.preventDefault();
    clearAuthMessage();

    const accountInput = document.getElementById('login-account');
    const passwordInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('login-submit-btn');

    const account = accountInput ? accountInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!account || !password) {
        showAuthMessage("請輸入帳號與密碼！");
        return;
    }

    try {
        if (!CONFIG.apiUrl || CONFIG.apiUrl.includes("YOUR_GOOGLE_APPS_SCRIPT")) {
            showAuthMessage("請先在 js/config.js 設定您的 API 網址！");
            return;
        }

        // 按鈕切換為載入狀態
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "驗證中...";
        }

        // 向 Google Apps Script 發送 GET 請求進行帳密比對
        const response = await fetch(`${CONFIG.apiUrl}?action=login&account=${encodeURIComponent(account)}&password=${encodeURIComponent(password)}`);
        const result = await response.json();

        if (result.success) {
            // 寫入登入狀態
            localStorage.setItem('island_codex_user', JSON.stringify(result.user));
            
            closeAuthModal();
            if (typeof renderHeader === 'function') renderHeader();
            if (typeof initApp === 'function') initApp();
        } else {
            showAuthMessage(result.message || "帳號或密碼錯誤！");
        }

    } catch (error) {
        console.error("登入失敗：", error);
        showAuthMessage("連線失敗，請檢查網路或 API 設定。");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "登入";
        }
    }
}

// 處理一站式背景註冊 (寫入 Google Form)
async function handleRegister(event) {
    event.preventDefault();
    clearAuthMessage();

    const nameInput = document.getElementById('register-name');
    const accountInput = document.getElementById('register-account');
    const passwordInput = document.getElementById('register-password');
    const submitBtn = document.getElementById('register-submit-btn');

    const name = nameInput ? nameInput.value.trim() : '';
    const account = accountInput ? accountInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!name || !account || !password) {
        showAuthMessage("請完整填寫所有欄位！");
        return;
    }

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "處理中...";
        }

        const formConfig = CONFIG.registerForm;
        const formUrl = `https://docs.google.com/forms/d/e/${formConfig.formId}/formResponse`;

        // 組合 Google Form POST 參數
        const formData = new URLSearchParams();
        formData.append(formConfig.entries.name, name);
        formData.append(formConfig.entries.account, account);
        formData.append(formConfig.entries.password, password);

        // 使用 no-cors 發送至 Google 表單
        await fetch(formUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        // 自動帶入剛註冊的帳號密碼並切換至登入頁面
        if (document.getElementById('login-account')) {
            document.getElementById('login-account').value = account;
        }
        if (document.getElementById('login-password')) {
            document.getElementById('login-password').value = password;
        }

        switchAuthTab('login');
        showAuthMessage("註冊成功！資料已同步，請點擊登入。", "success");

    } catch (error) {
        console.error("註冊失敗：", error);
        showAuthMessage("註冊連線失敗，請稍後再試。");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "立即註冊";
        }
    }
}

// 處理使用者登出
function logoutUser() {
    localStorage.removeItem('island_codex_user');
    if (typeof renderHeader === 'function') renderHeader();
    if (typeof initApp === 'function') initApp();
}
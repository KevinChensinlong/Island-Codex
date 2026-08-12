/**
 * 島嶼圖鑑 Island Codex - 元件與打卡彈窗模組 (components.js)
 */

// 渲染獨立頁首 (包含登入狀態)
function renderHeader() {
  const currentUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;

  const headerHTML = `
    <header class="site-header">
      <div class="logo-area">
        <h1 class="brand-title">
         <img src="images/icon-512.jpg" alt="Logo" class="brand-logo">
              島嶼圖鑑 <span>TW</span>
        </h1>
      </div>
      <div class="header-actions">
        ${currentUser ? `
            <span class="user-welcome">您好！ ${currentUser.name || currentUser.account} </span>
            <button class="btn btn-secondary" onclick="logoutUser()">登出</button>
        ` : `
            <button class="btn btn-primary" onclick="openAuthModal('login')">登入 / 註冊</button>
        `}
        <!-- 將按鈕內預設的「深色模式」字串清除 -->
        <button class="btn btn-secondary" onclick="toggleTheme()" id="theme-toggle-btn"></button>
      </div>
    </header>
  `;

  const container = document.getElementById('header-container');
  if (container) {
    container.innerHTML = headerHTML;

    // 渲染完 DOM 後，立即初始化主題狀態並寫入正確的按鈕文字
    if (typeof initTheme === 'function') {
      initTheme();
    }
  }
}

// 渲染獨立頁尾
function renderFooter() {
  const footerHTML = `
    <footer class="site-footer">
      <p>© 2026 島嶼圖鑑 Island Codex | 個人足跡記錄專案</p>
    </footer>
  `;

  const container = document.getElementById('footer-container');
  if (container) {
    container.innerHTML = footerHTML;
  }
}

// 渲染一站式登入/註冊 Modal
function renderAuthModal() {
  let modalContainer = document.getElementById('auth-modal-container');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'auth-modal-container';
    document.body.appendChild(modalContainer);
  }

  modalContainer.innerHTML = `
    <dialog id="auth-dialog" class="auth-dialog">
      <div class="auth-modal-content">
        <!-- 切換 Tab -->
        <div class="auth-tabs">
          <button id="tab-login-btn" class="auth-tab active" onclick="switchAuthTab('login')">會員登入</button>
          <button id="tab-register-btn" class="auth-tab" onclick="switchAuthTab('register')">快速註冊</button>
        </div>

        <!-- 提示訊息區域 -->
        <div id="auth-msg" class="auth-msg" style="display: none;"></div>
        
        <!-- 登入表單 -->
        <form id="form-login" onsubmit="handleLogin(event)">
          <div class="form-group">
            <label>帳號或 Email</label>
            <input type="text" id="login-account" placeholder="請輸入帳號或 Email" required class="auth-input">
          </div>
          <div class="form-group">
            <label>密碼</label>
            <input type="password" id="login-password" placeholder="請輸入密碼" required class="auth-input">
          </div>
          <div class="auth-actions">
            <button type="submit" id="login-submit-btn" class="btn btn-primary btn-block">登入</button>
          </div>
        </form>

        <!-- 註冊表單 -->
        <form id="form-register" onsubmit="handleRegister(event)" style="display: none;">
          <div class="form-group">
            <label>顯示名稱 / 暱稱</label>
            <input type="text" id="register-name" placeholder="請輸入您的暱稱" required class="auth-input">
          </div>
          <div class="form-group">
            <label>帳號或 Email</label>
            <input type="text" id="register-account" placeholder="設定登入帳號或 Email" required class="auth-input">
          </div>
          <div class="form-group">
            <label>設定密碼</label>
            <input type="password" id="register-password" placeholder="設定至少 6 位數密碼" required class="auth-input" minlength="6">
          </div>
          <div class="auth-actions">
            <button type="submit" id="register-submit-btn" class="btn btn-primary btn-block">立即註冊</button>
          </div>
        </form>

        <div class="auth-footer">
          <button class="btn-text" onclick="closeAuthModal()">取消</button>
        </div>
      </div>
    </dialog>
  `;
}

// 自動調整 textarea 高度的輔助函式
function autoResizeTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = (textarea.scrollHeight + 2) + 'px';
}

// 開啟打卡 Modal
function openCheckinModal(spotId, spotName) {
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!currentUser) {
    if (typeof openAuthModal === 'function') {
      openAuthModal('login');
    } else {
      alert('請先登入會員再進行打卡！');
    }
    return;
  }

  // 尋找該使用者對該景點的舊筆記與造訪日期
  let existingNote = '';
  let existingDate = new Date().toISOString().split('T')[0]; // 預設今日

  const checkins = (window.AppState && window.AppState.checkins) || window.allCheckinRecords || [];
  const record = checkins.findLast ?
    checkins.findLast(c => String(c.spotId) === String(spotId) && String(c.userId || c.account) === String(currentUser.account)) :
    checkins.filter(c => String(c.spotId) === String(spotId) && String(c.userId || c.account) === String(currentUser.account)).pop();

  if (record) {
    if (record.note) existingNote = record.note;
    if (record.visitedDate) existingDate = record.visitedDate;
  }

  let dialog = document.getElementById('checkin-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'checkin-dialog';
    dialog.className = 'auth-dialog';
    document.body.appendChild(dialog);
  }

  dialog.innerHTML = `
      <div class="auth-modal-content">
        <h3>景點打卡 - ${spotName}</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">帳號：${currentUser.account}</p>
        
        <form onsubmit="handleCheckinSubmit(event, '${spotId}')">
          <div class="form-group" style="margin-bottom: 12px;">
            <label>造訪日期</label>
            <input type="date" id="checkin-date" value="${existingDate}" required class="auth-input">
          </div>
          <div class="form-group" style="margin-bottom: 12px;">
            <label>個人心得或筆記</label>
            <textarea 
              id="checkin-note" 
              placeholder="記錄當下的心得或筆記..." 
              rows="3" 
              class="auth-input auto-expand-textarea"
              oninput="autoResizeTextarea(this)"
            >${existingNote}</textarea>
          </div>
          
          <div id="checkin-msg" class="auth-msg" style="display: none;"></div>

          <div class="auth-actions" style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;">
            <button type="button" class="btn btn-text" onclick="document.getElementById('checkin-dialog').close()">取消</button>
            <button type="submit" id="checkin-submit-btn" class="btn btn-primary">儲存打卡</button>
          </div>
        </form>
      </div>
    `;

  dialog.showModal();

  const noteTextarea = document.getElementById('checkin-note');
  if (noteTextarea) {
    autoResizeTextarea(noteTextarea);
  }
}

// 處理打卡表單提交 (背景寫入 Google Form 並更新全域狀態)
async function handleCheckinSubmit(event, spotId) {
  event.preventDefault();
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!currentUser) return;

  const dateVal = document.getElementById('checkin-date')?.value;
  const noteVal = document.getElementById('checkin-note')?.value.trim();
  const submitBtn = document.getElementById('checkin-submit-btn');
  const msgBox = document.getElementById('checkin-msg');

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "儲存中...";
    }

    const checkinConfig = CONFIG.checkinForm;
    const actionUrl = `https://docs.google.com/forms/d/e/${checkinConfig.formId}/formResponse`;

    // 建立隱藏 iframe 提交表單
    let iframe = document.getElementById('hidden-form-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'hidden-form-iframe';
      iframe.name = 'hidden-form-iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }

    const tempForm = document.createElement('form');
    tempForm.action = actionUrl;
    tempForm.method = 'POST';
    tempForm.target = 'hidden-form-iframe';

    const fields = {
      [checkinConfig.entries.account]: currentUser.account,
      [checkinConfig.entries.spotId]: spotId,
      [checkinConfig.entries.note]: noteVal,
      [checkinConfig.entries.visitedDate]: dateVal
    };

    for (const [key, val] of Object.entries(fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = val;
      tempForm.appendChild(input);
    }

    document.body.appendChild(tempForm);
    tempForm.submit();
    document.body.removeChild(tempForm);

    // --- 同步更新本地與全域打卡紀錄 ---
    const newRecord = {
      spotId: String(spotId),
      userId: String(currentUser.account),
      account: String(currentUser.account),
      note: noteVal,
      visitedDate: dateVal
    };

    window.AppState = window.AppState || {};
    if (!Array.isArray(window.AppState.checkins)) window.AppState.checkins = [];

    // 蓋掉該使用者的舊打卡紀錄並加入新紀錄
    window.AppState.checkins = window.AppState.checkins.filter(
      c => !(String(c.spotId) === String(spotId) && String(c.userId || c.account) === String(currentUser.account))
    );
    window.AppState.checkins.push(newRecord);
    window.allCheckinRecords = window.AppState.checkins; // 備份同步

    if (msgBox) {
      msgBox.textContent = "打卡成功！資料已寫入雲端。";
      msgBox.className = "auth-msg success";
      msgBox.style.display = "block";
    }

    setTimeout(() => {
      document.getElementById('checkin-dialog')?.close();

      // 即時觸發搜尋過濾器更新畫面
      if (typeof handleSearchAndFilter === 'function') {
        handleSearchAndFilter();
      } else if (typeof renderCards === 'function') {
        renderCards(window.AppState.allPorts || [], window.AppState.checkins);
      }
    }, 1200);

  } catch (err) {
    console.error("打卡失敗：", err);
    if (msgBox) {
      msgBox.textContent = "打卡失敗，請稍後再試。";
      msgBox.className = "auth-msg error";
      msgBox.style.display = "block";
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "儲存打卡";
    }
  }
}

// 頁面載入完成後執行
document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  renderFooter();
  renderAuthModal();
});


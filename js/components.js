/**
 * 島嶼圖鑑 Island Codex - 元件與打卡彈窗模組 (components.js)
 */

// 判斷當前是否在 html/ 子目錄，動態計算相對根目錄的前綴路徑
const isInHtmlDir = window.location.pathname.includes('/html/');
const basePath = isInHtmlDir ? '../' : './';

// 渲染獨立頁首 (包含登入狀態與分頁頁籤)
function renderHeader() {
  const currentUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  // 透過網址判斷目前是否在「臺鐵車站」頁面
  const isStationPage = window.location.pathname.includes('TR_stations.html');
  
  // 判斷目前是否在「首頁」 (即網址為 index.html 或根目錄)
  const isHomePage = window.location.pathname.endsWith('/') || 
                     window.location.pathname.endsWith('/index.html') || 
                     (!window.location.pathname.includes('/html/'));

  // 計算連結路徑
  const homeLink = `${basePath}index.html`;
  const portLink = isInHtmlDir ? 'ports.html' : 'html/ports.html';
  const stationLink = isInHtmlDir ? 'TR_stations.html' : 'html/TR_stations.html';

  const headerHTML = `
    <header class="site-header-wrapper">
      <div class="site-header">
        <!-- 點擊 Logo 區域即可回首頁 -->
        <a href="${homeLink}" class="logo-area" style="text-decoration: none; color: inherit;">
          <h1 class="brand-title">
            <img src="${basePath}images/icon-512.jpg" alt="Logo" class="brand-logo">
            島嶼圖鑑 <span>TW</span>
          </h1>
        </a>
        <div class="header-actions">
          ${currentUser ? `
              <span class="user-welcome">您好！ ${currentUser.name || currentUser.account} </span>
              <button class="btn btn-secondary" onclick="logoutUser()">登出</button>
          ` : `
              <button class="btn btn-primary" onclick="openAuthModal('login')">登入 / 註冊</button>
          `}
          <button class="btn btn-secondary" onclick="toggleTheme()" id="theme-toggle-btn"></button>
        </div>
      </div>

      <!-- 當「不是首頁」時，才渲染頂部分頁切換頁籤 -->
      ${!isHomePage ? `
        <nav class="page-nav-tabs">
          <a href="${portLink}" class="nav-tab ${!isStationPage ? 'active' : ''}">港口圖鑑</a>
          <a href="${stationLink}" class="nav-tab ${isStationPage ? 'active' : ''}">臺鐵車站圖鑑</a>
        </nav>
      ` : ''}
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

// 渲染多欄位獨立頁尾
function renderFooter() {
  const portLink = isInHtmlDir ? 'ports.html' : 'html/ports.html';
  const stationLink = isInHtmlDir ? 'TR_stations.html' : 'html/TR_stations.html';

  const footerHTML = `
    <footer class="site-footer">
      <div class="footer-container">
        <!-- 左側：品牌名稱與簡介 -->
        <div class="footer-brand-col">
          <div class="footer-logo">
            <img src="${basePath}images/icon-512.jpg" alt="Logo" class="brand-logo">
            <span class="footer-brand-title">島嶼圖鑑 TW</span>
          </div>
          <p class="footer-desc">紀錄台灣港口與鐵道車站足跡，探索島嶼地景與人文歷史。</p>
          <p class="copyright">&copy; 2026 島嶼圖鑑 Island Codex</p>
        </div>

        <!-- 右側：多類別連結欄位 -->
        <div class="footer-links-grid">
          <!-- 類別 1：圖鑑導覽 -->
          <div class="footer-col">
            <h4 class="footer-col-title">圖鑑導覽</h4>
            <ul class="footer-links">
              <li><a href="${portLink}">港口圖鑑</a></li>
              <li><a href="${stationLink}">臺鐵車站圖鑑</a></li>
            </ul>
          </div>

          <!-- 類別 2：專案資訊 -->
          <div class="footer-col">
            <h4 class="footer-col-title">專案資訊</h4>
            <ul class="footer-links">
              <li><a href="https://github.com/KevinChensinlong/Island-Codex" target="_blank" rel="noopener">GitHub 原始碼</a></li>
              <li><a href="https://github.com/KevinChensinlong/Island-Codex/blob/main/README.md#%E6%9B%B4%E6%96%B0%E6%97%A5%E8%AA%8C" target="_blank" rel="noopener">更新日誌</a></li>
              <li><a href="https://github.com/KevinChensinlong/Island-Codex/issues" target="_blank" rel="noopener">回報問題</a></li>
            </ul>
          </div>

          <!-- 類別 3：相關連結 -->
          <div class="footer-col">
            <h4 class="footer-col-title">資料來源</h4>
            <ul class="footer-links">
              <li><a href="https://zh.wikipedia.org" target="_blank" rel="noopener">維基百科</a></li>
              <li><a href="https://data.gov.tw/dataset/33425" target="_blank" rel="noopener">政府資料開放平台</a></li>
              <li><a href="https://www.openstreetmap.org" target="_blank" rel="noopener">OpenStreetMap</a></li>
              <li><a href="https://earth.google.com/" target="_blank" rel="noopener">Google Earth</a></li>
              <li><a href="https://lucide.dev/" target="_blank" rel="noopener">Lucide Icons</a></li>
            </ul>
          </div>
        </div>
      </div>
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

// 開啟打卡 Modal (精確還原舊筆記與造訪日期)
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

  // 1. 取得當前全域中的打卡紀錄
  const checkins = (window.AppState && window.AppState.checkins) || window.currentUserCheckins || window.allCheckinRecords || [];
  
  // 2. 比對此景點屬於該使用者的最後一筆打卡紀錄
  const record = checkins.filter(c => {
    const matchSpot = String(c.spotId || c.id || '') === String(spotId);
    const matchUser = !c.userId && !c.account ? true : String(c.userId || c.account) === String(currentUser.account);
    return matchSpot && matchUser;
  }).pop();

  // 3. 解析舊日期與舊筆記 (若是無舊紀錄，日期才自動預設帶入今天 YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const existingNote = record ? (record.note || '') : '';
  const existingDate = record ? (record.visitedDate || record.visited_date || todayStr) : todayStr;

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

// 處理打卡表單提交 (背景寫入 Google Form 並更新全域狀態與 LocalStorage 快取)
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

    // --- 同步更新本地全域打卡紀錄 ---
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
      c => !(String(c.spotId || c.id || '') === String(spotId) && String(c.userId || c.account) === String(currentUser.account))
    );
    window.AppState.checkins.push(newRecord);
    window.allCheckinRecords = window.AppState.checkins; // 備份同步
    window.currentUserCheckins = window.AppState.checkins;

    // ⚡【新增】同步更新 LocalStorage 本地快取，確保重新整理頁面後能秒開最新資料
    const cacheKey = `checkins_${currentUser.account}`;
    localStorage.setItem(cacheKey, JSON.stringify(window.AppState.checkins));

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
/**
 * 島嶼圖鑑 Island Codex - 卡片渲染與多重搜尋篩選模組 (cards.js)
 */

// 全域狀態初始化
window.AppState = window.AppState || {
  allPorts: [],
  checkins: []
};

/**
 * 輔助函式：自動解析縣市與鄉鎮市區
 * 前 3 個字為縣市，第 4 個字以後為鄉鎮市區
 */
function parseLocation(spot) {
  const rawLoc = spot.city || spot.county || spot.region || spot.location || '';
  
  if (!rawLoc) {
    return { county: spot.county || '', town: spot.town || spot.district || '' };
  }

  // 若資料庫內已有明確拆分好的 town / district，就直接使用；否則切前 3 個字
  const county = rawLoc.length >= 3 ? rawLoc.substring(0, 3) : rawLoc;
  const town = spot.town || spot.district || (rawLoc.length > 3 ? rawLoc.substring(3) : '');

  return { county, town };
}

/**
 * 1. 初始化縣市與鄉鎮市區下拉選單選項 (載入 ports.json 後呼叫)
 */
function initFilterOptions(ports) {
  if (!ports || !Array.isArray(ports)) return;
  
  window.AppState.allPorts = ports;

  const countySelect = document.getElementById('countyFilter');
  if (!countySelect) return;

  // 提取不重複的縣市名單
  const counties = [...new Set(ports.map(p => parseLocation(p).county).filter(Boolean))];
  
  countySelect.innerHTML = '<option value="all">全部縣市</option>';
  
  counties.forEach(county => {
    const opt = document.createElement('option');
    opt.value = county;
    opt.textContent = county;
    countySelect.appendChild(opt);
  });

  // 初始化鄉鎮市區（預設載入全台所有鄉鎮）
  populateTownFilter('all');
}

/**
 * 根據選擇的縣市動態填入鄉鎮市區選項（絕不反灰停用）
 */
function populateTownFilter(selectedCounty = 'all') {
  const townSelect = document.getElementById('townFilter');
  if (!townSelect) return;

  const sourceData = (window.AppState && window.AppState.allPorts) || [];

  // 如果選擇「全部縣市」，就取全台所有景點；否則只取該縣市的景點
  const targetPorts = (selectedCounty === 'all') 
    ? sourceData 
    : sourceData.filter(p => parseLocation(p).county === selectedCounty);

  // 提取不重複的鄉鎮市區並排序
  const towns = [...new Set(targetPorts.map(p => parseLocation(p).town).filter(Boolean))].sort();

  const currentSelectedTown = townSelect.value;

  townSelect.innerHTML = '<option value="all">全部鄉鎮市區</option>';
  towns.forEach(town => {
    const opt = document.createElement('option');
    opt.value = town;
    opt.textContent = town;
    townSelect.appendChild(opt);
  });

  // 強制保持啟用狀態，維持質感統一的深色外觀
  townSelect.disabled = false;

  // 切換縣市時，若原本選取的鄉鎮仍在新選單中就保留，否則歸零為「全部鄉鎮市區」
  if (towns.includes(currentSelectedTown)) {
    townSelect.value = currentSelectedTown;
  } else {
    townSelect.value = 'all';
  }
}

/**
 * 2. 當「縣市選單」切換時連動更新
 */
function handleCountyChange() {
  const countySelect = document.getElementById('countyFilter');
  if (!countySelect) return;

  // 根據選擇的縣市更新鄉鎮選單內容
  populateTownFilter(countySelect.value);

  // 執行過濾
  handleSearchAndFilter();
}

/**
 * 3. 核心組合過濾演算法 (關鍵字 + 縣市 + 鄉鎮 + 踩點狀態)
 */
function handleSearchAndFilter() {
  const searchInput = document.getElementById('searchInput');
  const countyFilter = document.getElementById('countyFilter');
  const townFilter = document.getElementById('townFilter');
  const statusFilter = document.getElementById('statusFilter');

  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const selectedCounty = countyFilter ? countyFilter.value : 'all';
  const selectedTown = townFilter ? townFilter.value : 'all';
  const selectedStatus = statusFilter ? statusFilter.value : 'all';

  // 取得全域資料 (雙重保險相容舊變數)
  const sourceData = (window.AppState && window.AppState.allPorts && window.AppState.allPorts.length > 0) 
    ? window.AppState.allPorts 
    : (window.portsData || window.allPorts || []);
    
  const checkins = (window.AppState && window.AppState.checkins && window.AppState.checkins.length > 0) 
    ? window.AppState.checkins 
    : (window.currentUserCheckins || window.allCheckinRecords || []);
    
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  // 四條件交集過濾 (AND 邏輯)
  const filteredData = sourceData.filter(spot => {
    const currentSpotId = String(spot.id || spot.spotId || '');
    const { county: spotCounty, town: spotTown } = parseLocation(spot);

    // 條件 1: 關鍵字 (搜尋名稱、備註或說明)
    const nameStr = (spot.name || '').toLowerCase();
    const descStr = (spot.description || '').toLowerCase();
    const matchesKeyword = !keyword || nameStr.includes(keyword) || descStr.includes(keyword);

    // 條件 2: 縣市比對 (精準比對前 3 字)
    const matchesCounty = selectedCounty === 'all' || spotCounty === selectedCounty;

    // 條件 3: 鄉鎮市區比對 (精準比對第 4 字以後)
    const matchesTown = selectedTown === 'all' || spotTown === selectedTown;

    // 條件 4: 踩點狀態比對 (相容 spotId/id 與使用者驗證)
    const isVisited = checkins.some(c => {
      const recordSpotId = String(c.spotId || c.id || '');
      const matchSpot = recordSpotId === currentSpotId;
      const matchUser = !currentUser || !c.userId || String(c.userId || c.account) === String(currentUser.account);
      return matchSpot && matchUser;
    });

    let matchesStatus = true;
    if (selectedStatus === 'visited') {
      matchesStatus = isVisited === true;
    } else if (selectedStatus === 'unvisited') {
      matchesStatus = isVisited === false;
    }

    return matchesKeyword && matchesCounty && matchesTown && matchesStatus;
  });

  // 渲染過濾後的卡片列表
  renderCards(filteredData, checkins);

  // 同步更新地圖標記
  if (typeof updateMapMarkers === 'function') {
    updateMapMarkers(filteredData);
  }
}

/**
 * 4. 核心港口卡片渲染 (保持原始美麗 UI 結構)
 */
function renderCards(portsData = [], userCheckins = []) {
  const cardsContainer = document.getElementById('port-list');
  if (!cardsContainer) return;

  const checkins = Array.isArray(userCheckins) && userCheckins.length > 0 
    ? userCheckins 
    : ((window.AppState && window.AppState.checkins) || window.currentUserCheckins || []);
    
  const ports = Array.isArray(portsData) ? portsData : [];

  if (ports.length === 0) {
    cardsContainer.innerHTML = `<div class="no-data" style="text-align:center; padding: 40px 20px; color: #888;">查無符合條件的港口資料。</div>`;
    return;
  }

  cardsContainer.innerHTML = ports.map(spot => {
    const currentSpotId = String(spot.id || spot.spotId || '');

    // 比對踩點紀錄
    const matchingRecords = checkins.filter(c => String(c.spotId || c.id || '') === currentSpotId);
    const userRecord = matchingRecords.pop(); // 取最新的一筆紀錄
    const isVisited = !!userRecord;

    // 解析城市與鄉鎮資訊顯示
    const { county, town } = parseLocation(spot);
    const locationText = `${county} ${town}`.trim();

    return `
      <div class="port-card ${isVisited ? 'visited' : ''}" id="port-card-${currentSpotId}">
        <div class="port-header">
          <div>
            <div class="port-title">${spot.name}</div>
            <div class="port-city">${locationText}</div>
          </div>
          <span class="status-badge ${isVisited ? 'status-visited' : 'status-unvisited'}">
            ${isVisited ? '✓ 已踩點' : '未踩點'}
          </span>
        </div>

        ${isVisited && userRecord.note ? `
          <div class="port-notes">
            <strong>我的筆記：</strong> ${userRecord.note}
            ${userRecord.visitedDate ? `<div style="font-size: 0.75rem; color: #888; margin-top: 4px;">造訪日期：${userRecord.visitedDate}</div>` : ''}
          </div>
        ` : ''}

        <div class="port-actions">
          <button class="btn btn-secondary" onclick="focusOnMap(${spot.lat}, ${spot.lng})">在地圖定位</button>
          <button class="btn btn-secondary" onclick="toggleWiki('${currentSpotId}', '${spot.name}')">維基簡介</button>
          <button class="btn btn-primary" onclick="openCheckinModal('${currentSpotId}', '${spot.name}')">
            ${isVisited ? '修改打卡' : '新增打卡'}
          </button>
        </div>

        <!-- 維基百科動態載入容器 -->
        <div class="wiki-container" id="wiki-box-${currentSpotId}">
          <div class="wiki-loading">正在載入維基百科資料...</div>
        </div>
      </div>
    `;
  }).join('');
}

// 點擊地圖定位
function focusOnMap(lat, lng) {
  if (typeof map !== 'undefined' && map !== null) {
    map.setView([lat, lng], 13, { animate: true });
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

// 切換並載入維基百科資訊
async function toggleWiki(spotId, spotName) {
  const wikiBox = document.getElementById(`wiki-box-${spotId}`);
  if (!wikiBox) return;

  if (wikiBox.classList.contains('show')) {
    wikiBox.classList.remove('show');
    return;
  }

  wikiBox.classList.add('show');

  if (wikiBox.getAttribute('data-loaded') === 'true') {
    return;
  }

  try {
    const response = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(spotName)}`);

    if (!response.ok) {
      throw new Error('維基百科查無此條目');
    }

    const data = await response.json();
    let wikiHTML = '';

    const thumbUrl = data.thumbnail?.source || null;
    const fullUrl = data.originalimage?.source || thumbUrl;

    if (thumbUrl) {
      wikiHTML += `
        <div class="wiki-photo-box">
          <img 
            id="wiki-img-${spotId}"
            class="wiki-thumb-img" 
            src="${thumbUrl}" 
            alt="${spotName}" 
            loading="lazy"
            onclick="loadHighResImage('${spotId}', '${fullUrl}')"
          >
        </div>
      `;
    }

    const extractText = data.extract || '暫無相關維基百科摘要資訊。';
    wikiHTML += `<div class="wiki-text">${extractText}</div>`;

    wikiBox.innerHTML = wikiHTML;
    wikiBox.setAttribute('data-loaded', 'true');

  } catch (err) {
    wikiBox.innerHTML = `<div class="wiki-error">無法載入維基百科簡介 (${err.message})</div>`;
  }
}

// 點擊後替換為高畫質原圖
function loadHighResImage(spotId, fullUrl) {
  const imgElement = document.getElementById(`wiki-img-${spotId}`);
  if (!imgElement || imgElement.classList.contains('is-high-res')) return;

  imgElement.src = fullUrl;
  imgElement.classList.remove('wiki-thumb-img');
  imgElement.classList.add('is-high-res');
  imgElement.removeAttribute('title');
  imgElement.onclick = null;
}
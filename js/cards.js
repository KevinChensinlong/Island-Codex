/**
 * 島嶼圖鑑 Island Codex - 卡片渲染模組 (cards.js)
 */

function renderCards(portsData = [], userCheckins = []) {
  const cardsContainer = document.getElementById('port-list');
  if (!cardsContainer) return;

  const checkins = Array.isArray(userCheckins) ? userCheckins : [];
  const ports = Array.isArray(portsData) ? portsData : [];

  if (ports.length === 0) {
    cardsContainer.innerHTML = `<div class="no-data" style="text-align:center; padding: 20px; color: #888;">尚未載入港口資料，請確認 ports.json 是否存在。</div>`;
    return;
  }

  cardsContainer.innerHTML = ports.map(spot => {
    // 比對踩點紀錄
    const userRecord = checkins.findLast ?
      checkins.findLast(c => String(c.spotId) === String(spot.id)) :
      checkins.filter(c => String(c.spotId) === String(spot.id)).pop();
    const isVisited = !!userRecord;

    // 讀取城市資訊 (相容 city 與 region)
    const displayCity = spot.city || spot.region || '';

    return `
      <div class="port-card ${isVisited ? 'visited' : ''}" id="port-card-${spot.id}">
        <div class="port-header">
          <div>
            <div class="port-title">${spot.name}</div>
            <div class="port-city">${displayCity}</div>
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
          <button class="btn btn-secondary" onclick="toggleWiki('${spot.id}', '${spot.name}')">維基簡介</button>
          <button class="btn btn-primary" onclick="openCheckinModal('${spot.id}', '${spot.name}')">
            ${isVisited ? '修改打卡' : '新增打卡'}
          </button>
        </div>

        <!-- 維基百科動態載入容器 -->
        <div class="wiki-container" id="wiki-box-${spot.id}">
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

  // 切換顯示/隱藏
  if (wikiBox.classList.contains('show')) {
    wikiBox.classList.remove('show');
    return;
  }

  wikiBox.classList.add('show');

  // 如果已經載入過內容，不重複發送 API
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

    // 預設先讀取低流量縮圖
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

    // 簡介內文
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

  // 1. 切換網址為原圖
  imgElement.src = fullUrl;

  // 2. 移除縮圖 class，加上高畫質 class（取消 Hover 效果與手型指標）
  imgElement.classList.remove('wiki-thumb-img');
  imgElement.classList.add('is-high-res');
  imgElement.removeAttribute('title');
  imgElement.onclick = null;
}
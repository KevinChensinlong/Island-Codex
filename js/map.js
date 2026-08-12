/**
 * 島嶼圖鑑 Island Codex - 地圖模組 (map.js)
 */

let map = null;
let markersGroup = null;
let userLocationMarker = null;

// 使用 L.divIcon 自訂圓點 (Dot Marker)
const createDotIcon = (isVisited) => {
  const colorClass = isVisited ? 'visited-dot' : 'unvisited-dot';
  return L.divIcon({
    className: 'custom-map-dot',
    html: `<div class="map-dot ${colorClass}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10]
  });
};

// 初始化地圖
function initMap() {
  if (map !== null) return;

  // 1. 初始化地圖，關閉預設左上角縮放按鈕
  map = L.map('map', {
    zoomControl: false,       // 停用預設左上角縮放
    fullscreenControl: false  // 停用自動初始化
  }).setView([23.8, 120.96], 7);

  // 2. 建立 Leaflet 自訂定位控制項，讓按鈕與其他原生地圖控制項完美一體化
  const LocateControl = L.Control.extend({
    options: { position: 'bottomright' }, // 與 zoom、fullscreen 一樣放在右下角
    onAdd: function() {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      const button = L.DomUtil.create('a', '', container);
      button.href = '#';
      button.title = '定位目前位置';
      button.role = 'button';
      button.style.display = 'flex';
      button.style.alignItems = 'center';
      button.style.justifyContent = 'center';
      
      // 使用與原生按鈕相符的 SVG 圖示
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg>
      `;

      // 阻止地圖縮放點擊穿透
      L.DomEvent.disableClickPropagation(button);
      
      button.onclick = function(e) {
        e.preventDefault();
        getUserLocation();
      };

      return container;
    }
  });

  // 3. 依序加入控制項：定位 -> 縮放 -> 全螢幕 (由上而下排列)
  map.addControl(new LocateControl());

  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);

  if (L.control.fullscreen) {
    L.control.fullscreen({
      position: 'bottomright'
    }).addTo(map);
  }

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  markersGroup = L.layerGroup().addTo(map);
}

/**
 * 計算兩點經緯度之間的直線距離 (公里 km)
 */
function getSphericalDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 地球平均半徑 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 根據使用者位置找出最近的港口並更新 UI 卡片
 */
function updateNearestPortCard(userLat, userLng) {
  // 取得全域港口資料 (兼顧 AppState 或全域變數)
  const ports = (window.AppState && window.AppState.allPorts) || window.allPortsData || [];
  if (!ports || ports.length === 0) return;

  let nearestPort = null;
  let minDistance = Infinity;

  // 尋找直線距離最近的港口
  ports.forEach(spot => {
    if (spot.lat && spot.lng) {
      const dist = getSphericalDistance(userLat, userLng, Number(spot.lat), Number(spot.lng));
      if (dist < minDistance) {
        minDistance = dist;
        nearestPort = spot;
      }
    }
  });

  // 更新卡片內容
  if (nearestPort) {
    const card = document.getElementById('nearestPortCard');
    const nameEl = document.getElementById('nearestPortName');
    const descEl = document.getElementById('nearestPortDesc');
    const distEl = document.getElementById('nearestDistance');

    if (card && nameEl && descEl && distEl) {
      nameEl.textContent = nearestPort.name || '未知港口';
      
      const cityText = nearestPort.city || nearestPort.county || '';
      const townText = nearestPort.town || nearestPort.district || '';
      descEl.textContent = `${cityText} ${townText}`.trim() || '台灣區域';

      // 距離小於 1 公里顯示公尺，大於 1 公里顯示公里
      distEl.textContent = minDistance < 1 
        ? `${Math.round(minDistance * 1000)} m (直線距離)` 
        : `${minDistance.toFixed(1)} km (直線距離)`;

      card.style.display = 'block'; // 顯示卡片
    }
  }
}

/**
 * 取得使用者目前位置並將地圖定位過去
 */
function getUserLocation() {
  if (!navigator.geolocation) {
    alert('您的瀏覽器不支援定位功能');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;

      if (!map) initMap();

      // 移動地圖中心至使用者位置 (Zoom 級別 17 詳細視角)
      map.setView([latitude, longitude], 17);

      // 自訂藍點 Marker
      const userIcon = L.divIcon({
        className: 'custom-user-dot',
        html: '<div class="user-location-dot"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      // 移除先前的定位點
      if (userLocationMarker) {
        map.removeLayer(userLocationMarker);
      }

      // 標註當前位置並開啟彈窗
      userLocationMarker = L.marker([latitude, longitude], { icon: userIcon })
        .bindPopup('<b>您的位置</b>')
        .addTo(map);

      // 自動計算並顯示最近的港口卡片
      updateNearestPortCard(latitude, longitude);
    },
    (error) => {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          alert('請允許存取位置權限以進行定位');
          break;
        case error.POSITION_UNAVAILABLE:
          alert('無法取得您的目前位置');
          break;
        case error.TIMEOUT:
          alert('定位請求逾時，請重試');
          break;
        default:
          alert('定位發生未知錯誤');
          break;
      }
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// 保持原本的 renderMapMarkers 與更新 logic
function renderMapMarkers(portsData = [], userCheckins = []) {
  if (!map) initMap();
  if (!markersGroup) return;

  markersGroup.clearLayers();

  const checkins = Array.isArray(userCheckins) && userCheckins.length > 0
    ? userCheckins
    : ((window.AppState && window.AppState.checkins) || window.currentUserCheckins || []);

  const ports = Array.isArray(portsData) ? portsData : [];

  const latestCheckinMap = {};
  checkins.forEach(c => {
    const key = String(c.spotId || c.id || '');
    if (key) {
      latestCheckinMap[key] = c;
    }
  });

  ports.forEach(spot => {
    const currentSpotId = String(spot.id || spot.spotId || '');
    const userRecord = latestCheckinMap[currentSpotId];
    const isVisited = !!userRecord;

    const marker = L.marker([spot.lat, spot.lng], { 
      icon: createDotIcon(isVisited)
    });

    const displayCity = spot.city || spot.county || spot.region || '';
    const displayTown = spot.town || spot.district || '';
    const locationText = `${displayCity} ${displayTown}`.trim();

    const popupContent = `
      <div style="text-align: center; font-family: sans-serif; padding: 4px;">
        <h4 style="margin: 0 0 4px 0; font-size: 14px;">${spot.name}</h4>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">${locationText}</p>
        <span style="display:inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; color: #fff; background: ${isVisited ? '#28a745' : '#6c757d'};">
          ${isVisited ? '✓ 已踩點' : '未踩點'}
        </span>
      </div>
    `;

    marker.bindPopup(popupContent);
    markersGroup.addLayer(marker);
  });
}

window.updateMapMarkers = renderMapMarkers;

document.addEventListener('DOMContentLoaded', () => {
  initMap();
});

/**
 * 計算兩點經緯度之間的直線距離 (公里 km)
 */
function getSphericalDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 地球平均半徑 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 根據使用者位置找出最近的港口並更新 UI 卡片
 */
function updateNearestPortCard(userLat, userLng) {
  // 取得全域港口資料 (請確保 AppState.allPorts 或 window.allPortsData 存在)
  const ports = (window.AppState && window.AppState.allPorts) || window.allPortsData || [];
  if (!ports || ports.length === 0) return;

  let nearestPort = null;
  let minDistance = Infinity;

  ports.forEach(spot => {
    if (spot.lat && spot.lng) {
      const dist = getSphericalDistance(userLat, userLng, spot.lat, spot.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestPort = spot;
      }
    }
  });

  if (nearestPort) {
    const card = document.getElementById('nearestPortCard');
    const nameEl = document.getElementById('nearestPortName');
    const descEl = document.getElementById('nearestPortDesc');
    const distEl = document.getElementById('nearestDistance');

    if (card && nameEl && descEl && distEl) {
      nameEl.textContent = nearestPort.name;
      
      const cityText = nearestPort.city || nearestPort.county || '';
      const townText = nearestPort.town || nearestPort.district || '';
      descEl.textContent = `${cityText} ${townText}`.trim() || '台灣區域';

      // 距離保留一位小數
      distEl.textContent = minDistance < 1 
        ? `${Math.round(minDistance * 1000)} m ` 
        : `${minDistance.toFixed(1)} km `;

      card.style.display = 'block'; // 顯示卡片
    }
  }
}
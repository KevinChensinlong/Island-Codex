/**
 * 島嶼圖鑑 Island Codex - 地圖模組 (map.js) [Leaflet.markercluster 效能極速版]
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

// 初始化地圖 (已整合 Marker Cluster 聚合機制)
function initMap() {
  if (map !== null) return;

  // 1. 初始化地圖，開啟優雅動畫與 Canvas 渲染支援
  map = L.map('map', {
    zoomControl: false,          // 停用預設左上角縮放
    fullscreenControl: false,     // 停用自動初始化
    fadeAnimation: true,         // Popup 彈窗淡入淡出效果
    zoomAnimation: true,
    markerZoomAnimation: true,
    preferCanvas: true           // 保留高效能繪圖機制
  }).setView([23.8, 120.96], 7);

  // 2. 建立 Leaflet 自訂定位控制項
  const LocateControl = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd: function() {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      const button = L.DomUtil.create('a', '', container);
      button.href = '#';
      button.title = '定位目前位置';
      button.role = 'button';
      button.style.display = 'flex';
      button.style.alignItems = 'center';
      button.style.justifyContent = 'center';
      
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg>
      `;

      L.DomEvent.disableClickPropagation(button);
      
      button.onclick = function(e) {
        e.preventDefault();
        getUserLocation();
      };

      return container;
    }
  });

  // 3. 依序加入控制項
  map.addControl(new LocateControl());

  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);

  if (L.control.fullscreen) {
    L.control.fullscreen({
      position: 'bottomright'
    }).addTo(map);
  }

  // 4. 設定 TileLayer 快取與載入策略
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    keepBuffer: 8,            // 留在記憶體中的周圍圖塊數量
    updateWhenIdle: true,     // 滑動停止後才發送新請求，降低 CPU 與網路負擔
    updateWhenZooming: false, // 縮放過程中不重複請求中間層級圖磚
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // 5. 初始化 MarkerClusterGroup (具備平滑動畫與分區延遲渲染機制)
  if (typeof L.markerClusterGroup === 'function') {
    markersGroup = L.markerClusterGroup({
      chunkedLoading: true,        // 分段載入標記，避免大量數據造成 UI 凍結
      chunkInterval: 100,          // 每隔 100ms 處理下一批點位
      chunkDelay: 50,              // 分批渲染間隔時間
      spiderfyOnMaxZoom: true,     // 同位置重疊點位在最大縮放時蜘蛛網狀展開
      showCoverageOnHover: false,  // 滑過聚合圈時不顯示多邊形邊界（視覺更簡潔）
      zoomToBoundsOnClick: true,   // 點擊聚合圈自動放大至該區域
      maxClusterRadius: 45         // 聚合半徑 (像素)，兼顧散開細節與手機效能
    });
  } else {
    // 若套件未載入，降級回傳統 LayerGroup
    console.warn('Leaflet.markercluster 未載入，降級使用標準 L.layerGroup()');
    markersGroup = L.layerGroup();
  }

  map.addLayer(markersGroup);
}

/**
 * 計算兩點經緯度之間的直線距離 (公里 km)
 */
function getSphericalDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
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
  const ports = (window.AppState && window.AppState.allPorts) || window.allPortsData || [];
  if (!ports || ports.length === 0) return;

  let nearestPort = null;
  let minDistance = Infinity;

  ports.forEach(spot => {
    if (spot.lat && spot.lng) {
      const dist = getSphericalDistance(userLat, userLng, Number(spot.lat), Number(spot.lng));
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
      nameEl.textContent = nearestPort.name || '未知港口';
      
      if (typeof parseLocation === 'function') {
        const { county, town } = parseLocation(nearestPort);
        descEl.textContent = `${county} ${town}`.trim();
      } else {
        const rawLoc = nearestPort.city || nearestPort.county || '';
        descEl.textContent = rawLoc.length > 3 
          ? `${rawLoc.substring(0, 3)} ${rawLoc.substring(3)}` 
          : rawLoc;
      }

      distEl.textContent = minDistance < 1 
        ? `${Math.round(minDistance * 1000)} m` 
        : `${minDistance.toFixed(1)} km`;

      card.style.display = 'block';
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

      map.setView([latitude, longitude], 17);

      const userIcon = L.divIcon({
        className: 'custom-user-dot',
        html: '<div class="user-location-dot"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      if (userLocationMarker) {
        map.removeLayer(userLocationMarker);
      }

      userLocationMarker = L.marker([latitude, longitude], { icon: userIcon })
        .bindPopup('<b>您的位置</b>')
        .addTo(map);

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

// 渲染圖標邏輯 (已搭配 markerClusterGroup 的批次新增優化)
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

  const markersToAdd = [];

  ports.forEach(spot => {
    if (!spot.lat || !spot.lng) return;

    const currentSpotId = String(spot.id || spot.spotId || '');
    const userRecord = latestCheckinMap[currentSpotId];
    const isVisited = !!userRecord;

    const marker = L.marker([Number(spot.lat), Number(spot.lng)], { 
      icon: createDotIcon(isVisited)
    });

    let locationText = '';
    if (typeof parseLocation === 'function') {
      const { county, town } = parseLocation(spot);
      locationText = `${county} ${town}`.trim();
    } else {
      const displayCity = spot.city || spot.county || spot.region || '';
      const displayTown = spot.town || spot.district || '';
      locationText = `${displayCity} ${displayTown}`.trim();
    }

    const popupContent = `
      <div style="text-align: center; font-family: sans-serif; padding: 4px;">
        <h4 style="margin: 0 0 4px 0; font-size: 14px;">${spot.name || '景點'}</h4>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">${locationText}</p>
        <span style="display:inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; color: #fff; background: ${isVisited ? '#28a745' : '#6c757d'};">
          ${isVisited ? '✓ 已踩點' : '未踩點'}
        </span>
      </div>
    `;

    marker.bindPopup(popupContent);
    markersToAdd.push(marker);
  });

  // 使用 addLayers 一次性批量傳入，大幅減少重繪開銷
  if (typeof markersGroup.addLayers === 'function') {
    markersGroup.addLayers(markersToAdd);
  } else {
    markersToAdd.forEach(m => markersGroup.addLayer(m));
  }
}

window.updateMapMarkers = renderMapMarkers;

document.addEventListener('DOMContentLoaded', () => {
  initMap();
});
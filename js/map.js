/**
 * 島嶼圖鑑 Island Codex - 地圖模組 (map.js) [極簡高級感質感聚合版]
 */

let map = null;
let markersGroup = null;
let userLocationMarker = null;

// 使用 L.divIcon 自訂單一點位圓點 (Dot Marker)
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

  // 1. 初始化地圖，開啟優雅動畫與 Canvas 繪圖支援
  map = L.map('map', {
    zoomControl: false,          
    fullscreenControl: false,     
    fadeAnimation: true,
    zoomAnimation: true,
    markerZoomAnimation: true,
    preferCanvas: true           
  }).setView([23.8, 120.96], 7);

  // 2. 建立 Leaflet 定位控制項
  const LocateControl = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd: function () {
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

      button.onclick = function (e) {
        e.preventDefault();
        getUserLocation();
      };

      return container;
    }
  });

  map.addControl(new LocateControl());

  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);

  if (L.control.fullscreen) {
    L.control.fullscreen({
      position: 'bottomright'
    }).addTo(map);
  }

  // 3. 設定 TileLayer 底圖
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    keepBuffer: 8,
    updateWhenIdle: true,
    updateWhenZooming: false,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // 4. 初始化 MarkerClusterGroup 點位聚合器
  if (typeof L.markerClusterGroup === 'function') {
    markersGroup = L.markerClusterGroup({
      chunkedLoading: true,        
      chunkInterval: 100,          
      chunkDelay: 50,              
      spiderfyOnMaxZoom: true,     
      showCoverageOnHover: false,  
      zoomToBoundsOnClick: true,   
      maxClusterRadius: 60,        // 聚合半徑

      // 核心控制：若該群組點數小於 10 個，直接回傳空圖標讓它們退回獨立散開點顯示！
      disableClusteringAtZoom: 14, // 當放大到較大級別時自動解除聚合

      // 全新設計：極簡高級感毛玻璃膠囊標記 (Minimalist Pill Badge)
      iconCreateFunction: function (cluster) {
        const count = cluster.getChildCount();
        
        // 如果點數小於 10 個，透過回傳特定 class 讓 CSS 隱藏或呈現極低調風格，或直接解除聚合
        if (count < 10) {
          return L.divIcon({
            html: `<div class="subtle-cluster-pill"><span>${count}</span></div>`,
            className: 'custom-cluster-marker',
            iconSize: L.point(30, 24)
          });
        }

        return L.divIcon({
          html: `<div class="minimal-cluster-pill"><span>${count} 站點</span></div>`,
          className: 'custom-cluster-marker',
          iconSize: L.point(64, 28)
        });
      }
    });
  } else {
    markersGroup = L.layerGroup();
  }

  map.addLayer(markersGroup);
}

// （以下保留原本的計算距離、定位與渲染函式）
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
      nameEl.textContent = nearestPort.name || '未知地點';
      if (typeof parseLocation === 'function') {
        const { county, town } = parseLocation(nearestPort);
        descEl.textContent = `${county} ${town}`.trim();
      }
      distEl.textContent = minDistance < 1 ? `${Math.round(minDistance * 1000)} m` : `${minDistance.toFixed(1)} km`;
      card.style.display = 'block';
    }
  }
}

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

      if (userLocationMarker) map.removeLayer(userLocationMarker);
      userLocationMarker = L.marker([latitude, longitude], { icon: userIcon }).bindPopup('<b>您的位置</b>').addTo(map);
      updateNearestPortCard(latitude, longitude);
    },
    (error) => { alert('無法取得您的目前位置'); },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

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
    if (key) latestCheckinMap[key] = c;
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
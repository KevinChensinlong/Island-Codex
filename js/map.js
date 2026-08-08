/**
 * 島嶼圖鑑 Island Codex - 地圖模組 (map.js)
 */

let map = null;
let markersGroup = null;

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
    fullscreenControl: false  // 停用自動初始化，改由手動控制順序
  }).setView([23.8, 120.96], 7);

  // 2. 依序將按鈕加入右下角 (先加縮放，再加全螢幕，讓 + / - 在上面)
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

function renderMapMarkers(portsData = [], userCheckins = []) {
  if (!map) initMap(); // cite: 4
  if (!markersGroup) return; // cite: 4

  markersGroup.clearLayers(); // cite: 4

  const checkins = Array.isArray(userCheckins) ? userCheckins : []; // cite: 4
  const ports = Array.isArray(portsData) ? portsData : []; // cite: 4

  // 取最新一筆打卡紀錄
  const latestCheckinMap = {};
  checkins.forEach(c => {
    if (c.spotId) {
      latestCheckinMap[String(c.spotId)] = c;
    }
  });

  ports.forEach(spot => {
    const userRecord = latestCheckinMap[String(spot.id)];
    const isVisited = !!userRecord; // cite: 4

    const marker = L.marker([spot.lat, spot.lng], { 
      icon: createDotIcon(isVisited) // cite: 4
    });

    const popupContent = `
      <div style="text-align: center; font-family: sans-serif; padding: 4px;">
        <h4 style="margin: 0 0 4px 0; font-size: 14px;">${spot.name}</h4>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">${spot.city || spot.region || ''}</p>
        <span style="display:inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; color: #fff; background: ${isVisited ? '#28a745' : '#6c757d'};">
          ${isVisited ? '✓ 已踩點' : '未踩點'}
        </span>
      </div>
    `;

    marker.bindPopup(popupContent); // cite: 4
    markersGroup.addLayer(marker); // cite: 4
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initMap();
});
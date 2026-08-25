# Island-Codex

## 專案簡介
Island-Codex 是一個整理台灣漁港與臺鐵車站地理資料的工具，提供互動式地圖與查詢功能。


## 如何使用
前往網站：[Island-Codex 地圖](https://kevinchensinlong.github.io/Island-Codex/stations.html)


## 功能特色
-  整理台灣漁港與臺鐵車站資料
-  提供互動式地圖顯示
-  支援查詢與篩選功能
-  資料結構化，方便後續 GIS 或分析應用
-  可以進行打卡，走到哪記錄到哪


## 更新日誌

### [Beta 1.4] 調整與效能極速化
- 手機版 Header 響應式優化，解決窄螢幕下的按鈕溢出問題
- 導入 Canvas 硬體加速 (`preferCanvas: true`)，降低 DOM 負擔與記憶體佔用
- 地圖圖塊快取 (`keepBuffer: 8`) 避免滑動白塊
- Popup 彈窗動畫微調至 0.12s，提升互動流暢度

### [Beta 1.3] 臺鐵車站納入與資料解析
- 導入 `TR_station.json`，整合完整臺鐵車站資料庫
- 支援多路線標籤顯示（全形空格區隔）
- 重構 `parseLocation`，自動拆分縣市與鄉鎮市區，強化搜尋與 Popup 對齊

### [Beta 1.2] UI/UX 微調與頁面分離
- 重構版面與搜尋欄排版，改善手機端視覺動線
- 建立雙圖鑑架構，新增獨立 `stations.html` 頁面，避免港口與車站資料互相干擾

### [Beta 1.1]：基礎建立與港口圖鑑
- 建立基本港口圖鑑系統，實作港口卡片渲染與踩點狀態紀錄
- 開發多條件搜尋與篩選（地區、縣市、關鍵字）
- 串接維基百科資訊，自動補充港口背景與歷史介紹
- 導入 HTML5 Geolocation，自動定位並顯示「最近港口卡片」







## 安裝與開發

```bash
git clone https://github.com/KevinChensinlong/Island-Codex.git
cd Island-Codex
# 開啟 stations.html 即可在瀏覽器中查看

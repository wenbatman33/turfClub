# TURF CLUB

原生 ESM JavaScript 與 Three.js 製作的日式 3D 賽馬遊戲。瀏覽器直接載入原始碼，不需要安裝依賴或執行 build。

[線上遊玩](https://wenbatman33.github.io/turfClub/)

## 本機啟動

```sh
node scripts/serve.mjs 8770
```

開啟 <http://localhost:8770>。`npm run dev` 是相同的靜態伺服器指令。請透過 HTTP 開啟，勿直接雙擊 HTML。

GitHub Pages 使用 **Deploy from a branch → main → / (root)**。入口的 import map 指向本地 `vendor/three/`；模型、圖片和音效採相對路徑，支援 `/turfClub/` 子目錄。`.nojekyll` 停用 Jekyll。

## 遊玩內容

- 12 匹虛構賽馬與騎師；賽前狀態、近期名次、能力、腳質和 360° 馬匹檢視。
- 單勝、複勝、馬連、馬單、位置連贏、三連複、三連單、框連；使用虛擬點數與固定模擬賠率。
- 2,200 公尺完整賽事、漸進搶位、六個轉播鏡位、自動導播、暫停、快轉和重播。
- 慢動作跑姿、平滑馬身高度、真馬草地錄音。
- 終點攝影審視、3D 頒獎與舉盃、可下載的冠軍日報。
- 繁體中文介面、桌面與手機操作、點數保存和未完成賽事退款。

## 專案結構

| 位置 | 用途 |
| --- | --- |
| `index.html` | 頁面入口與 ESM import map |
| `src/` | 遊戲、介面、3D 場景、音效與樣式 |
| `public/assets/` | 遊戲實際使用的模型、圖片、音效與貼圖 |
| `vendor/three/` | 必要的 Three.js 瀏覽器模組及 MIT 授權 |
| `assets/source/` | 可編輯 Blender 檔、原始馬模型與現用錄音來源 |
| `assets/` 的文件 | 素材授權、圖像 prompts、步態說明與執行資產清單 |
| `scripts/` | 靜態伺服器及素材重製腳本 |
| `tests/` | 模擬、動畫與瀏覽器驗證 |

馬匹貼圖已內嵌於 Blender 檔，不另留重複貼圖。大型樹木下載原檔只在重建時取得；遊戲直接使用現有 GLB。

## 驗證

單元測試不需要 npm 安裝：

```sh
npm test
```

瀏覽器測試才需要安裝開發工具：

```sh
npm ci
npm run test:browser
npm run test:gait
npm run test:pages
```

- 前兩個瀏覽器測試預設使用本機 `8770`；Pages 測試預設檢查線上網站。可用 `TEST_URL` 覆寫。
- 預設使用 macOS Google Chrome；`test:browser` 和 `test:pages` 可用 `CHROME_PATH` 指定執行檔。
- 截圖及報告寫入系統暫存目錄下的 `turf-club-tests/`；可用 `TURF_TEST_OUTPUT` 指定位置。
- 手機檢查採 Chrome 觸控模擬，不等同實體手機效能測試。

## 素材重製

`scripts/prepare-*.py` 以 Blender 執行；`prepare-audio.py` 使用 Python 與 ffmpeg。樹木重製順序是 `fetch-assets.py` → `optimize-tree.py`，會另下載約 905 MB 原檔。這些工具只用於編輯素材，遊戲執行不需要它們。

[素材來源與授權](assets/ASSETS.md) · [圖像 prompts](assets/IMAGE_PROMPTS.md) · [步態說明](assets/GAIT_REVIEW.md)

本作不是 JRA 官方產品，也不是指定賽場的精確重建。所有賽果、狀態與賠率均為模擬；没有現金投注、真實彩池、多人連線或即時賽事資料。

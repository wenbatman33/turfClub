# 素材與授權

本專案為原創日式賽馬遊戲，不是 JRA 官方產品。馬名、騎師姓名、狀態、賠率與比賽結果皆為虛構。沒有下載或再散布 JRA 影片、轉播音樂或官方商標。

## 第三方素材

| 執行檔案 | 來源與作者 | 授權 | 本專案的處理 |
| --- | --- | --- | --- |
| `public/assets/models/racehorse.glb` | [Rigged Horse](https://opengameart.org/content/rigged-horse)，Lyndon Daniels（模型 / 貼圖）、ChadM（骨架） | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | 修復鬃毛、尾巴、眼睛綁定，網格細分、PBR 材質轉換、原創 Idle / Gallop 動畫、尺寸正規化及 GLB 匯出；執行期使用毛色變體 |
| `public/assets/models/pine-web.glb` | [Pine Tree 01 / Poly Haven](https://polyhaven.com/a/pine_tree_01) | CC0 | 保留一棵樹並製作遠景低細節版本，縮小貼圖 |
| `public/assets/textures/sky.hdr` | [Kloppenheim 06 Pure Sky / Poly Haven](https://polyhaven.com/a/kloppenheim_06_puresky) | CC0 | 1K HDR 環境照明與天空 |
| `public/assets/textures/leather-normal.jpg` | [Brown Leather / Poly Haven](https://polyhaven.com/a/brown_leather) | CC0 | 騎師靴子與馬具材質，另嵌入騎師 GLB |
| `public/assets/textures/fabric-normal.jpg` | [Denim Fabric / Poly Haven](https://polyhaven.com/a/denim_fabric) | CC0 | 弱化法線作為競賽服織物細節，另嵌入騎師 GLB |
| `public/assets/fonts/helvetiker_regular.typeface.json` | [Three.js fonts](https://github.com/mrdoob/three.js/tree/dev/examples/fonts)，Helvetiker / Typeface.js / Magenta | 字型檔內附授權資訊 | 3D 號碼布、閘門與場內標示 |

Poly Haven 素材授權：[Poly Haven license](https://polyhaven.com/license)。程式使用 Three.js（MIT），原始套件授權由 npm 套件保留。

## 原創素材

- `public/assets/models/jockey.glb`：本專案製作的完整立體騎師、競賽服、安全帽、護目鏡、靴子、馬鞍、韁繩與馬具。可編輯版本位於 `assets/source/jockey.blend`。
- `public/assets/models/spectator.glb`：騎師原創網格衍生的遠景觀眾 LOD；以實例繪製降低開銷。
- 賽道、看台、白色欄杆、起跑閘、終點柱與資訊看板：真正的 3D 幾何場景，建立於 `src/scene.js`；不使用 Phaser Graphics、Canvas 2D 或 SVG 製作遊戲素材。
- 音效：原合成蹄聲已移除，現用 Joseph Sardin CC0 真馬草地疾馳錄音，見下方來源。

## AI 圖像素材

以下素材透過 **內建 imagegen 工具** 產生，已複製到專案內，不依賴 Codex 的暫存路徑。完整 prompts 見 [IMAGE_PROMPTS.md](IMAGE_PROMPTS.md)。

- `public/assets/images/racing-hero.png`：日式賽馬主視覺。介面已標示 AI 生成，並非實際遊戲截圖。
- `public/assets/textures/turf.png`：草地色彩貼圖，執行期以材質調整飽和度。
- `public/assets/textures/zelkova.png`：帶透明通道的櫸樹；用於遠景植被平面，與 3D 松樹搭配。馬匹、騎師、賽道與建築仍為實際 3D 網格。

## 來源檔與重製

- `assets/source/riggedHorse.blend`：取得的原始 CC0 馬匹。
- `assets/source/racehorse.blend`：包含 Idle / Gallop 動畫的可編輯工作檔。
- `assets/source/jockey.blend`：原創騎師工作檔。
- `scripts/fetch-assets.py`：下載 Poly Haven 來源檔；原始樹木檔約 905 MB，非遊戲執行需求，已由 `.gitignore` 排除。
- `scripts/prepare-horse.py`、`scripts/prepare-rider.py`、`scripts/prepare-crowd.py`、`scripts/optimize-tree.py`：Blender 匯出與最佳化腳本。
- `assets/manifest.json`：執行期資產的位元組數、SHA-256 與 GLB 網格 / 動畫資訊。

## 參考範圍

競猜判定參考 [JRA 官方馬券說明](https://www.jra.go.jp/kouza/beginner/baken/)。本遊戲是固定模擬賠率，不是實際彩池投注系統。

使用者提供的影片：<https://www.youtube.com/watch?v=BU7J3UJR-bo>。影片頁面讀取失敗，未宣稱逐鏡檢視或精確重製影片。場景使用日本賽場視覺元素，比例與動線為遊戲設計，並非中山競馬場測繪模型。

### 2026-09-15：步態與頒獎更新

`racehorse.glb` 的 Gallop 改為雙關節蹄部軌跡解算，33 幀四拍週期、支撐蹄高度修正；保留原始 CC0 模型署名。程式 `scripts/prepare-horse.py` 可重建。

新增 `public/assets/models/ceremony.glb`：本專案原創立姿騎師、雙手舉盃動畫、金盃、三級頒獎台、圓形舞台與背板。使用既有織物／皮革法線貼圖。可編輯來源為 `assets/source/ceremony.blend`，重建程式為 `scripts/prepare-ceremony.py`。

終點攝影與紀念日報的照片直接由當場 WebGL 場景擷取，沒有使用 AI 圖片替代實際賽果。紀念日報是可離線開啟的單檔 HTML。

### 真馬草地疾馳錄音

- 作者：Joseph SARDIN，CC0。
- 來源：https://bigsoundbank.com/horse-gallop-tall-grass-s1850.html
- 原檔：https://bigsoundbank.com/UPLOAD/mp3/1850.mp3
- 原錄音 36.52 秒；來源描述為真馬在高草地疾馳，MixPre-3、Neumann KM 184 立體聲收音。
- 來源檔：`assets/source/audio/horse-grass-1850.mp3`。
- 遊戲檔：`public/assets/audio/horse-grass.mp3`；截取 3–33 秒，首尾 1 秒交叉淡化形成 29 秒循環，65 Hz 高通去除低頻隆隆聲。保留原音高與自然節奏。
- 播放方式是持續的現場錄音音景，不宣稱與每一隻動畫馬逐蹄同步。快轉不提高音高，暫停、關閉音效與比賽結束會淡出。
- 舊的人類沙地腳步擬音已停止使用。

### 跑姿分解參考

使用者提供 https://andyeee.blogspot.com/2010/12/blog-post_17.html 的 Muybridge 連拍與跑姿分解圖，已實際檢视。僅作動作研究，未納入遊戲素材。前後腿採不同回收路徑，後腿→前腿依序支撐後保留收腿騰空；小腿維持剛性蒙皮。

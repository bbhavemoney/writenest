# WriteNest

WriteNest 是一個面向學生、小說作者與長篇文字創作者的前端寫作工作台。它不是 AI 代寫工具，而是幫助使用者整理文章、角色、關係圖、靈感詞語與排版流程的本地化編輯工具 demo。

## 核心功能

- Dashboard：查看今日寫作字數、最近編輯、收藏詞語、快速備份與靈感提示。
- 富文本 Editor：使用 Tiptap 編輯文章，支援標題、粗體、斜體、列表、引用與分隔線。
- 本地資料儲存：使用 localForage / IndexedDB 保存 projects、documents、characters、relationships、savedWords，刷新後資料不會消失。
- 模糊找詞：使用本地詞庫依詞語、意思、標籤與語氣搜尋，支援複製、收藏與插入文章。
- 角色資料庫：新增、編輯、刪除角色，並快速複製或插入角色全名與暱稱。
- 角色關係圖：使用 React Flow 顯示角色節點與關係線，支援拖動節點、建立關係、修改標籤與顏色。
- 自動排版：提供論文模式與小說模式，可依勾選項目整理章節、對話換行、空行與角色名高亮。
- 匯出與備份：文章可匯出為 TXT / MD，整個 project 可匯出或匯入 JSON 備份。

## 使用方法

安裝依賴：

```bash
npm install
```

啟動本地開發伺服器：

```bash
npm run dev
```

預設會在本機提供 Vite 開發網址，例如：

```text
http://127.0.0.1:5173/
```

建立 production build：

```bash
npm run build
```

本地預覽 production build：

```bash
npm run preview
```

## 技術棧

- React 19
- Vite 7
- Tiptap
- React Flow
- localForage / IndexedDB
- lucide-react
- CSS Grid / Flexbox

## 部署說明

本專案是純前端 Vite app，可部署到 Vercel、Netlify 或任何支援靜態網站的服務。

Vercel 建議設定：

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

本地儲存功能使用瀏覽器 IndexedDB。部署後資料會保存在使用者自己的瀏覽器中，不需要登入、後端或雲端資料庫。

## 未來可擴充功能

- 多作品 / 多 project 管理與切換。
- 雲端同步與登入系統。
- 更完整的版本歷史與草稿還原。
- 關係圖右側 inspector 與節點詳細編輯。
- 更進階的模糊找詞與語意搜尋。
- 匯出 PDF / DOCX。
- 自動排版規則自訂。
- 協作與評論功能。


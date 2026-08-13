# LINE 靜態貼圖輸出規格

依 LINE Creators Market 官方貼圖指南，靜態貼圖主圖為 240 × 240 px，貼圖圖片最大為 370 × 320 px，聊天縮圖為 96 × 74 px；全部使用 PNG、透明背景，寬高應為偶數，單檔上限 1 MB，整組 ZIP 上限 60 MB。

本專案將「標籤圖」視為與聊天縮圖相同規格的工作副本，於 ZIP 中同時輸出 `chat-thumbnail.png` 與 `sticker-label.png`，方便使用者依上架流程取用。貼圖、主圖、聊天縮圖與標籤圖皆由同一張角色素材自動縮放、置中並保留透明背景。

來源：
- https://creator.line.me/en/guideline/sticker/

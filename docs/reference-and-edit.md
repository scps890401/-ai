# 語義 Reference 與 Image Editing

生成 API 現在可接收最多四張具角色的 reference context：`character`、`style`、`pose`、`scene`、`current`。Router 會依 priority 排序；prompt 明確指示角色圖只保留身份、姿勢圖只控制身體姿勢、風格圖只控制線條／色彩／渲染、場景圖只控制道具／構圖、current 圖只延續編輯結果，避免把不同角色錯誤混合。

對話中的「第 N 張」仍只操作目標 job。圖片修改、品質修正與回復版本會保存成新 asset／version；原版本不被覆寫。Character Anchor 與 Style Anchor 保持分離：前者優先保留臉部、毛色、比例與配件，後者只影響畫風、配色、陰影與構圖。

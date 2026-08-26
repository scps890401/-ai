# Character Anchor 與 Style Anchor

Character Profile 是從使用者原始照片建立的 visual bible，保存物種／身份、外觀、服裝、配件、比例、保留特徵與負面限制。Reference Priority 不會把多張不同角色照片自動混在一起：每一個 job 的原始素材永遠是第一參考；只有使用者明確採納的已接受生成圖或 Style Anchor 才加入後續參考集。

優先順序是：**目標 job 原圖 → 已確認 Character Anchor → Style Anchor → 當前修改圖**，最多四張。使用者可以說「把第 2 張當成角色參考」或「我喜歡第 3 張，以後全部照這個風格」。此狀態會寫進 snapshot，後續生成、指定修改與單張重試均使用同一選擇器。

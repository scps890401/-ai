# 品質檢查與重試策略

品質 Agent 分成兩層。第一層 deterministic gate 先檢查 PNG 與單檔 1 MB 預算；這些明確不合格的檔案不應消耗 vision LLM 成本。第二層在 asset 可用時以 vision LLM 檢查角色一致性、動作／構圖、額外肢體或畸形、圖內亂碼／文字與貼圖主體清晰度。

| 結論 | 系統行為 |
| --- | --- |
| `pass` | 記錄通過，保留資產與版本 |
| `retry` | 顯示問題與只針對該張的修改建議；使用者或未來 policy 可觸發單張重試 |
| `review` | 不確定的美感／語義問題交由使用者確認，不擅自毀掉成果 |
| `unavailable` | 語義品質服務不可用時不影響貼圖保存；LINE deterministic preflight 仍在匯出時執行 |

品質檢查結果寫回 client snapshot，讓續作後仍能看到哪一張需要處理。

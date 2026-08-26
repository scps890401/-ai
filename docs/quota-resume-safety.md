# 額度、續作與安全

外部 image provider 可能回傳 `usage exhausted`、quota 或 spend limit。這類錯誤不是短暫網路錯誤，因此 Router 不會無止盡重試或偷偷換到需要額外付費的外部模型。系統保存專案、對話、角色設定、計畫、job state、已完成 asset、version、品質狀態與 ZIP export，並把專案標記為可 resume。

使用者輸入「繼續製作」時，只會找出未完成／失敗／retrying position；已完成圖片不會重做。所有 LLM 與 image 呼叫均在伺服器端執行，S3 asset metadata 以 project owner／guest key 授權限制存取；使用者 API key 不寫入前端、程式碼或 chat history。

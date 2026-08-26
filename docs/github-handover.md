# GitHub 交接：`scps890401/-ai`／`chat-first-studio`

交接步驟如下：先建立或切換 GitHub 遠端 `scps890401/-ai`，然後將目前完整專案推送到 `chat-first-studio` 分支。交接完成後以 `git ls-remote --heads origin chat-first-studio` 驗證遠端 ref，以 `gh api repos/scps890401/-ai/branches/chat-first-studio` 驗證分支存在。

同步內容必須包含原始碼、`drizzle` schema／migration、測試、文件與 package lock；不得提交 `.env`、S3 bytes、使用者上傳檔、資料庫 dump 或任何 API key。若目標 repository 不存在或名稱含有 GitHub 不支援的字元，交接程序會停止並回報實際 GitHub 回應，而不偽造遠端同步成功。

# 對話修改與版本回復

Planner 會辨識 `targetPositions`；例如「第 3 張的小貓多一隻腳」只會建立 position 3 的 edit job。每次保存新 generated asset 時，structured sync 只要偵測 `assetId` 改變，就會建立 `sticker_job_versions` 記錄。

使用者可以在聊天說「查看第 3 張版本歷程」或「回復第 3 張 V2」。回復 procedure 會驗證專案擁有權、job position、version 所屬 job 與 asset 所屬 project，再更新目標 job 的 `currentAssetId`。其他 job、資產與版本不會被改動。

# Sticker Muse 第三階段能力矩陣

更新日期：2026-08-26。判定原則是以可執行程式、可保存狀態與自動測試為準；UI 或文件存在但沒有實際資料流者不列為完成。

| 第三階段要求 | 目前狀態 | 可驗證證據／下一步 |
| --- | --- | --- |
| Provider Adapter：generate／edit／analyze／healthCheck | **PARTIALLY IMPLEMENTED** | 既有 router 有 generate／edit、錯誤分類與 health cooldown；需補上正式 adapter interface、analyze／healthCheck 與 provider audit |
| 自動模型選擇與 fallback | **PARTIALLY IMPLEMENTED** | 會依 generate／edit、健康度與錯誤類別選內建模型；需補加 reference roles、批量／品質權重與 job audit |
| 真實外部 Gemini／FLUX | **NOT IMPLEMENTED** | 沒有專案憑證；不會宣稱 provider 可呼叫。Adapter 可先完成，啟用需 secret 與 E2E |
| 語義 Reference Roles | **PARTIALLY IMPLEMENTED** | Character／Style Anchor 已保存與進入多參考圖；需把 Pose／Scene／Current 明確化並由 planner／router 選取 |
| Character／Style Anchor | **IMPLEMENTED** | `referenceAnchors.ts`、snapshot、重試／生成 reference 選擇已覆蓋；需補完整 metadata audit |
| Image Editing Agent | **PARTIALLY IMPLEMENTED** | target position、文字／動作修改、版本回復已可用；需依問題類型選 generate／edit／reference workflow 的決策證據 |
| Quality → Fix → Check | **PARTIALLY IMPLEMENTED** | deterministic + vision quality contract 與結果保存已存在；需將可確定問題接到有限自動修正循環 |
| 中文文字可靠性 | **IMPLEMENTED** | LINE export Canvas 繪字、驗證與 ZIP preflight 已存在；圖內 AI 文字仍不作為正式結果依據 |
| 版本歷程與回復 metadata | **PARTIALLY IMPLEMENTED** | job versions／目標 job 回復已可用；需保存 prompt／reference／provider／quality audit metadata |
| Quota resume | **IMPLEMENTED** | paused、snapshot、next position、聊天「繼續製作」已實作；實圖 E2E 依服務額度而定 |
| `/preview` 與 `/preview/inspection` | **NOT IMPLEMENTED** | 本輪須建構只讀固定 demo，不碰私有專案、API key 或真實生成 |
| Secret scanning | **NOT IMPLEMENTED** | 本輪需建立掃描腳本／測試與公開 preview 安全邊界 |

## 明確邊界

外部 API 憑證與實圖供應者額度不是可用假資料替代的項目。第三階段會完成 adapter、選擇、record、preview 與測試契約；只有使用者安全提供並啟用實際 provider key 後，才可把 Gemini／FLUX 標記為 **IMPLEMENTED**。

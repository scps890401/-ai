import { CheckCircle2, ChevronRight, Eye, FileWarning, Gauge, ImagePlus, Info, Play, RotateCcw, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { StudioAgentWorkspace, StudioComposer, StudioDemoExport, StudioMessage, StudioPreflight, StudioStickerTask, StudioTopbar, type SharedAttachment } from "@/components/StudioSharedUI";
import "../chat-studio.css";
import "../preview-demo.css";

const demoRabbit = "/manus-storage/preview-demo-rabbit_4aabab59.png";
const phrases = ["早安", "謝謝", "收到", "加油", "等等我", "好累喔", "太好了", "晚安"];
const scenes = ["元氣揮手", "雙手合十", "修正為正常四肢", "握拳鼓勵", "小跑揮手", "抱枕打呵欠", "開心跳起來", "抱著月亮"];
const previewAttachments: SharedAttachment[] = [
  { id: "character", name: "兔兔角色.png", preview: demoRabbit, role: "Character Reference · 已接受" },
  { id: "pose", name: "跳躍姿勢.heic", preview: demoRabbit, role: "Pose Reference · HEIC → JPEG" },
  { id: "style", name: "粉彩畫風.webp", preview: demoRabbit, role: "Style Reference · 已更新" },
];
type DemoStage = "request" | "analysis" | "generating" | "edited" | "anchors" | "quality" | "quota" | "export";

const stageSteps: Array<{ id: DemoStage; label: string }> = [
  { id: "request", label: "對話需求" }, { id: "analysis", label: "理解與 Anchor" }, { id: "generating", label: "生成 8 張" }, { id: "edited", label: "修改 V2" }, { id: "anchors", label: "姿勢與風格" }, { id: "quality", label: "品質修正" }, { id: "quota", label: "Quota／續作" }, { id: "export", label: "LINE 輸出" },
];

function Notice({ text }: { text: string }) {
  return <div className="preview-notice" role="status"><Info size={15} />{text}</div>;
}

function DemoConversation({ stage }: { stage: DemoStage }) {
  const index = stageSteps.findIndex((item) => item.id === stage);
  return <div className="message-list preview-message-list">
    <StudioMessage role="user"><p>我想製作 LINE 貼圖</p></StudioMessage>
    <StudioMessage role="assistant"><p>可以！請告訴我角色、想要的動作與文字。如果你沒有特別想法，我也可以直接幫你規劃。</p></StudioMessage>
    {index >= 1 && <><StudioMessage role="user" attachments={previewAttachments.slice(0, 2)}><p>這是我的兔子，請做成可愛日常貼圖。</p></StudioMessage><StudioMessage role="assistant"><p>我已分析示範角色：白色兔子、粉彩比例與圓潤輪廓。已建立 <b>Character Anchor</b>，並把姿勢參考分開保存。</p></StudioMessage></>}
    {index >= 2 && <StudioMessage role="assistant"><p>我已規劃 8 張貼圖，正在逐張生成、透明化與檢查。每一張都有獨立狀態與版本。</p></StudioMessage>}
    {index >= 3 && <><StudioMessage role="user"><p>第3張多一隻腳</p></StudioMessage><StudioMessage role="assistant"><p>已只修改第 3 張，保留其他貼圖不變。第 3 張現在是 <b>V2</b>。</p></StudioMessage></>}
    {index >= 4 && <><StudioMessage role="user"><p>用這張圖片的姿勢，但保留我的兔子。</p></StudioMessage><StudioMessage role="assistant"><p>已套用 <b>Character Reference + Pose Reference</b>，角色與姿勢會分別傳入下一張貼圖。</p></StudioMessage><StudioMessage role="user"><p>我喜歡這個風格，以後全部照這個。</p></StudioMessage><StudioMessage role="assistant"><p><b>Style Anchor 已更新</b>，後續計畫會優先沿用這個風格。</p></StudioMessage></>}
    {index >= 5 && <StudioMessage role="assistant"><p>Quality Check：第 6 張安全邊距未通過 → Auto Fix 一次 → Regenerate → <b>Pass</b>。語意肢體檢查只有在實際視覺模型執行時才會標示結果。</p></StudioMessage>}
    {index >= 6 && <StudioMessage role="assistant"><p>Quota exhausted → <b>Checkpoint saved</b>。已完成圖、Anchor、版本與未完成工作均已保存；輸入「繼續製作」會從未完成項目續跑。</p></StudioMessage>}
    {index >= 7 && <StudioMessage role="assistant"><p>LINE Preflight Check 已完成：PNG、透明背景、安全邊距與繁中後製均已檢查。可下載單張 PNG 或整套 ZIP。</p></StudioMessage>}
  </div>;
}

function DemoWorkspace({ embedded = false }: { embedded?: boolean }) {
  const [stage, setStage] = useState<DemoStage>("export");
  const [input, setInput] = useState("我想製作 LINE 貼圖");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(2);
  const stageIndex = stageSteps.findIndex((item) => item.id === stage);
  const completed = stageIndex < 2 ? 0 : stageIndex === 2 ? 5 : 8;
  const scriptRows = useMemo(() => phrases.map((phrase, index) => ({ position: index + 1, phrase, emotion: phrase, imageUrl: completed > index ? demoRabbit : undefined, status: completed > index ? "completed" : index === completed ? "generating" : "queued", version: index === 2 && stageIndex >= 3 ? "V2" : "V1" })), [completed, stageIndex]);
  const pushStage = (next: DemoStage, message: string) => { setStage(next); setNotice(message); };
  const sendDemo = () => {
    if (input.includes("第3") || input.includes("第 3")) pushStage("edited", "Demo 已將第 3 張切換為 V2，未呼叫影像 API。");
    else if (input.includes("姿勢")) pushStage("anchors", "Demo 已展示 Character + Pose Reference 的語意分工。");
    else if (input.includes("風格")) pushStage("anchors", "Demo 已更新固定 Style Anchor 顯示。");
    else if (input.includes("繼續")) pushStage("export", "Demo 已展示 checkpoint resume 後的完成狀態。");
    else pushStage("analysis", "Demo 已進入角色分析與貼圖規劃；不會建立真實專案。");
  };
  const workspace = <section className="chat-layout preview-chat-layout"><div className="conversation-column"><DemoConversation stage={stage} /><StudioAgentWorkspace demo title={stageIndex >= 2 ? `${completed} / 8 張完成` : "從一句話、圖片或檔案開始"} copy={<p>固定 Demo 資料展示角色理解、貼圖規劃與可續作任務；所有操作只更新這個頁面的記憶體狀態。</p>} health={[{ label: "Gemini", status: "healthy" }, { label: "GPT Image", status: "healthy" }, { label: "FLUX.2", status: "disabled" }]} onAttach={() => pushStage("analysis", "已顯示唯讀角色／姿勢／風格附件，不會上傳。") } onPlan={(count) => pushStage("generating", `Demo 已規劃 ${count} 張；畫面固定展示前 8 張任務。`)} onPackEdit={() => { setInput("全部變可愛一點"); pushStage("edited", "Demo 已建立每張獨立 edit job 與版本。") }} onResume={() => pushStage("export", "Demo 已從 checkpoint 續作剩餘項目。")} />
      <div className="demo-workflow-actions" aria-label="Demo 工作流程操作"><button onClick={() => pushStage("analysis", "AI 自動規劃：已建立 Character Anchor、Style Anchor 與 Sticker Plan。") }><WandSparkles size={14} />AI 自動規劃</button><button onClick={() => pushStage("generating", "開始製作：正在生成 8 張獨立貼圖。") }><Play size={14} />開始製作</button><button onClick={() => pushStage("quality", "Quality Check：第 6 張 Fail → Auto Fix → Regenerate → Pass。") }><RotateCcw size={14} />查看品質循環</button><button onClick={() => pushStage("quota", "Quota exhausted：Checkpoint saved，可點擊繼續製作。") }><FileWarning size={14} />Quota checkpoint</button></div>
      <StudioComposer demo ariaLabel="示範聊天輸入" value={input} onChange={setInput} onSend={sendDemo} onAttach={() => pushStage("analysis", "示範附件已展開；不會開啟檔案選擇器或傳送檔案。")} attachments={previewAttachments} />
    </div><aside className="task-panel"><div className="task-panel-head"><div><span className="eyebrow">STICKER TASKS</span><h2>Demo 製作進度</h2></div><StudioDemoExport onPng={() => setNotice("Demo PNG：僅展示下載操作，未建立檔案。")} onZip={() => pushStage("export", "Demo LINE ZIP：僅展示 Preflight 與匯出操作，未建立檔案。")} /></div><StudioPreflight demo total={8} completed={completed} transparent={completed} safeMargin={stageIndex >= 5 ? completed : Math.max(0, completed - 1)} exportReady={stageIndex >= 7} />
      {stageIndex >= 1 && <section className="reference-tray"><div className="reference-tray-head"><span>參考圖錨點</span><small>Character／Pose／Style</small></div><div className="reference-list">{previewAttachments.map((attachment) => <article className="reference-card accepted_character" key={attachment.id}><img src={attachment.preview} alt="固定示範兔子" /><div><strong>{attachment.role}</strong><div className="reference-actions"><button onClick={() => pushStage("anchors", "Character Reference 已固定為兔子。")}>角色</button><button onClick={() => pushStage("anchors", "Pose Reference 已獨立套用。")}>姿勢</button><button onClick={() => pushStage("anchors", "Style Anchor 已更新。")}>風格</button></div></div></article>)}</div></section>}
      <div className="task-grid">{scriptRows.map((script) => <StudioStickerTask key={script.position} position={script.position} phrase={script.phrase} emotion={scenes[script.position - 1]} imageUrl={script.imageUrl} status={script.status} router={script.position === 3 && stageIndex >= 3 ? "GPT Image edit" : "Gemini → GPT Image"} quality={script.position === 6 && stageIndex >= 5 ? "Fix → Pass" : "透明已檢查"} versionLabel={script.version} demo onEdit={() => { setSelected(script.position - 1); setInput(`第 ${script.position} 張請修改：`); pushStage("edited", `Demo 已開啟第 ${script.position} 張的 V2 修改。`); }} onRetry={() => pushStage("generating", `Demo 正在重試第 ${script.position} 張。`)} onDownload={() => setNotice(`Demo 第 ${script.position} 張 PNG：僅展示下載操作。`)} onVersion={() => { setSelected(script.position - 1); pushStage("edited", `Demo 已切換第 ${script.position} 張版本列。`); }} />)}</div>
      <div className="preview-selected-note"><Gauge size={14} />目前聚焦：第 {selected + 1} 張「{phrases[selected]}」；{selected === 2 && stageIndex >= 3 ? "V2 已修正多餘肢體。" : "可由修改、重新生成、下載與版本按鈕操作。"}</div>
    </aside></section>;
  if (embedded) return <div className="embedded-demo">{workspace}</div>;
  return <main className="chat-studio-shell preview-shell"><StudioTopbar demo /><Notice text="DEMO / PREVIEW · 這是 AI Inspection Preview，不代表真實 AI API 生成結果。固定 Demo 資料不登入、不上傳、不呼叫 Provider。" />{workspace}{notice && <Notice text={notice} />}<footer className="preview-footer"><span><ShieldCheck size={15} />公開唯讀 UI 驗收：所有操作皆為本機示範狀態</span><Link href="/preview/inspection">開啟 Inspection <ChevronRight size={15} /></Link></footer></main>;
}

function Inspection() {
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  return <main className="chat-studio-shell inspection-shell"><StudioTopbar demo /><Notice text="DEMO / PREVIEW · 這是 AI Inspection Preview，不代表真實 AI API 生成結果。Inspection 不讀取登入、專案、API Key 或真實 Provider。" /><section className="inspection-intro"><span className="eyebrow">AI / DEVELOPER INSPECTION</span><h1>以正式工作室元件檢查完整流程。</h1><p>切換 Desktop 或 Android 容器，即可直接檢視同一套 Chat、Composer、任務、版本、品質、配額與 LINE Preflight UI。所有資料皆固定且本機渲染。</p><div className="inspection-switch" role="group" aria-label="Inspection 視圖"><button className={view === "desktop" ? "active" : ""} onClick={() => setView("desktop")}>Desktop View</button><button className={view === "mobile" ? "active" : ""} onClick={() => setView("mobile")}>Mobile View</button></div></section><section className={`inspection-device ${view}`} aria-label={`${view} demo workspace`}><DemoWorkspace embedded /></section><section className="inspection-details"><article><h2>Selected Model／Fallback</h2><p>固定展示：Gemini 生成 → GPT Image 去背／修改；FLUX.2 因憑證未設定而 disabled。真實 health 僅在主工作室的安全查詢中取得。</p></article><article><h2>Quality Check／Retry</h2><p>固定流程：Fail → Auto Fix（一次上限）→ Regenerate → Pass。未執行視覺分析時不宣稱臉部或肢體語意已通過。</p></article><article><h2>Quota／Resume／Export</h2><p>固定流程：Quota exhausted → Checkpoint saved → Resume；LINE Preflight 顯示 PNG、透明背景、安全邊距、繁中後製與 ZIP。</p></article></section><div className="inspection-footer"><Link href="/preview">回到互動 Preview</Link><Link href="/">主工作室</Link></div></main>;
}

export default function Preview({ inspection = false }: { inspection?: boolean }) {
  return inspection ? <Inspection /> : <DemoWorkspace />;
}

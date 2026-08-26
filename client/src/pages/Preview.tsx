import { ArrowLeft, CheckCircle2, ChevronRight, Download, Eye, FileArchive, ImageIcon, Images, LoaderCircle, MessageSquareText, Paperclip, Play, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import "../preview-demo.css";

const demoRabbit = "/manus-storage/preview-demo-rabbit_4aabab59.png";

const demoScripts = [
  ["早安", "元氣揮手"], ["謝謝", "雙手合十"], ["收到", "俐落點頭"], ["加油", "握拳鼓勵"],
  ["等等我", "小跑揮手"], ["好累喔", "抱枕打呵欠"], ["太好了", "開心跳起來"], ["晚安", "抱著月亮"],
];

const demoEvents = [
  ["分析 3 張參考圖", "已完成", "done"],
  ["建立 Character Anchor", "已確認", "done"],
  ["規劃 8 張日常貼圖", "已完成", "done"],
  ["生成與品質檢查", "7 / 8 完成", "working"],
] as const;

export default function Preview({ inspection = false }: { inspection?: boolean }) {
  const [step, setStep] = useState(3);
  const [selected, setSelected] = useState(2);
  const [version, setVersion] = useState<1 | 2>(2);
  const [showRepair, setShowRepair] = useState(false);
  const [message, setMessage] = useState("幫我把這隻兔子做成 8 張可愛的繁體中文 LINE 貼圖");
  const activeStep = Math.min(step, 3);

  if (inspection) {
    return (
      <main className="preview-shell inspection-shell">
        <header className="preview-header">
          <Link href="/preview" className="preview-back"><ArrowLeft size={16} /> 回到 Preview</Link>
          <span className="preview-mode"><ShieldCheck size={15} /> 唯讀 Inspection</span>
        </header>
        <section className="inspection-hero">
          <span className="eyebrow">驗收展示，不連線外部模型</span>
          <h1>貼圖 Agent 的可檢查工作鏈</h1>
          <p>此頁只呈現固定示範狀態，用於檢視路由、Anchor、品質結果及 LINE 輸出前置檢查；不讀取登入資料、專案資料或 API 金鑰。</p>
        </section>
        <section className="inspection-grid">
          <article className="inspect-card"><h2>Provider Router</h2><dl><div><dt>Gemini 3.1 Flash Image</dt><dd className="state-good">可用於多參考生成</dd></div><div><dt>GPT Image 2</dt><dd className="state-good">可用於修改／去背</dd></div><div><dt>FLUX.2</dt><dd className="state-off">未設定，保持 disabled</dd></div></dl><small>真實狀態會由主工作室的安全 health query 取得；本頁為示範快照。</small></article>
          <article className="inspect-card"><h2>Quality Agent</h2><dl><div><dt>透明背景</dt><dd className="state-good">通過</dd></div><div><dt>安全邊距</dt><dd className="state-good">通過</dd></div><div><dt>繁中後製</dt><dd className="state-good">由伺服器 SVG 疊字</dd></div><div><dt>臉部／肢體語意</dt><dd className="state-warn">需要視覺模型時才自動判定</dd></div></dl><small>不會將尚未執行的語意視覺檢查誤標示為通過。</small></article>
          <article className="inspect-card wide"><h2>Demo 流程覆蓋</h2><div className="inspect-flow">{["聊天需求", "參考圖語意角色", "Character／Style Anchor", "8 張計畫", "獨立工作", "品質修正", "版本回復", "LINE ZIP"].map((item, index) => <span key={item}><b>{index + 1}</b>{item}</span>)}</div><p>按「開啟互動 Demo」可回到公開 Preview，切換每個固定流程狀態。</p><Link href="/preview" className="preview-primary">開啟互動 Demo <ChevronRight size={16} /></Link></article>
        </section>
      </main>
    );
  }

  return (
    <main className="preview-shell">
      <header className="preview-header">
        <Link href="/" className="preview-back"><ArrowLeft size={16} /> 主工作室</Link>
        <div className="preview-brand"><Sparkles size={17} /> Sticker Tycoon <span>Preview</span></div>
        <Link href="/preview/inspection" className="preview-inspection"><Eye size={16} /> Inspection</Link>
      </header>
      <section className="preview-hero">
        <div><span className="eyebrow"><ShieldCheck size={14} /> 公開唯讀示範</span><h1>像和 AI 對話一樣，完成一套貼圖。</h1><p>這是固定示範流程。可以點擊查看每一步，但不會上傳照片、不呼叫生成 API，也不會存取你的私人專案。</p></div>
        <div className="demo-safety"><ImageIcon size={20} /><span><b>原創示範角色</b><br />非使用者照片／非生成結果</span></div>
      </section>
      <section className="preview-workspace">
        <aside className="preview-timeline"><p className="panel-label">Demo Mode</p>{["描述需求", "理解角色", "規劃貼圖", "生成與檢查"].map((label, index) => <button key={label} className={index === activeStep ? "active" : index < activeStep ? "complete" : ""} onClick={() => setStep(index)}><span>{index < activeStep ? <CheckCircle2 size={16} /> : index + 1}</span>{label}</button>)}<div className="timeline-note"><ShieldCheck size={16} /> 所有資料均為固定 Demo 資料</div></aside>
        <section className="preview-chat">
          <div className="chat-note agent"><span className="agent-mark"><Sparkles size={15} /></span><div><b>貼圖 Agent</b><p>{activeStep === 0 ? "告訴我角色、張數與想要的感覺。我會先建立可調整的規劃。" : activeStep === 1 ? "我已讀取 3 張示範參考圖，將角色、姿勢與風格分開保存。" : activeStep === 2 ? "我規劃了 8 張日常情境，每張都有獨立狀態與版本。" : "我會逐張生成、做透明背景與邊界檢查；不合格只會安全修正一次。"}</p></div></div>
          {activeStep >= 1 && <div className="reference-row"><span className="panel-label">參考圖語意</span>{[["角色", "accepted_character"], ["姿勢", "pose"], ["風格", "accepted_style"]].map(([label, role]) => <button key={label} className="reference-chip" onClick={() => setSelected(label === "角色" ? 0 : label === "姿勢" ? 1 : 2)}><img src={demoRabbit} alt="示範兔子角色" /><span>{label}</span><small>{role}</small></button>)}</div>}
          <div className="demo-upload" aria-label="唯讀上傳示範">
            <button type="button" onClick={() => setStep(Math.max(1, step))}><Paperclip size={16} /> 示範附件</button>
            <div><Images size={15} /><span>兔兔角色.png</span><small>角色 · 已接受</small></div>
            <div><ImageIcon size={15} /><span>跳躍姿勢.heic</span><small>HEIC → JPEG（裝置端）</small></div>
            <div><Sparkles size={15} /><span>粉彩畫風.webp</span><small>風格參考</small></div>
            <em>唯讀，不會實際上傳</em>
          </div>
          {activeStep >= 2 && <div className="demo-plan"><div className="plan-title"><div><span className="panel-label">貼圖計畫</span><b>兔兔的日常對話</b></div><span className="count-pill">8 張</span></div><div className="plan-list">{demoScripts.map(([phrase, scene], index) => <button key={phrase} className={selected === index ? "selected" : ""} onClick={() => setSelected(index)}><span>{String(index + 1).padStart(2, "0")}</span><b>{phrase}</b><small>{scene}</small></button>)}</div></div>}
          {activeStep >= 3 && <div className="demo-result"><div className="result-visual"><img src={demoRabbit} alt="原創兔子貼圖示範" /><span className="demo-caption">{demoScripts[selected]?.[0]}</span></div><div className="result-copy"><span className="panel-label">第 {selected + 1} 張 · 可回復版本</span><h2>{demoScripts[selected]?.[1]}</h2><p>Router：Gemini → GPT Image 去背<br />品質：透明背景、邊界、尺寸已檢查；繁中由後製疊字。</p><div className="version-row"><button className={version === 1 ? "active" : ""} onClick={() => setVersion(1)}>V1 原始</button><button className={version === 2 ? "active" : ""} onClick={() => setVersion(2)}>V2 修改</button><button onClick={() => setShowRepair(!showRepair)}><RotateCcw size={14} /> {showRepair ? "已顯示修正紀錄" : "查看修正"}</button></div>{showRepair && <p className="repair-note">品質 Agent 曾發現安全邊距不足，僅執行一次修正；兩個版本都保留。</p>}</div></div>}
          <div className="demo-composer"><input value={message} onChange={(event) => setMessage(event.target.value)} aria-label="示範聊天輸入" /><button onClick={() => setStep(Math.min(3, step + 1))} aria-label="推進示範流程"><Play size={16} /></button></div>
        </section>
        <aside className="preview-status"><p className="panel-label">Agent 工作狀態</p>{demoEvents.map(([label, status, tone]) => <div className="status-event" key={label}><span className={tone === "done" ? "status-done" : "status-working"}>{tone === "done" ? <CheckCircle2 size={15} /> : <LoaderCircle size={15} />}</span><div><b>{label}</b><small>{status}</small></div></div>)}<div className="preflight"><span className="panel-label">LINE Preflight</span><p><CheckCircle2 size={15} /> 370 × 320 PNG</p><p><CheckCircle2 size={15} /> 透明背景</p><p><CheckCircle2 size={15} /> 10 px 安全邊距</p><button><Download size={15} /> 單張 PNG</button><button><FileArchive size={15} /> LINE ZIP</button></div></aside>
      </section>
      <footer className="preview-footer"><span><MessageSquareText size={15} /> Demo 只展示 UI 與流程狀態</span><Link href="/preview/inspection">查看驗收說明 <ChevronRight size={15} /></Link></footer>
    </main>
  );
}

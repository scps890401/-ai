import { ChangeEvent, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ClipboardCheck, Download, Image as ImageIcon, Menu, MessageCircle, Plus, RefreshCw, Share2, Sparkles, Upload, Wand2, X } from "lucide-react";

const logoUrl = "/manus-storage/sticker-tycoon-logo_d42e24d3.png";
const styles = [
  { id: "cute", label: "可愛手繪", icon: "✏️" },
  { id: "pop", label: "繽紛流行", icon: "🌈" },
  { id: "comic", label: "漫畫表情", icon: "💥" },
  { id: "minimal", label: "清爽極簡", icon: "◌" },
];
const phraseSeeds = [
  ["早安", "揮手打招呼，精神飽滿"], ["謝謝", "雙手合十，溫暖微笑"], ["收到", "敬禮或點頭，表情俐落"], ["加油", "握拳鼓勵，充滿活力"], ["等等我", "小跑步揮手，帶一點急迫感"], ["好累喔", "慵懶趴下，眼神疲憊"], ["太好了", "開心跳起來，周圍有小星星"], ["不要啦", "搖手拒絕，表情撒嬌"], ["晚安", "抱著枕頭打呵欠，氣氛療癒"], ["掰掰", "揮手道別，笑容可愛"],
];

type Reference = { url: string; fileName: string; dataUrl: string; mimeType: string };
type Script = { position: number; emotion: string; phrase: string; scene: string };
type Result = Script & { url: string; mode: "generate" | "cutout" | "refine"; hasAlpha?: boolean; error?: string; quality?: { transparent: boolean; dimensions: boolean | string; textReady: boolean; report?: { transparent: string; dimensions: string; text: string } } };
type Message = { role: "user" | "assistant"; content: string };

function scrollToId(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
function readFileAsDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("圖片讀取失敗")); reader.readAsDataURL(file); }); }
function defaultScripts(count: number): Script[] { return Array.from({ length: count }, (_, index) => { const seed = phraseSeeds[index % phraseSeeds.length]; return { position: index + 1, phrase: seed[0], emotion: seed[0], scene: seed[1] }; }); }

export default function Home() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState("把我的角色照片做成可愛、日常實用的卡通貼圖");
  const [projectTitle, setProjectTitle] = useState("我的專屬貼圖組");
  const [styleId, setStyleId] = useState("cute");
  const [stickerCount, setStickerCount] = useState(10);
  const [characterProfile, setCharacterProfile] = useState("");
  const [references, setReferences] = useState<Reference[]>([]);
  const [scripts, setScripts] = useState<Script[]>(defaultScripts(10));
  const [results, setResults] = useState<Result[]>([]);
  const [selectedResult, setSelectedResult] = useState<number | null>(null);
  const [projectKey, setProjectKey] = useState(() => typeof window === "undefined" ? "" : window.localStorage.getItem("sticker-tycoon-project-key") || "");
  const [resumeKey, setResumeKey] = useState("");
  const [notice, setNotice] = useState("");
  const [batchProgress, setBatchProgress] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Message[]>([{ role: "assistant", content: "你好！我會先幫你建立角色設定與貼圖方案，再逐張生成。你可以隨時告訴我想改哪一張。" }]);
  const savedResultsKey = projectKey ? `sticker-tycoon-results-${projectKey}` : "";

  const selectedStyle = styles.find((item) => item.id === styleId) ?? styles[0];
  const planMutation = trpc.project.plan.useMutation();
  const createMutation = trpc.project.create.useMutation();
  const prepareMutation = trpc.project.prepareReference.useMutation();
  const batchMutation = trpc.creative.generateBatch.useMutation();
  const refineMutation = trpc.creative.refine.useMutation();
  const qualityMutation = trpc.creative.qualityCheck.useMutation();
  const zipMutation = trpc.creative.exportZip.useMutation();
  const projectQuery = trpc.project.get.useQuery({ projectKey }, { enabled: Boolean(projectKey) });
  const busy = planMutation.isPending || createMutation.isPending || prepareMutation.isPending || batchMutation.isPending || refineMutation.isPending || qualityMutation.isPending || zipMutation.isPending;
  const readyCount = results.filter((item) => item.quality?.transparent && item.quality?.dimensions).length;
  const failedCount = results.filter((item) => Boolean(item.error)).length;
  const selected = selectedResult === null ? null : results[selectedResult];
  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 3600); };
  useEffect(() => { if (!projectKey || typeof window === "undefined") return; const raw = window.localStorage.getItem(`sticker-tycoon-results-${projectKey}`); if (raw) { try { setResults(JSON.parse(raw) as Result[]); setStep(4); } catch { window.localStorage.removeItem(`sticker-tycoon-results-${projectKey}`); } } }, [projectKey]);
  useEffect(() => { if (!projectQuery.data) return; setProjectTitle(projectQuery.data.project.title); setBrief(projectQuery.data.project.brief || ""); setCharacterProfile(projectQuery.data.project.characterProfile || ""); setScripts(projectQuery.data.scripts.map((item) => ({ position: item.position, emotion: item.emotion, phrase: item.phrase, scene: item.scene || "" }))); setStickerCount(projectQuery.data.project.stickerCount); setReferences(projectQuery.data.references.map((item) => ({ url: item.url, fileName: item.fileName, dataUrl: item.url, mimeType: "image/jpeg" }))); const recovered = projectQuery.data.scripts.filter((item) => item.resultUrl || item.errorMessage).map((item) => ({ position: item.position, emotion: item.emotion, phrase: item.phrase, scene: item.scene || "", url: item.resultUrl || "", mode: "generate" as const, hasAlpha: false, error: item.errorMessage || undefined, quality: item.qualityReport ? (() => { try { return JSON.parse(item.qualityReport) as Result["quality"]; } catch { return undefined; } })() : undefined })); if (recovered.length) { setResults(recovered); setStep(4); } }, [projectQuery.data]);

  const handleReferences = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/") || file.name.toLowerCase().endsWith(".heic"));
    if (!files.length) { showNotice("請選擇 JPG、PNG、WEBP 或 HEIC 照片"); return; }
    try {
      const next: Reference[] = [];
      for (const file of files.slice(0, 10)) {
        const dataUrl = await readFileAsDataUrl(file);
        try {
          const prepared = await prepareMutation.mutateAsync({ photoDataUrl: dataUrl, fileName: file.name });
          next.push({ url: prepared.url, fileName: prepared.fileName, dataUrl, mimeType: prepared.mimeType });
        } catch {
          next.push({ url: dataUrl, fileName: file.name, dataUrl, mimeType: file.type || "image/heic" });
        }
      }
      setReferences(next);
      showNotice(`已加入 ${next.length} 張角色參考照片`);
    } catch (error) { showNotice(error instanceof Error ? error.message : "照片讀取失敗"); }
  };

  const planProject = async () => {
    try {
      const plan = await planMutation.mutateAsync({ brief, style: selectedStyle.label, stickerCount, characterProfile: characterProfile || undefined });
      setProjectTitle(plan.title || projectTitle);
      setCharacterProfile(plan.characterProfile || characterProfile);
      setScripts(plan.scripts.slice(0, stickerCount));
      setStep(2);
      setChatMessages((items) => [...items, { role: "assistant", content: `已完成「${plan.title}」方案，建立了 ${plan.scripts.length} 張貼圖腳本與角色設定。請檢查後繼續。` }]);
      showNotice("AI 方案規劃完成");
    } catch (error) { showNotice(error instanceof Error ? error.message : "方案規劃失敗，請稍後重試"); }
  };

  const createProject = async () => {
    if (!references.length) { showNotice("請先上傳至少一張角色照片"); return; }
    try {
      const created = await createMutation.mutateAsync({ title: projectTitle, brief, style: selectedStyle.label, stickerCount, characterProfile, references: references.map((item, index) => ({ url: item.url, fileName: item.fileName, sortOrder: index })), scripts });
      setProjectKey(created.projectKey); window.localStorage.setItem("sticker-tycoon-project-key", created.projectKey);
      setStep(3);
      showNotice("貼圖專案已建立");
    } catch (error) { showNotice(error instanceof Error ? error.message : "專案建立失敗"); }
  };

  const generateBatch = async (onlyFailed = false) => {
    if (!references.length) { showNotice("請先上傳角色照片"); return; }
    const items = onlyFailed ? scripts.filter((script) => results.some((result) => result.error && result.position === script.position)) : scripts;
    if (!items.length) { showNotice("目前沒有需要重試的貼圖"); return; }
    setBatchProgress(8); setStep(4); if (!onlyFailed) { setResults([]); setSelectedResult(null); }
    try {
      const generated = await batchMutation.mutateAsync({ projectKey: projectKey || undefined, photoDataUrl: references[0].url, referenceUrls: references.map((item) => item.url), style: selectedStyle.label, characterProfile, items });
      const mapped: Result[] = generated.map((item) => ({ ...item, quality: undefined }));
      const merged = [...(onlyFailed ? results.filter((item) => !item.error) : []), ...mapped].sort((a, b) => a.position - b.position);
      setResults(merged);
      setBatchProgress(86);
      const checked: Result[] = [];
      for (const item of merged) {
        if (item.error || !item.url) { checked.push(item); continue; }
        try {
          const quality = await qualityMutation.mutateAsync({ url: item.url, phrase: item.phrase });
          checked.push({ ...item, quality });
        } catch { checked.push({ ...item, quality: { transparent: Boolean(item.hasAlpha), dimensions: "待人工確認", textReady: item.phrase.length > 0 } }); }
        setBatchProgress((current) => Math.min(99, current + Math.ceil(14 / Math.max(mapped.length, 1))));
      }
      setResults(checked); if (savedResultsKey) window.localStorage.setItem(savedResultsKey, JSON.stringify(checked)); setBatchProgress(100); const failedCount = checked.filter((item) => item.error).length; showNotice(failedCount ? `完成 ${checked.length - failedCount} 張，${failedCount} 張因 AI 使用量限制待重試` : `完成 ${checked.length} 張獨立貼圖，品質檢查也已完成`);
      setChatMessages((items) => [...items, { role: "assistant", content: `貼圖組生成完成！目前有 ${checked.length} 張獨立結果，你可以點選任一張進行對話修改。` }]);
    } catch (error) { setBatchProgress(0); showNotice(error instanceof Error ? error.message : "批次生成失敗，請檢查照片或稍後重試"); }
  };

  const updateScript = (index: number, patch: Partial<Script>) => setScripts((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const moveScript = (index: number, direction: -1 | 1) => setScripts((items) => { const target = index + direction; if (target < 0 || target >= items.length) return items; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; return next.map((item, itemIndex) => ({ ...item, position: itemIndex + 1 })); });
  const moveResult = (index: number, direction: -1 | 1) => setResults((items) => { const target = index + direction; if (target < 0 || target >= items.length) return items; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; if (savedResultsKey && typeof window !== "undefined") window.localStorage.setItem(savedResultsKey, JSON.stringify(next)); return next; });
  const addScript = () => { if (scripts.length >= 40) return; const position = scripts.length + 1; setScripts((items) => [...items, { position, phrase: "新的貼圖", emotion: "日常", scene: "自然、有辨識度的角色動作" }]); setStickerCount(position); };
  const removeScript = (index: number) => { if (scripts.length <= 4) return; setScripts((items) => items.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, position: itemIndex + 1 }))); setStickerCount(Math.max(4, scripts.length - 1)); };

  const sendChat = async () => {
    const instruction = chatInput.trim(); if (!instruction) return;
    setChatInput(""); setChatMessages((items) => [...items, { role: "user", content: instruction }]);
    if (!selected) { setBrief((current) => `${current}；${instruction}`); setChatMessages((items) => [...items, { role: "assistant", content: "我已把這個要求加入專案方向。你可以繼續檢查方案，或開始生成。" }]); return; }
    try {
      const response = await refineMutation.mutateAsync({ currentImageUrl: { url: selected.url, mimeType: "image/png" }, instruction, history: chatMessages });
      const next = { ...selected, url: response.url, mode: "refine" as const };
      setResults((items) => items.map((item, index) => index === selectedResult ? next : item));
      setChatMessages((items) => [...items, { role: "assistant", content: response.reply || "已完成修改，新的版本已替換到目前貼圖。" }]);
      showNotice("單張貼圖修改完成");
    } catch (error) { setChatMessages((items) => [...items, { role: "assistant", content: error instanceof Error ? error.message : "修改失敗，原本版本仍保留。" }]); showNotice("AI 修改失敗"); }
  };

  const retryFailed = () => { void generateBatch(true); };
  const download = (item: Result, index: number) => { if (!item.url) { showNotice(item.error || "這張貼圖目前沒有可下載的結果"); return; } const link = document.createElement("a"); link.href = item.url; link.download = `sticker-${String(index + 1).padStart(2, "0")}-${item.phrase}.png`; link.click(); };
  const exportZip = async () => { try { const archive = await zipMutation.mutateAsync({ files: results.filter((item) => item.url).map((item, index) => ({ url: item.url, fileName: `sticker-${String(index + 1).padStart(2, "0")}-${item.phrase}.png` })) }); const binary = Uint8Array.from(atob(archive.base64), (char) => char.charCodeAt(0)); const blob = new Blob([binary], { type: "application/zip" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = archive.fileName; link.click(); URL.revokeObjectURL(link.href); showNotice("ZIP 貼圖套件已準備完成"); } catch (error) { showNotice(error instanceof Error ? error.message : "ZIP 匯出失敗"); } };
  const share = async () => { const text = `我剛用 Sticker Tycoon 完成「${projectTitle}」貼圖組！`; if (navigator.share) await navigator.share({ title: projectTitle, text }); else { await navigator.clipboard?.writeText(text); showNotice("分享文字已複製"); } };

  const wizardSteps = ["需求對話", "角色設定", "文字腳本", "生成與檢查"];
  return <div className="site-shell">
    {notice && <div className="toast"><Sparkles size={16} />{notice}</div>}
    <header className="topbar"><a className="brand" href="#top"><img src={logoUrl} alt="貼圖大亨標誌" /><span><strong>貼圖大亨</strong><small>Sticker Tycoon</small></span></a><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="開啟導覽選單"><Menu size={22} /></button><nav className={menuOpen ? "nav-links open" : "nav-links"}><button onClick={() => { scrollToId("studio"); setMenuOpen(false); }}>開始製作</button><button onClick={() => { scrollToId("features"); setMenuOpen(false); }}>功能特色</button><button onClick={() => { scrollToId("guide"); setMenuOpen(false); }}>使用流程</button></nav><button className="button button-primary header-cta" onClick={() => scrollToId("studio")}><Wand2 size={15} />建立貼圖組</button></header>
    <main id="top">
      <section className="hero section-pad hero-simplified"><div className="ambient orb-one" /><div className="ambient orb-two" /><div className="hero-copy reveal"><div className="eyebrow">AI 貼圖專案工作室 · 從照片到整套素材</div><h1>把角色變成<br /><span>完整貼圖組</span></h1><p className="hero-lead">先聊需求、建立角色設定，再逐張生成、檢查、修改與匯出。所有步驟都留在同一個網頁。</p><div className="hero-actions"><button className="button button-primary" onClick={() => scrollToId("studio")}><Wand2 size={16} />開始建立專案</button><button className="button button-secondary" onClick={() => scrollToId("features")}><ClipboardCheck size={16} />查看完整能力</button></div><div className="trust-row"><span><Check size={14} />多張照片參考</span><span><Check size={14} />逐張品質檢查</span><span><Check size={14} />PNG 與 ZIP 匯出</span></div></div></section>
      <section id="studio" className="studio-section section-pad"><div className="section-heading"><div className="eyebrow">🪄 AI 貼圖組專案精靈</div><h2>從需求到交付，<span>每一步都可掌控</span></h2><p>這次不只生成一張圖，而是建立角色、腳本、批次結果與可下載的完整貼圖專案。</p></div>
        <div className="wizard-progress">{wizardSteps.map((item, index) => <div className={step === index + 1 ? "wizard-step active" : step > index + 1 ? "wizard-step complete" : "wizard-step"} key={item}><span>{step > index + 1 ? "✓" : String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></div>)}</div>
        {step === 1 && <div className="wizard-panel"><div className="panel-icon">01</div><div className="wizard-form"><h3>先和 AI 說說你想做什麼</h3><p>例如：「用這些照片做 10 張可愛、日常實用的卡通貼圖，文字使用繁體中文。」</p><textarea className="prompt-input project-brief" value={brief} onChange={(event) => setBrief(event.target.value)} /><div className="resume-project-row"><input className="prompt-input" value={resumeKey} onChange={(event) => setResumeKey(event.target.value)} placeholder="已有專案代碼，例如：Ab3kL9mN2pQx" /><button className="button button-secondary small-button" onClick={() => { const key = resumeKey.trim(); if (!key) { showNotice("請輸入專案代碼"); return; } setProjectKey(key); window.localStorage.setItem("sticker-tycoon-project-key", key); showNotice("正在載入既有專案…"); }}>載入既有專案</button></div><div className="form-grid"><label>貼圖組名稱<input className="prompt-input" value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} /></label><label>視覺風格<select className="prompt-input" value={styleId} onChange={(event) => setStyleId(event.target.value)}>{styles.map((item) => <option key={item.id} value={item.id}>{item.icon} {item.label}</option>)}</select></label><label>貼圖張數<select className="prompt-input" value={stickerCount} onChange={(event) => { const count = Number(event.target.value); setStickerCount(count); setScripts(defaultScripts(count)); }}>{[4, 8, 10, 16, 24, 32, 40].map((count) => <option key={count} value={count}>{count} 張獨立貼圖</option>)}</select></label></div><button className="button button-primary" onClick={planProject} disabled={busy}><Sparkles size={16} />{planMutation.isPending ? "AI 正在規劃…" : "讓 AI 規劃我的貼圖組"}<ArrowRight size={16} /></button></div></div>}
        {step === 2 && <div className="wizard-panel"><div className="panel-icon">02</div><div className="wizard-form"><div className="panel-heading-row"><div><h3>建立角色設定檔</h3><p>上傳 1–10 張照片。AI 會將它們視為同一個角色或角色組的參考。</p></div><span className="count-pill">{references.length}/10 張照片</span></div><button className="multi-upload-zone" onClick={() => fileRef.current?.click()}><input ref={fileRef} type="file" accept="image/*,.heic" multiple onChange={handleReferences} hidden /><Upload size={28} /><strong>加入多張角色照片</strong><small>支援 JPG、PNG、WEBP、HEIC；照片會先安全轉成 AI 可讀格式</small></button>{references.length > 0 && <div className="reference-strip">{references.map((reference, index) => <div className="reference-thumb" key={`${reference.fileName}-${index}`}><img src={reference.url} alt={reference.fileName} /><button onClick={() => setReferences((items) => items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`移除${reference.fileName}`}><X size={13} /></button><small>{index + 1}</small></div>)}</div>}<label>角色特徵補充<textarea className="prompt-input project-brief" value={characterProfile} onChange={(event) => setCharacterProfile(event.target.value)} placeholder="例如：白底咖啡斑、圓眼、耳朵偏長；請保留原本臉型與花色。" /></label><div className="wizard-actions"><button className="button button-secondary" onClick={() => setStep(1)}><ArrowLeft size={15} />上一步</button><button className="button button-primary" onClick={createProject} disabled={busy || !references.length}>建立角色與專案 <ArrowRight size={15} /></button></div></div></div>}
        {step === 3 && <div className="wizard-panel script-panel"><div className="panel-icon">03</div><div className="wizard-form"><div className="panel-heading-row"><div><h3>編輯文字與情境腳本</h3><p>每一列都是一張獨立貼圖。你可以調整文字、情緒與動作。</p></div><button className="button button-secondary small-button" onClick={addScript} disabled={scripts.length >= 40}><Plus size={14} />新增一張</button></div><div className="script-table">{scripts.map((script, index) => <div className="script-row" key={script.position}><span className="script-number">{String(index + 1).padStart(2, "0")}</span><input className="prompt-input" value={script.phrase} onChange={(event) => updateScript(index, { phrase: event.target.value })} aria-label="貼圖文字" /><input className="prompt-input" value={script.emotion} onChange={(event) => updateScript(index, { emotion: event.target.value })} aria-label="貼圖情緒" /><input className="prompt-input script-scene" value={script.scene} onChange={(event) => updateScript(index, { scene: event.target.value })} aria-label="貼圖情境" /><div className="script-order-actions"><button onClick={() => moveScript(index, -1)} disabled={index === 0} aria-label="腳本上移"><ArrowUp size={13} /></button><button onClick={() => moveScript(index, 1)} disabled={index === scripts.length - 1} aria-label="腳本下移"><ArrowDown size={13} /></button><button onClick={() => removeScript(index)} disabled={scripts.length <= 4} aria-label="移除腳本"><X size={13} /></button></div></div>)}</div><div className="wizard-actions"><button className="button button-secondary" onClick={() => setStep(2)}><ArrowLeft size={15} />上一步</button><button className="button button-primary" onClick={() => void generateBatch(false)} disabled={busy}>開始批次生成 <Sparkles size={15} /></button></div></div></div>}
        {step === 4 && <div className="batch-layout"><div className="batch-summary"><div className="batch-summary-top"><div><span className="eyebrow">{projectKey ? `專案 ${projectKey}` : "AI 貼圖生成"}</span><h3>{projectTitle}</h3></div><span className="count-pill">{results.filter((item) => item.url).length}/{scripts.length} 張完成</span></div><div className="batch-progress"><div style={{ width: `${batchProgress}%` }} /></div><p>{batchProgress === 100 ? failedCount ? `完成 ${readyCount} 張品質檢查，另有 ${failedCount} 張未完成；常見原因是 AI 服務使用量暫時耗盡。` : `完成 ${readyCount} 張品質檢查，可下載獨立 PNG 或 ZIP。` : batchProgress > 0 ? "AI 正在逐張生成，請保持頁面開啟…" : "準備開始生成。"}</p><div className="batch-actions"><button className="button button-secondary" onClick={() => setStep(3)}><ArrowLeft size={15} />回到腳本</button><button className="button button-secondary" onClick={() => void generateBatch(false)} disabled={busy}><RefreshCw size={15} />重新生成整組</button>{failedCount > 0 && <button className="button button-secondary" onClick={retryFailed} disabled={busy}><RefreshCw size={15} />重試失敗 {failedCount} 張</button>}{results.length > 0 && <><button className="button button-secondary" onClick={share}><Share2 size={15} />分享</button><button className="button button-primary" onClick={exportZip} disabled={zipMutation.isPending}><Archive size={15} />{zipMutation.isPending ? "打包中…" : "匯出 ZIP"}</button></>}</div></div><div className="batch-grid">{results.length ? results.map((item, index) => <article className={selectedResult === index ? "batch-card selected" : "batch-card"} key={`${item.url}-${index}`} onClick={() => setSelectedResult(index)}><div className="batch-image-wrap">{item.url ? <img src={item.url} alt={`${item.phrase} 貼圖`} /> : <div className="batch-failed"><RefreshCw size={20} /><strong>暫未完成</strong><small>{item.error?.includes("usage exhausted") ? "AI 使用量已暫時耗盡" : "可稍後重試"}</small></div>}<span className="batch-index">{String(index + 1).padStart(2, "0")}</span></div><div className="batch-card-footer"><strong>{item.phrase}</strong><span className={item.quality?.transparent ? "quality-ok" : "quality-warn"}>{item.quality?.transparent ? "✓ 透明" : item.error ? "待重試" : "檢查"}</span><button onClick={(event) => { event.stopPropagation(); moveResult(index, -1); }} disabled={index === 0} aria-label="貼圖上移"><ArrowUp size={12} /></button><button onClick={(event) => { event.stopPropagation(); moveResult(index, 1); }} disabled={index === results.length - 1} aria-label="貼圖下移"><ArrowDown size={12} /></button><button onClick={(event) => { event.stopPropagation(); download(item, index); }} aria-label={`下載${item.phrase}`}><Download size={14} /></button></div></article>) : <div className="preview-placeholder"><ImageIcon size={32} /><strong>生成結果會出現在這裡</strong><span>按下開始批次生成，AI 會逐張建立獨立貼圖。</span></div>}</div></div>}
        <div className="chat-panel project-chat"><div className="chat-panel-heading"><div><span className="eyebrow"><MessageCircle size={14} /> AI 專案助手</span><h3>{selected ? `正在修改第 ${String((selectedResult ?? 0) + 1).padStart(2, "0")} 張：${selected.phrase}` : "用對話規劃與修改貼圖"}</h3></div>{busy && <RefreshCw size={18} className="spin" />}</div><div className="chat-messages">{chatMessages.slice(-6).map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "assistant" ? "AI" : "你"}</span><p>{message.content}</p></div>)}</div><form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void sendChat(); }}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder={selected ? "例如：第 3 張的文字改成早安，表情更開心" : "例如：增加一張「吃飽了嗎」的貼圖"} disabled={busy} /><button className="button button-primary" type="submit" disabled={busy || !chatInput.trim()}><ArrowRight size={16} /></button></form></div>
      </section>
      <section id="features" className="feature-section section-pad"><div className="section-heading"><div className="eyebrow">✨ 完整 AI 貼圖能力</div><h2>從一張照片，<span>整理成一套作品</span></h2><p>專案精靈、角色一致性、逐張品質檢查、對話修改與 ZIP 交付，全部集中在同一個網頁。</p></div><div className="feature-list"><article className="feature-item"><div className="feature-icon">✦</div><div><h3>需求對話與方案規劃</h3><p>先用自然語言說明角色、風格、張數與用途，AI 會建立角色設定與文字情境腳本。</p></div></article><article className="feature-item"><div className="feature-icon">◌</div><div><h3>角色一致性與多張參考</h3><p>使用多張照片建立角色參考，批次生成時持續注入角色特徵，降低每張風格漂移。</p></div></article><article className="feature-item"><div className="feature-icon">↻</div><div><h3>檢查、修改與匯出</h3><p>每張都是獨立結果，可檢查透明背景、點選後聊天修改，最後下載 PNG 或 ZIP 套件。</p></div></article></div></section>
      <section id="guide" className="guide-section section-pad"><div className="guide-panel"><div><div className="eyebrow">📖 新版使用流程</div><h2>四步驟，<br /><span>完成你的貼圖組</span></h2><p>先規劃，再生成；先確認角色，再批次製作。每一步都能回頭修改。</p></div><div className="steps">{[["01", "需求對話", "告訴 AI 角色、風格、張數與想傳達的情緒。"],["02", "角色設定", "上傳最多 10 張照片，建立角色一致性參考。"],["03", "文字腳本", "逐張編輯貼圖文字、情緒與情境。"],["04", "生成與交付", "逐張檢查、聊天修改，最後匯出 PNG 與 ZIP。"]].map(([n, t, d]) => <div className="step" key={n}><span>{n}</span><div><strong>{t}</strong><p>{d}</p></div></div>)}</div><button className="button button-primary" onClick={() => scrollToId("studio")}>建立貼圖專案 <ArrowRight size={16} /></button></div></section>
    </main><footer className="footer footer-minimal"><div className="footer-brand"><img src={logoUrl} alt="貼圖大亨標誌" /><div><strong>貼圖大亨</strong><small>Sticker Tycoon</small></div></div><p>從角色設定到 ZIP 交付，完成你的專屬貼圖組。</p></footer>
  </div>;
}

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, History, ImagePlus, Loader2, Paperclip, Play, RefreshCw, Send, Sparkles, WandSparkles, X } from "lucide-react";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { StudioAgentWorkspace, StudioComposer, StudioMessage, StudioPreflight, StudioStickerTask, StudioTopbar } from "@/components/StudioSharedUI";
import "../chat-studio.css";
import "../line-export.css";

type LocalAttachment = { id: string; dataUrl: string; fileName: string; mimeType: string; preview?: string };
type JsonRecord = Record<string, unknown>;
const STORAGE_KEY = "sticker-tycoon-chat-project-key";

const suggestions = [
  "幫我把這隻貓做成 8 張可愛的 LINE 貼圖，使用繁體中文。",
  "我要做 16 張日常貼圖，角色要維持同一套衣服和可愛比例。",
  "繼續製作上次尚未完成的貼圖。",
];

function asDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`無法讀取 ${file.name}`));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

async function normaliseFile(file: File) {
  const isHeic = /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);
  if (!isHeic) return file;
  const converter = (await import("heic2any")).default;
  const converted = await converter({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const blob = Array.isArray(converted) ? converted[0]! : converted;
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
}

function parseJson(value: string | null | undefined): JsonRecord {
  if (!value) return {};
  try { return JSON.parse(value) as JsonRecord; } catch { return {}; }
}

function statusLabel(status: string | undefined) {
  if (status === "generating") return "正在生成";
  if (status === "removing_background") return "整理透明背景";
  if (status === "completed" || status === "ready") return "已完成";
  if (status === "paused_quota") return "額度暫停";
  if (status === "failed" || status === "error") return "需要重試";
  if (status === "retrying") return "正在重試";
  return "等待中";
}

function providerLabel(value: unknown) {
  if (value === "gemini-3.1-flash-image") return "Gemini";
  if (value === "gpt-image-2") return "GPT Image";
  return "AI Router";
}

export default function Home() {
  const utils = trpc.useUtils();
  const [projectKey, setProjectKey] = useState(() => localStorage.getItem(STORAGE_KEY) ?? "");
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [versionInspector, setVersionInspector] = useState<number | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const studio = trpc.studio.get.useQuery({ projectKey: projectKey || "no-project" }, { enabled: Boolean(projectKey), refetchInterval: projectKey ? 8_000 : false });
  const providerHealth = trpc.studio.providerHealth.useQuery(undefined, { staleTime: 30_000, refetchInterval: projectKey ? 45_000 : false });
  const sendMessage = trpc.studio.sendMessage.useMutation();
  const runPending = trpc.studio.runPending.useMutation();
  const retrySticker = trpc.studio.retrySticker.useMutation();
  const editSticker = trpc.studio.editSticker.useMutation();
  const restoreVersion = trpc.studio.restoreVersion.useMutation();
  const setReferenceRole = trpc.studio.setReferenceRole.useMutation();
  const exportLineSingle = trpc.studio.exportLineSingle.useMutation();
  const exportLinePack = trpc.studio.exportLinePack.useMutation();
  const busy = sendMessage.isPending || runPending.isPending || retrySticker.isPending || editSticker.isPending || restoreVersion.isPending || setReferenceRole.isPending || exportLineSingle.isPending || exportLinePack.isPending || uploading;
  const project = studio.data?.project;
  const messages = studio.data?.messages ?? [];
  const events = (studio.data?.events ?? []).slice(0, 5).reverse();
  const attachmentsByMessage = useMemo(() => {
    const grouped = new Map<number, NonNullable<typeof studio.data>["attachments"]>();
    for (const attachment of studio.data?.attachments ?? []) grouped.set(attachment.messageId, [...(grouped.get(attachment.messageId) ?? []), attachment]);
    return grouped;
  }, [studio.data?.attachments]);
  const versionsByScript = useMemo(() => {
    const grouped = new Map<number, NonNullable<typeof studio.data>["versions"]>();
    for (const version of studio.data?.versions ?? []) grouped.set(version.scriptId, [...(grouped.get(version.scriptId) ?? []), version]);
    return grouped;
  }, [studio.data?.versions]);

  useEffect(() => {
    if (projectKey) localStorage.setItem(STORAGE_KEY, projectKey);
  }, [projectKey]);

  const toast = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 5_000); };
  const refreshStudio = async (key = projectKey) => { if (key) await utils.studio.get.invalidate({ projectKey: key }); };
  const drainPending = async (key: string, position?: number) => {
    const result = await runPending.mutateAsync({ projectKey: key, maxJobs: position ? 1 : 2, position });
    await refreshStudio(key);
    if (!position && result.remaining > 0 && !result.completed.some((item) => item.status === "paused_quota")) window.setTimeout(() => void drainPending(key), 500);
    if (result.completed.some((item) => item.status === "paused_quota")) toast("AI 額度目前已用完，已完成與未完成進度都已保存。恢復後輸入「繼續製作」即可續作。");
  };

  const submit = async (content = input) => {
    if ((!content.trim() && !attachments.length) || busy) return;
    try {
      const result = await sendMessage.mutateAsync({ projectKey: projectKey || undefined, content: content.trim() || "請分析我上傳的角色圖片並建立 LINE 貼圖專案。", attachments: attachments.map(({ dataUrl, fileName, mimeType }) => ({ dataUrl, fileName, mimeType })) });
      setProjectKey(result.projectKey);
      setInput("");
      setAttachments([]);
      await refreshStudio(result.projectKey);
      if (result.autoRun) void drainPending(result.projectKey);
    } catch (error) {
      toast(error instanceof Error ? error.message : "訊息送出失敗，請稍後再試");
    }
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, 10 - attachments.length));
    event.target.value = "";
    if (!files.length) return;
    setUploading(true);
    try {
      const prepared = await Promise.all(files.map(async (original) => {
        const file = await normaliseFile(original);
        if (file.size > 12 * 1024 * 1024) throw new Error(`${file.name} 超過 12 MB 上限`);
        const dataUrl = await asDataUrl(file);
        return { id: `${file.name}-${crypto.randomUUID()}`, dataUrl, fileName: file.name, mimeType: file.type || "application/octet-stream", preview: file.type.startsWith("image/") ? dataUrl : undefined };
      }));
      setAttachments((items) => [...items, ...prepared]);
    } catch (error) {
      toast(error instanceof Error ? error.message : "附件處理失敗");
    } finally { setUploading(false); }
  };

  const retry = async (position: number) => {
    if (!projectKey || busy) return;
    try { const result = await retrySticker.mutateAsync({ projectKey, position }); await refreshStudio(projectKey); if (result.completed.some((item) => item.status === "paused_quota")) toast("AI 額度目前已用完，這張貼圖與其他進度都已保存。"); } catch (error) { toast(error instanceof Error ? error.message : "重新生成失敗"); }
  };
  const requestEdit = (position: number) => { setInput(`第 ${position} 張請修改：`); composerRef.current?.focus(); };
  const restore = async (position: number, versionId: number) => {
    if (!projectKey || busy) return;
    try { const result = await restoreVersion.mutateAsync({ projectKey, position, versionId }); await refreshStudio(); setVersionInspector(null); toast(`第 ${position} 張已回復至 V${result.version}。`); } catch (error) { toast(error instanceof Error ? error.message : "版本回復失敗"); }
  };
  const classifyReference = async (referenceId: number, role: "accepted_character" | "pose" | "scene" | "style") => {
    if (!projectKey || busy) return;
    try {
      await setReferenceRole.mutateAsync({ projectKey, referenceId, role, accepted: role === "accepted_character" });
      await refreshStudio();
      toast(role === "pose" ? "已設為姿勢參考。" : role === "scene" ? "已設為場景參考。" : role === "style" ? "已設為風格參考。" : "已設為已確認角色參考。 ");
    } catch (error) { toast(error instanceof Error ? error.message : "參考圖設定失敗"); }
  };
  const download = async (url: string, fileName: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`無法準備下載檔案（${response.status}）`);
    const objectUrl = URL.createObjectURL(await response.blob());
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);
  };
  const exportSingle = async (position: number) => {
    if (!projectKey || busy) return;
    try { const result = await exportLineSingle.mutateAsync({ projectKey, position }); await download(result.url, result.fileName); toast(`第 ${position} 張已完成 LINE PNG 檢查與繁中文字後製。`); await refreshStudio(); } catch (error) { toast(error instanceof Error ? error.message : "LINE 單張輸出失敗"); }
  };
  const exportPack = async () => {
    if (!projectKey || busy) return;
    try { const result = await exportLinePack.mutateAsync({ projectKey }); await download(result.url, result.fileName); toast(`LINE 套組 ZIP 已建立（${Math.ceil(result.zipBytes / 1024)} KB）。`); await refreshStudio(); } catch (error) { toast(error instanceof Error ? error.message : "LINE 套組輸出失敗"); }
  };

  const quickPlan = (count: number) => void submit(`請依照目前角色設定，規劃 ${count} 張不重複的繁體中文 LINE 貼圖並開始製作。`);
  const completedCount = studio.data?.scripts.filter((script) => Boolean(script.resultUrl)).length ?? 0;
  const recentResults = studio.data?.scripts.filter((script) => Boolean(script.resultUrl)).slice(-3) ?? [];
  const preflight = useMemo(() => {
    const scripts = studio.data?.scripts ?? [];
    const quality = scripts.map((script) => parseJson(script.qualityReport));
    const transparentPassed = quality.filter((report) => report.alphaVerified === true).length;
    const safeMarginPassed = quality.filter((report) => report.touchesCanvasEdge === false).length;
    return { total: scripts.length, completed: scripts.filter((script) => Boolean(script.resultUrl)).length, transparentPassed, safeMarginPassed, exportReady: scripts.length > 0 && scripts.every((script) => Boolean(script.resultUrl)) };
  }, [studio.data?.scripts]);

  return <main className="chat-studio-shell">
    {notice && <div className="toast"><Sparkles size={15} />{notice}</div>}
    <StudioTopbar projectName={project?.title} onCopyProject={() => { if (project) { navigator.clipboard.writeText(project.projectKey); toast("專案代碼已複製，可在其他裝置續作"); } }} />
    <section className="chat-layout">
      <div className="conversation-column">
        {messages.length === 0 ? <div className="chat-welcome"><span className="eyebrow">AI STICKER AGENT</span><h1>像聊天一樣，完成一整套貼圖。</h1><p>傳照片、描述角色，或直接告訴我你想做幾張 LINE 貼圖。Agent 會理解角色、規劃、生成、檢查與保存，並在額度中斷時安全續作。</p><div className="suggestion-list">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => { setInput(suggestion); composerRef.current?.focus(); }}><Sparkles size={14} />{suggestion}</button>)}</div></div> : <div className="message-list">{messages.map((message) => <StudioMessage key={message.id} role={message.role === "assistant" ? "assistant" : "user"} attachments={(attachmentsByMessage.get(message.id) ?? []).map((attachment) => ({ id: attachment.id, name: attachment.fileName, mimeType: attachment.mimeType, url: attachment.mimeType.startsWith("image/") ? attachment.url : undefined }))}>{message.role === "assistant" ? <Streamdown>{message.content}</Streamdown> : <p>{message.content}</p>}</StudioMessage>)}</div>}
        <StudioAgentWorkspace title={project ? `${completedCount} / ${studio.data?.scripts.length ?? 0} 張完成` : "從一句話或幾張照片開始"} copy={<p>上傳角色照後，可在這裡確認角色、挑選姿勢或風格，再交給 Agent 自動規劃。</p>} health={(["gemini-3.1-flash-image", "gpt-image-2", "flux-2"] as const).map((provider) => { const status = providerHealth.data?.[provider]?.status ?? "checking"; return { label: providerLabel(provider), status: status === "healthy" || status === "quota_exhausted" || status === "disabled" ? status : "checking" }; })} events={events.map((event) => ({ id: event.id, message: event.message, status: event.status }))} results={recentResults.map((script) => ({ id: script.id, url: script.resultUrl!, position: script.position, phrase: script.phrase }))} onResultEdit={requestEdit} onResultDownload={(position) => void exportSingle(position)} onAttach={() => fileInputRef.current?.click()} onPlan={quickPlan} onPackEdit={project ? () => void submit("全部變可愛一點") : undefined} onResume={project ? () => void submit("繼續製作") : undefined} disabled={busy} />
        <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/*,.heic,.heif,.pdf" multiple onChange={handleFiles} />
        <StudioComposer value={input} onChange={setInput} onSend={() => void submit()} onAttach={() => fileInputRef.current?.click()} attachments={attachments.map((attachment) => ({ id: attachment.id, name: attachment.fileName, mimeType: attachment.mimeType, preview: attachment.preview }))} onRemove={(id) => setAttachments((items) => items.filter((item) => item.id !== id))} inputRef={composerRef} disabled={busy} allowEmpty={attachments.length > 0} />
      </div>
      <aside className="task-panel"><div className="task-panel-head"><div><span className="eyebrow">STICKER TASKS</span><h2>{project ? "製作進度" : "等待你的需求"}</h2></div>{project && <div className="panel-buttons"><button className="line-export-button" onClick={() => void exportPack()} disabled={busy || (studio.data?.scripts.some((script) => !script.resultUrl) ?? true)}><Download size={14} />LINE ZIP</button><button className="continue-button" onClick={() => void submit("繼續製作")} disabled={busy}><Play size={14} />繼續製作</button></div>}</div>
        {project && <StudioPreflight total={preflight.total} completed={preflight.completed} transparent={preflight.transparentPassed} safeMargin={preflight.safeMarginPassed} exportReady={preflight.exportReady} />}
        {(studio.data?.references.length ?? 0) > 0 && <section className="reference-tray"><div className="reference-tray-head"><span>參考圖錨點</span><small>角色／姿勢／場景／風格</small></div><div className="reference-list">{studio.data!.references.slice(0, 6).map((reference) => <article key={reference.id} className={`reference-card ${reference.role}`}><img src={reference.url} alt={reference.fileName} /><div><strong>{reference.role === "accepted_character" ? "已確認角色" : reference.role === "pose" ? "姿勢" : reference.role === "scene" ? "場景" : reference.role === "style" || reference.role === "accepted_style" ? "風格" : "角色"}</strong><div className="reference-actions"><button onClick={() => void classifyReference(reference.id, "accepted_character")} disabled={busy}><Check size={11} />角色</button><button onClick={() => void classifyReference(reference.id, "pose")} disabled={busy}>姿勢</button><button onClick={() => void classifyReference(reference.id, "scene")} disabled={busy}>場景</button><button onClick={() => void classifyReference(reference.id, "style")} disabled={busy}>風格</button></div></div></article>)}</div></section>}
        {studio.isLoading ? <div className="panel-loading"><Loader2 className="spin" />正在載入專案…</div> : (studio.data?.scripts.length ?? 0) === 0 ? <div className="task-empty"><ImagePlus size={24} /><strong>從一段對話開始</strong><span>AI 會自動建立角色設定與貼圖清單。</span></div> : <div className="task-grid">{studio.data!.scripts.map((script) => { const job = studio.data!.jobs.filter((item) => item.scriptId === script.id && item.kind === "generate").at(-1); const taskStatus = job?.status ?? script.status; const router = parseJson(job?.routerJson); const quality = parseJson(script.qualityReport); const versions = versionsByScript.get(script.id) ?? []; return <StudioStickerTask key={script.id} position={script.position} phrase={script.phrase} emotion={script.emotion} imageUrl={script.resultUrl ?? undefined} status={taskStatus} router={providerLabel(router.selectedProvider)} quality={quality.alphaVerified ? "透明已檢查" : "待品質檢查"} versionLabel={`V${versions.length}`} onDownload={() => void exportSingle(script.position)} onEdit={() => requestEdit(script.position)} onVersion={() => setVersionInspector(versionInspector === script.id ? null : script.id)} onRetry={() => void retry(script.position)} versionRail={versionInspector === script.id ? <div className="version-rail">{versions.map((version) => <button key={version.id} className={version.isActive ? "active" : ""} onClick={() => !version.isActive && void restore(script.position, version.id)} disabled={busy || version.isActive}>V{version.version}{version.isActive ? " · 使用中" : " · 回復"}</button>)}</div> : undefined} />; })}</div>}
      </aside>
    </section>
  </main>;
}

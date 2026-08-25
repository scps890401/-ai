import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, ImagePlus, Loader2, Paperclip, Play, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import "../chat-studio.css";
import "../line-export.css";

type LocalAttachment = { id: string; dataUrl: string; fileName: string; mimeType: string; preview?: string };
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

function statusLabel(status: string | undefined) {
  if (status === "generating") return "正在生成";
  if (status === "completed" || status === "ready") return "已完成";
  if (status === "paused_quota") return "額度暫停";
  if (status === "failed" || status === "error") return "需要重試";
  if (status === "retrying") return "正在重試";
  return "等待中";
}

export default function Home() {
  const utils = trpc.useUtils();
  const [projectKey, setProjectKey] = useState(() => localStorage.getItem(STORAGE_KEY) ?? "");
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const studio = trpc.studio.get.useQuery({ projectKey: projectKey || "no-project" }, { enabled: Boolean(projectKey), refetchInterval: projectKey ? 8_000 : false });
  const sendMessage = trpc.studio.sendMessage.useMutation();
  const runPending = trpc.studio.runPending.useMutation();
  const retrySticker = trpc.studio.retrySticker.useMutation();
  const editSticker = trpc.studio.editSticker.useMutation();
  const exportLineSingle = trpc.studio.exportLineSingle.useMutation();
  const exportLinePack = trpc.studio.exportLinePack.useMutation();
  const busy = sendMessage.isPending || runPending.isPending || retrySticker.isPending || editSticker.isPending || exportLineSingle.isPending || exportLinePack.isPending || uploading;
  const project = studio.data?.project;
  const messages = studio.data?.messages ?? [];
  const attachmentsByMessage = useMemo(() => {
    const grouped = new Map<number, NonNullable<typeof studio.data>["attachments"]>();
    for (const attachment of studio.data?.attachments ?? []) grouped.set(attachment.messageId, [...(grouped.get(attachment.messageId) ?? []), attachment]);
    return grouped;
  }, [studio.data?.attachments]);

  useEffect(() => {
    if (projectKey) localStorage.setItem(STORAGE_KEY, projectKey);
  }, [projectKey]);

  const toast = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 5000); };
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

  return <main className="chat-studio-shell">
    {notice && <div className="toast"><Sparkles size={15} />{notice}</div>}
    <header className="chat-topbar"><div className="chat-brand"><span className="brand-spark"><Sparkles size={17} /></span><div><strong>貼圖大亨</strong><small>AI LINE 貼圖工作室</small></div></div>{project && <div className="project-chip"><span>專案</span><strong>{project.title}</strong><button onClick={() => { navigator.clipboard.writeText(project.projectKey); toast("專案代碼已複製，可在其他裝置續作"); }}>{project.projectKey}</button></div>}</header>
    <section className="chat-layout">
      <div className="conversation-column">
        {messages.length === 0 ? <div className="chat-welcome"><span className="eyebrow">AI STICKER STUDIO</span><h1>像聊天一樣，完成一整套貼圖。</h1><p>傳照片、描述角色，或直接告訴我你想做幾張 LINE 貼圖。角色理解、規劃、生成、修改與保存都會自動處理。</p><div className="suggestion-list">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => { setInput(suggestion); composerRef.current?.focus(); }}><Sparkles size={14} />{suggestion}</button>)}</div></div> : <div className="message-list">{messages.map((message) => <article key={message.id} className={`chat-message ${message.role}`}><div className="message-avatar">{message.role === "assistant" ? <Sparkles size={15} /> : "你"}</div><div className="message-content">{message.role === "assistant" ? <Streamdown>{message.content}</Streamdown> : <p>{message.content}</p>}{(attachmentsByMessage.get(message.id) ?? []).length > 0 && <div className="message-attachments">{attachmentsByMessage.get(message.id)!.map((attachment) => attachment.mimeType.startsWith("image/") ? <img key={attachment.id} src={attachment.url} alt={attachment.fileName} /> : <span key={attachment.id}><Paperclip size={13} />{attachment.fileName}</span>)}</div>}</div></article>)}</div>}
        <div className="composer-wrap"><div className="queued-files">{attachments.map((attachment) => <div className="queued-file" key={attachment.id}>{attachment.preview ? <img src={attachment.preview} alt="" /> : <Paperclip size={15} />}<span>{attachment.fileName}</span><button aria-label={`移除 ${attachment.fileName}`} onClick={() => setAttachments((items) => items.filter((item) => item.id !== attachment.id))}><X size={14} /></button></div>)}</div><div className="composer"><label className="attach-button" aria-label="上傳圖片或檔案"><ImagePlus size={19} /><input type="file" accept="image/*,.heic,.heif,.pdf" multiple onChange={handleFiles} /></label><textarea ref={composerRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="例如：幫我把這隻貓做成 8 張可愛的 LINE 貼圖，使用繁體中文。" rows={1} disabled={busy} /><button className="send-button" onClick={() => void submit()} disabled={busy || (!input.trim() && !attachments.length)}>{busy ? <Loader2 className="spin" size={18} /> : <Send size={18} />}</button></div><small>可上傳多張角色照片；HEIC 會在手機／瀏覽器端轉檔。按 Enter 送出，Shift + Enter 換行。</small></div>
      </div>
      <aside className="task-panel"><div className="task-panel-head"><div><span className="eyebrow">STICKER TASKS</span><h2>{project ? "製作進度" : "等待你的需求"}</h2></div>{project && <div className="panel-buttons"><button className="line-export-button" onClick={() => void exportPack()} disabled={busy || (studio.data?.scripts.some((script) => !script.resultUrl) ?? true)}><Download size={14} />LINE ZIP</button><button className="continue-button" onClick={() => void submit("繼續製作")} disabled={busy}><Play size={14} />繼續製作</button></div>}</div>{studio.isLoading ? <div className="panel-loading"><Loader2 className="spin" />正在載入專案…</div> : (studio.data?.scripts.length ?? 0) === 0 ? <div className="task-empty"><ImagePlus size={24} /><strong>從一段對話開始</strong><span>AI 會自動建立角色設定與貼圖清單。</span></div> : <div className="task-grid">{studio.data!.scripts.map((script) => { const job = studio.data!.jobs.filter((item) => item.scriptId === script.id && item.kind === "generate").at(-1); const taskStatus = job?.status ?? script.status; return <article className="sticker-task" key={script.id}><div className="task-image">{script.resultUrl ? <img src={script.resultUrl} alt={`第 ${script.position} 張 ${script.phrase}`} /> : <span>{script.position}</span>}<em className={`task-status ${taskStatus}`}>{statusLabel(taskStatus)}</em></div><div className="task-meta"><small>第 {script.position} 張 · {script.emotion}</small><strong>{script.phrase}</strong><div className="task-actions">{script.resultUrl && <button onClick={() => void exportSingle(script.position)} aria-label={`匯出第 ${script.position} 張 LINE PNG`} disabled={busy}><Download size={14} /></button>}<button onClick={() => requestEdit(script.position)} disabled={!script.resultUrl || busy}>告訴 AI 修改</button>{["failed", "error", "paused_quota"].includes(taskStatus) && <button onClick={() => void retry(script.position)} disabled={busy}><RefreshCw size={13} />重試</button>}</div></div></article>; })}</div>}</aside>
    </section>
  </main>;
}

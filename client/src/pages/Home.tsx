/* Design philosophy: editorial workbench meets Japanese stationery. Warm paper, ink-black hierarchy, vermilion proof marks, asymmetric creator-first layout. */
import { useEffect, useMemo, useRef, useState } from "react";
import { AIChatBox, type Message as ChatMessage } from "@/components/AIChatBox";
import { useAuth } from "@/_core/hooks/useAuth";
import JSZip from "jszip";
import { Download, ImagePlus, Layers3, MousePointer2, Play, RotateCcw, Sparkles, Wand2, X, Check, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { addRandomSticker, randomGenerationError, replaceStickerAt, updateStickerJobState } from "@/lib/randomStickerUi";
import type { RandomStickerCard } from "@/lib/randomStickerUi";
import { generateWithRetry, regenerateSingleSticker } from "@/lib/retryRandomSticker";
import { pickRandomStickerConcept } from "@/lib/stickerLanguage";
import { collectBatchResults, createBatchStickerJobs, createPlannedStickerJobs, mergeBatchResults, type BatchStickerJob } from "@/lib/batchGeneration";
import { buildLearningPayload, shouldSaveLearning } from "@/lib/learningUi";
import { LOTTERY_CONCEPTS, pickLotteryConcept, type LotteryConcept } from "@/lib/lotteryConcepts";
import { buildLotteryAgentState } from "@/lib/lotteryAgentUi";
import { getFeedbackStatusLabel, getFeedbackVoterToken, setFeedbackSort as normalizeFeedbackSort, shouldOpenFeedbackFromHash, validateFeedbackMessage } from "@/lib/feedbackUi";
import { buildTextRevisionPrompt, isExplicitStickerBrief, isNoIdeaRequest, isRevisionRequest, isTextRevisionRequest, normalizeStickerChatPlan, resolveStickerChatAction, type CharacterUpdate, type StickerPlanItem } from "@/lib/stickerChatFlow";
import { resolveLotteryChatPresentation } from "@/lib/lotteryChatUi";
import { buildLearningChatState } from "@/lib/learningChatUi";
import { readAnonymousLearning, rememberAnonymousLearning, type AnonymousLearningIdea } from "@/lib/anonymousLearning";
import { getOrCreateGuestKey, projectSnapshotStatus, readProjectId, serializeProjectSnapshot, writeProjectId, type ProjectSnapshot } from "@/lib/projectDraft";
import { LINE_HEIGHT, LINE_OUTPUTS, LINE_PACK_SIZES, LINE_WIDTH, buildLineDownloadPlan, isWithinLineZipLimit, lineOutputFileName, stickerTextFromLabel, validateLinePng } from "@/lib/lineExport";
import { MAX_REFERENCE_IMAGES } from "@shared/const";

type Mode = "random" | "agent" | "manual";

const asset = {
  mark: "/manus-storage/logo_eb1eca16.jpg",
  hero: "/manus-storage/sticker-muse-hero_4aa9242d.jpg",
  rabbit: "/manus-storage/rabbit-sticker_b3475c07.png",
  dog: "/manus-storage/dog-sticker_6c3a87c4.png",
  mouse: "/manus-storage/mouse-sticker_ac116650.png",
};

const modes = [
  { id: "random" as Mode, no: "01", title: "隨機生成", caption: "讀懂角色，再隨機安排動作。", icon: Sparkles },
  { id: "agent" as Mode, no: "02", title: "代理生成", caption: "告訴角色一句話，交給我。", icon: Wand2 },
  { id: "manual" as Mode, no: "03", title: "手動生成", caption: "自己排版，每個細節都算數。", icon: MousePointer2 },
];

type AssetCheck = { width: number; height: number; transparent: boolean; status: "ready" | "check" | "needs" };

function inspectImage(src: string, onDone: (result: AssetCheck) => void) {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(image.naturalWidth || LINE_WIDTH, 370);
    canvas.height = Math.min(image.naturalHeight || LINE_HEIGHT, 320);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let transparent = false;
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] < 250) { transparent = true; break; }
      }
    }
    const width = image.naturalWidth || LINE_WIDTH;
    const height = image.naturalHeight || LINE_HEIGHT;
    onDone({ width, height, transparent, status: width <= LINE_WIDTH && height <= LINE_HEIGHT && transparent ? "ready" : "needs" });
  };
  image.onerror = () => onDone({ width: 0, height: 0, transparent: false, status: "check" });
  image.src = src;
}

async function aiForeground(src: string, onProgress?: (progress: number) => void): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");
  const response = await fetch(src);
  const sourceBlob = await response.blob();
  return removeBackground(sourceBlob, {
    model: "isnet_quint8",
    device: "cpu",
    output: { format: "image/png" },
    progress: (_key: string, current: number, total: number) => onProgress?.(total ? Math.round((current / total) * 100) : 0),
  });
}

function drawStickerText(ctx: CanvasRenderingContext2D, label: string, width: number, height: number) {
  const text = stickerTextFromLabel(label);
  if (!text) return;
  const fontSize = Math.max(14, Math.round(Math.min(width, height) * 0.15));
  ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const maxWidth = width * 0.84;
  const lines: string[] = [];
  let line = "";
  for (const char of text) {
    const candidate = line + char;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = char;
    } else line = candidate;
  }
  if (line) lines.push(line);
  const lineHeight = fontSize * 1.15;
  const startY = height - lines.length * lineHeight / 2 - Math.max(10, height * 0.04);
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.96)";
  ctx.lineWidth = Math.max(4, fontSize * 0.18);
  ctx.fillStyle = "#2c1b16";
  lines.forEach((current, index) => {
    const y = startY + index * lineHeight;
    ctx.strokeText(current, width / 2, y);
    ctx.fillText(current, width / 2, y);
  });
}

async function renderLineAsset(src: string, width = LINE_WIDTH, height = LINE_HEIGHT, useAiBackgroundRemoval = true, onProgress?: (progress: number) => void, label = ""): Promise<Blob> {
  const foregroundBlob = useAiBackgroundRemoval ? await aiForeground(src, onProgress) : await (await fetch(src)).blob();
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.clearRect(0, 0, width, height);
      const scale = Math.min((width - 18) / image.naturalWidth, (height - 18) / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      drawStickerText(ctx, label, width, height);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed")), "image/png");
      URL.revokeObjectURL(image.src);
    };
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = URL.createObjectURL(foregroundBlob);
  });
}

const toLinePng = (src: string, useAiBackgroundRemoval = true, onProgress?: (progress: number) => void) => renderLineAsset(src, LINE_WIDTH, LINE_HEIGHT, useAiBackgroundRemoval, onProgress);

function withTimeout<T>(promise: Promise<T>, milliseconds: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error("AI 聊天回應逾時，請再試一次。")), milliseconds)),
  ]);
}

async function fileToDataUrl(file: File, mimeType = file.type || (file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif") ? "image/heic" : "application/octet-stream")) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Image encoding failed"));
        return;
      }
      resolve(reader.result.replace(/^data:[^;,]+;/, `data:${mimeType};`));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Image encoding failed"));
    reader.readAsDataURL(file);
  });
}

async function imageInputFromSource(src: string) {
  const response = await fetch(src);
  if (!response.ok) throw new Error("Unable to read source image");
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Image encoding failed"));
    reader.onerror = () => reject(reader.error ?? new Error("Image encoding failed"));
    reader.readAsDataURL(blob);
  });
  const comma = dataUrl.indexOf(",");
  return { b64Json: comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl, mimeType: blob.type || "image/png" };
}

const starterStickers: RandomStickerCard[] = [
  { src: asset.rabbit, label: "兔子／睡著了", color: "sage" },
  { src: asset.dog, label: "狗狗／真棒", color: "red" },
  { src: asset.mouse, label: "老鼠／好餓", color: "gold" },
];

export default function Home() {
  const { user } = useAuth();
  const [guestKey] = useState(() => getOrCreateGuestKey(typeof window === "undefined" ? null : window.localStorage));
  const [projectId, setProjectId] = useState<number | null>(() => readProjectId(typeof window === "undefined" ? null : window.localStorage));
  const projectIdRef = useRef<number | null>(projectId);
  const projectCreationRef = useRef<Promise<number | null> | null>(null);
  const hasHydratedProject = useRef(false);
  const learnedIdeasQuery = trpc.learning.list.useQuery(undefined, { enabled: Boolean(user) });
  const saveLearnedIdea = trpc.learning.save.useMutation({ onSuccess: () => { void learnedIdeasQuery.refetch(); } });
  const [learningEnabled, setLearningEnabled] = useState(true);
  const [anonymousLearningIdeas, setAnonymousLearningIdeas] = useState<AnonymousLearningIdea[]>(() => readAnonymousLearning(typeof window === "undefined" ? null : window.localStorage));
  const availableLearningIdeas = useMemo(() => user ? (learnedIdeasQuery.data ?? []).map((idea) => ({ sourceMode: idea.sourceMode, text: idea.text, action: idea.action, creative: idea.creative ?? "" })) : anonymousLearningIdeas, [anonymousLearningIdeas, learnedIdeasQuery.data, user]);
  const learnedConcepts = useMemo(() => learningEnabled ? availableLearningIdeas.map((idea, index) => ({ key: `learned:${index}:${idea.text}`, scenarioKey: `learned:${index}:${idea.text}`, scenario: "你的創作風格", text: idea.text, action: idea.action })) : [], [availableLearningIdeas, learningEnabled]);
  const learningChatState = useMemo(() => buildLearningChatState({ authenticated: Boolean(user), enabled: learningEnabled, ideas: availableLearningIdeas }), [availableLearningIdeas, learningEnabled, user]);
  const chatLearnedIdeas = learningChatState.learnedIdeas;

  const [mode, setMode] = useState<Mode>("agent");
  const [prompt, setPrompt] = useState("這隻狗說：真棒");
  const [uploaded, setUploaded] = useState<string[]>([asset.dog]);
  const [sourceAssetIds, setSourceAssetIds] = useState<number[]>([]);
  const [planItems, setPlanItems] = useState<StickerPlanItem[]>([]);
  const [characterProfile, setCharacterProfile] = useState<CharacterUpdate | null>(null);
  const [jobStates, setJobStates] = useState<Array<{ position: number; status: string; errorMessage?: string }>>([]);
  const [imagePrompts, setImagePrompts] = useState<string[]>(["這隻狗說：真棒"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [retryingIndex, setRetryingIndex] = useState<number | null>(null);
  const [recentConceptKeys, setRecentConceptKeys] = useState<string[]>([]);
  const [recentLotteryIds, setRecentLotteryIds] = useState<string[]>([]);
  const [lotteryConcept, setLotteryConcept] = useState<LotteryConcept | null>(null);
  const [lotteryImageUrl, setLotteryImageUrl] = useState("");
  const [lotteryBusy, setLotteryBusy] = useState(false);
  const [chatLotteryVisible, setChatLotteryVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ role: "assistant", content: "嗨，我是 Sticker Muse。想製作 LINE 貼圖嗎？你可以直接告訴我想做什麼；如果還沒決定，我會先問你要隨機生成，還是簡單描述貼圖內容。" }]);
  const [chatAttachmentNames, setChatAttachmentNames] = useState<string[]>([]);
  const [latestGeneratedLabel, setLatestGeneratedLabel] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(() => typeof window !== "undefined" && shouldOpenFeedbackFromHash(window.location.hash));
  const [feedbackCategory, setFeedbackCategory] = useState<"suggestion" | "bug" | "feature" | "other">("suggestion");
  const [feedbackSort, setFeedbackSort] = useState<"latest" | "popular">("latest");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackContact, setFeedbackContact] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [specReady, setSpecReady] = useState(false);
  const [packSize, setPackSize] = useState<number>(8);
  const [generated, setGenerated] = useState<RandomStickerCard[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [chatPreviewOpen, setChatPreviewOpen] = useState(false);
  const [chatStickerIndex, setChatStickerIndex] = useState(0);
  const [chatTone, setChatTone] = useState<"light" | "soft" | "dark">("light");
  const [assetChecks, setAssetChecks] = useState<Record<string, AssetCheck>>({ [asset.dog]: { width: 1024, height: 1024, transparent: true, status: "needs" } });
  const randomGenerate = trpc.stickers.randomGenerate.useMutation();
  const lotteryGenerate = trpc.stickers.lotteryGenerate.useMutation();
  const stickerChatPlan = trpc.stickerChat.plan.useMutation();
  const createProject = trpc.projects.create.useMutation();
  const saveProjectSnapshot = trpc.projects.saveSnapshot.useMutation();
  const uploadProjectAsset = trpc.projects.uploadAsset.useMutation();
  const analyzeCharacter = trpc.character.analyze.useMutation();
  const projectAccess = useMemo(() => projectId ? { projectId, guestKey: guestKey ?? undefined } : undefined, [guestKey, projectId]);
  const projectResume = trpc.projects.resume.useQuery(projectAccess ?? { projectId: 0, guestKey: guestKey ?? undefined }, { enabled: Boolean(projectAccess) });
  const feedbackSubmit = trpc.feedback.submit.useMutation({ onSuccess: (result) => { setFeedbackMessage(""); setFeedbackContact(""); void publicFeedback.refetch(); toast.success(result.notified ? "回饋已送出" : "回饋已保存", { description: result.notified ? "謝謝你的建議，我會收到通知。" : "通知服務暫時忙碌，但內容已保存。" }); }, onError: (error) => { toast.error("回饋送出失敗", { description: error.message || "請稍後再試。" }); } });
  const publicFeedback = trpc.feedback.publicList.useQuery({ sort: feedbackSort });
  const feedbackVote = trpc.feedback.vote.useMutation({ onSuccess: (result) => { void publicFeedback.refetch(); if (!result.added) toast.info("你已經支持過這則建議了"); }, onError: (error) => { toast.error("+1 失敗", { description: error.message || "請稍後再試。" }); } });
  const feedbackList = trpc.feedback.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const feedbackStatus = trpc.feedback.updateStatus.useMutation({ onSuccess: () => { void feedbackList.refetch(); } });
  const feedbackVisibility = trpc.feedback.updateVisibility.useMutation({ onSuccess: () => { void feedbackList.refetch(); void publicFeedback.refetch(); } });
  const fileRef = useRef<HTMLInputElement>(null);

  const activeMode = useMemo(() => modes.find((item) => item.id === mode)!, [mode]);
  const completionPercent = Math.min(100, Math.round((generated.length / packSize) * 100));
  const remainingStickers = Math.max(0, packSize - generated.length);
  const plannedPositions = useMemo(() => {
    const positions = planItems.length ? planItems.map((item) => item.position) : jobStates.map((job) => job.position);
    return Array.from(new Set(positions)).sort((a, b) => a - b);
  }, [jobStates, planItems]);
  const completedJobCount = jobStates.length ? jobStates.filter((job) => job.status === "completed").length : generated.length;
  const failedJobCount = jobStates.filter((job) => job.status === "failed").length;
  const activeJobCount = jobStates.filter((job) => job.status === "generating" || job.status === "retrying").length;
  const totalJobCount = planItems.length || packSize;
  const jobStatusForPosition = (position: number) => jobStates.find((job) => job.position === position)?.status ?? "pending";
  const jobStatusLabel = (status: string) => status === "completed" ? "完成" : status === "failed" ? "失敗" : status === "retrying" ? "重試" : status === "generating" ? "生成中" : "待處理";
  const lotteryChatPresentation = resolveLotteryChatPresentation({ visible: chatLotteryVisible, hasConcept: Boolean(lotteryConcept), hasImage: Boolean(lotteryImageUrl) });
  const projectPackSize = packSize === 16 ? 16 : packSize === 24 ? 24 : packSize === 32 ? 32 : packSize === 40 ? 40 : 8;
  const projectSnapshot = useMemo<ProjectSnapshot>(() => ({
    mode,
    prompt,
    uploaded,
    sourceAssetIds,
    imagePrompts,
    planItems,
    characterProfile,
    jobStates,
    generated,
    chatMessages,
    chatAttachmentNames,
    latestGeneratedLabel,
    lotteryConcept,
    lotteryImageUrl,
    packSize: projectPackSize,
    learningEnabled,
  }), [characterProfile, chatAttachmentNames, chatMessages, generated, imagePrompts, jobStates, learningEnabled, latestGeneratedLabel, lotteryConcept, lotteryImageUrl, mode, planItems, projectPackSize, prompt, sourceAssetIds, uploaded]);

  async function ensureProjectId() {
    if (projectIdRef.current) return projectIdRef.current;
    if (projectCreationRef.current) return projectCreationRef.current;
    if (!guestKey && !user) return null;
    const creation = (async () => {
      const result = await createProject.mutateAsync({
        name: "我的 LINE 貼圖草稿",
        packSize: projectPackSize,
        stateJson: serializeProjectSnapshot(projectSnapshot),
        guestKey: guestKey ?? undefined,
      });
      projectIdRef.current = result.projectId;
      setProjectId(result.projectId);
      writeProjectId(typeof window === "undefined" ? null : window.localStorage, result.projectId);
      return result.projectId;
    })();
    projectCreationRef.current = creation;
    try {
      return await creation;
    } finally {
      projectCreationRef.current = null;
    }
  }

  async function persistProject(reason = "autosave", status = projectSnapshotStatus(projectSnapshot)) {
    const id = await ensureProjectId();
    if (!id) return;
    await saveProjectSnapshot.mutateAsync({
      projectId: id,
      guestKey: guestKey ?? undefined,
      packSize: projectPackSize,
      stateJson: serializeProjectSnapshot(projectSnapshot),
      status,
      reason,
    });
  }

  async function persistGeneratedResult(url: string, position: number) {
    try {
      const id = await ensureProjectId();
      if (!id) return { url };
      const response = await fetch(url);
      if (!response.ok) return { url };
      const blob = await response.blob();
      const mimeType = blob.type.startsWith("image/") ? blob.type : "image/png";
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Generated image encoding failed"));
        reader.onerror = () => reject(reader.error ?? new Error("Generated image encoding failed"));
        reader.readAsDataURL(blob);
      });
      const stored = await uploadProjectAsset.mutateAsync({
        projectId: id,
        guestKey: guestKey ?? undefined,
        kind: "generated",
        position: Math.max(0, Math.min(39, position - 1)),
        fileName: `sticker-${String(position).padStart(2, "0")}.png`,
        mimeType,
        dataUrl,
      });
      return { url: stored.asset.url, assetId: stored.asset.id };
    } catch (error) {
      console.warn("Generated asset persistence failed", error);
      return { url };
    }
  }

  useEffect(() => {
    const state = projectResume.data?.state as Partial<ProjectSnapshot> | undefined;
    if (!state || hasHydratedProject.current) return;
    if (state.mode === "random" || state.mode === "agent" || state.mode === "manual") setMode(state.mode);
    if (typeof state.prompt === "string") setPrompt(state.prompt);
    if (Array.isArray(state.uploaded)) setUploaded(state.uploaded.filter((item): item is string => typeof item === "string"));
    if (Array.isArray(state.sourceAssetIds)) setSourceAssetIds(state.sourceAssetIds.filter((item): item is number => typeof item === "number"));
    if (Array.isArray(state.imagePrompts)) setImagePrompts(state.imagePrompts.filter((item): item is string => typeof item === "string"));
    if (Array.isArray(state.planItems)) setPlanItems(state.planItems as StickerPlanItem[]);
    if (state.characterProfile && typeof state.characterProfile === "object") setCharacterProfile(state.characterProfile as CharacterUpdate);
    if (Array.isArray(state.jobStates)) setJobStates(state.jobStates as Array<{ position: number; status: string; errorMessage?: string }>);
    if (Array.isArray(projectResume.data?.jobs) && projectResume.data.jobs.length) setJobStates(projectResume.data.jobs.map((job) => ({ position: job.position, status: job.status, ...(job.errorMessage ? { errorMessage: job.errorMessage } : {}) })));
    if (Array.isArray(state.generated)) setGenerated(state.generated as RandomStickerCard[]);
    if (Array.isArray(state.chatMessages)) setChatMessages(state.chatMessages as ChatMessage[]);
    if (Array.isArray(state.chatAttachmentNames)) setChatAttachmentNames(state.chatAttachmentNames.filter((item): item is string => typeof item === "string"));
    if (typeof state.latestGeneratedLabel === "string") setLatestGeneratedLabel(state.latestGeneratedLabel);
    if (typeof state.lotteryImageUrl === "string") setLotteryImageUrl(state.lotteryImageUrl);
    if (state.lotteryConcept && typeof state.lotteryConcept === "object") {
      setLotteryConcept(state.lotteryConcept as LotteryConcept);
      setChatLotteryVisible(true);
    }
    if (typeof state.packSize === "number" && [8, 16, 24, 32, 40].includes(state.packSize)) setPackSize(state.packSize);
    if (typeof state.learningEnabled === "boolean") setLearningEnabled(state.learningEnabled);
    hasHydratedProject.current = true;
  }, [projectResume.data]);

  useEffect(() => {
    if (projectId && (!projectResume.data || projectResume.isLoading || projectResume.isError || !hasHydratedProject.current)) return;
    const timer = window.setTimeout(() => {
      void persistProject("autosave").catch((error) => console.warn("Project autosave failed", error));
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [projectId, projectResume.data, projectResume.isError, projectResume.isLoading, projectSnapshot]);

  function switchMode(next: Mode) {
    setMode(next);
    if (next === "random") setPrompt("讓這幾個角色做一件出乎意料的事");
    if (next === "agent") setPrompt("這隻狗說：真棒");
    if (next === "manual") setPrompt("好餓");
  }

  function drawLottery(fromChat = false) {
    const concept = pickLotteryConcept(recentLotteryIds);
    setLotteryConcept(concept);
    setLotteryImageUrl("");
    setRecentLotteryIds((current) => [concept.id, ...current].slice(0, 12));
    if (fromChat) setChatLotteryVisible(true);
  }

  async function generateLotteryConcept(concept: LotteryConcept, fromChat = false) {
    setLotteryConcept(concept);
    setLotteryBusy(true);
    try {
      const result = await lotteryGenerate.mutateAsync({ text: concept.text, action: concept.action, character: concept.character, creative: concept.creative });
      const label = `${concept.character}／${concept.text}`;
      const stored = await persistGeneratedResult(result.url, generated.length + 1);
      setLotteryImageUrl(stored.url);
      setGenerated((current) => mergeBatchResults(current, [{ src: stored.url, label, color: "gold", ...(stored.assetId !== undefined ? { assetId: stored.assetId } : {}) }], packSize));
      setLatestGeneratedLabel(label);
      setChatMessages((current) => fromChat ? [...current, { role: "assistant", content: `我抽到「${concept.text}」：${concept.action}。貼圖已生成，你可以直接告訴我想怎麼修改，例如「文字改成早安」或「表情更可愛」。` }] : current);
      toast.success("抽獎貼圖完成", { description: "喜歡這個靈感嗎？可以直接在聊天框提出修改。" });
    } catch (error) {
      const description = error instanceof Error ? error.message : "請稍後再試";
      toast.error("抽獎生成失敗", { description });
      if (fromChat) setChatMessages((current) => [...current, { role: "assistant", content: "我已抽出靈感，但目前 AI 圖片服務暫時無法生成，可能是服務忙碌或額度已用完。你可以稍後再試，或先告訴我想修改的文字與動作。" }]);
    } finally {
      setLotteryBusy(false);
    }
  }

  async function generateLotterySticker() {
    const concept = lotteryConcept ?? pickLotteryConcept(recentLotteryIds);
    setLotteryConcept(concept);
    await generateLotteryConcept(concept);
  }

  function useLotteryInAgent() {
    if (!lotteryConcept) return;
    const state = buildLotteryAgentState(lotteryConcept, lotteryImageUrl);
    setMode("agent");
    setPrompt(state.prompt);
    setImagePrompts(state.imagePrompts);
    if (state.uploaded.length) setUploaded(state.uploaded);
    toast.success("已帶入代理生成", { description: `文字與動作已帶入：${lotteryConcept.action}` });
  }

  async function handleStickerChatMessage(content: string) {
    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", content }];
    setChatMessages(nextMessages);
    setChatBusy(true);
    try {
          const rawPlan = await withTimeout(stickerChatPlan.mutateAsync({ messages: nextMessages.map(({ role, content: messageContent }) => ({ role: role === "user" ? "user" : "assistant", content: messageContent })), uploadedCount: uploaded.length, attachmentNames: chatAttachmentNames, hasGeneratedResult: Boolean(latestGeneratedLabel), latestGeneratedLabel, learnedIdeas: chatLearnedIdeas, currentPackSize: projectPackSize, characterSummary: characterProfile ? JSON.stringify(characterProfile) : "", projectStatus: projectResume.data?.project.status ?? "draft", continueRequested: /繼續製作|繼續生成|接著做/.test(content) }), 25_000);
      const basePlan = normalizeStickerChatPlan(rawPlan);
      if (basePlan.packSize !== packSize) setPackSize(basePlan.packSize);
      if (basePlan.planItems.length) setPlanItems(basePlan.planItems);
      if (basePlan.characterUpdate) setCharacterProfile(basePlan.characterUpdate);
      const plan = isNoIdeaRequest(content) && !latestGeneratedLabel
        ? { ...basePlan, intent: "lottery" as const, readyToGenerate: true, mode: null, useLottery: true, useLatestResult: false, reply: basePlan.reply || "我先替你抽一組靈感。" }
        : isRevisionRequest(content) && Boolean(latestGeneratedLabel)
          ? { ...basePlan, intent: "refine" as const, readyToGenerate: true, mode: isTextRevisionRequest(content) ? "manual" as const : "agent" as const, useLottery: false, useLatestResult: true, prompt: isTextRevisionRequest(content) ? buildTextRevisionPrompt(content).prompt : (basePlan.prompt || content), action: isTextRevisionRequest(content) ? buildTextRevisionPrompt(content).action : (basePlan.action || content), reply: basePlan.reply || "我會沿用上一張貼圖幫你修改。" }
          : uploaded.length > 0 && isExplicitStickerBrief(content)
            ? { ...basePlan, intent: "agent" as const, shouldAskChoice: false, readyToGenerate: true, mode: "agent" as const, useLottery: false, useLatestResult: false, prompt: basePlan.prompt || `依照上傳照片中的角色，${content}`, action: basePlan.action || content, reply: "我會根據你上傳的照片與這段描述直接製作貼圖。" }
            : basePlan;
      setChatMessages((current) => [...current, { role: "assistant", content: plan.reply }]);
      const action = resolveStickerChatAction(plan, Math.max(1, uploaded.length), uploaded.length);
      if (action.shouldResume) {
        const nextPosition = projectResume.data?.nextPosition ?? jobStates.find((job) => job.status !== "completed")?.position ?? 1;
        const remainingItems = plan.planItems.filter((item) => item.position >= nextPosition && !jobStates.some((job) => job.position === item.position && job.status === "completed"));
        if (!uploaded.length) {
          setChatMessages((current) => [...current, { role: "assistant", content: "我找到未完成的貼圖了，請先重新放入原本的角色照片，我就會從中斷的位置繼續。" }]);
        } else if (!remainingItems.length) {
          setChatMessages((current) => [...current, { role: "assistant", content: "目前沒有需要續作的貼圖；已完成的結果會保留在貨架上。" }]);
        } else {
          const resumeDraft = action.draft ?? { mode: "agent" as const, prompt: plan.prompt || prompt || "沿用原本角色設定繼續製作", imagePrompts: Array.from({ length: uploaded.length }, () => plan.prompt || prompt) };
          setMode(resumeDraft.mode);
          setPrompt(resumeDraft.prompt);
          setImagePrompts(resumeDraft.imagePrompts);
          const resumed = await createSticker({ ...resumeDraft, plannedItems: remainingItems, chatContext: true });
          setChatMessages((current) => [...current, { role: "assistant", content: resumed ? `已從第 ${nextPosition} 張繼續製作，之前完成的貼圖不會重做。` : "續作暫時未完成，原本進度已保存；稍後輸入「繼續製作」即可再試。" }]);
        }
      } else if (action.shouldDrawLottery) {
        // Chat lottery must use the same draw state as the BONUS card. The user
        // sees the concept first, then chooses whether to generate it.
        drawLottery(true);
      } else if (action.shouldRefineLatest && action.draft && generated.length) {
          const requestedPosition = action.targetPositions?.[0];
        const targetIndex = requestedPosition && requestedPosition >= 1 && requestedPosition <= generated.length ? requestedPosition - 1 : 0;
        const target = generated[targetIndex];
        if (!target) {
          setChatMessages((current) => [...current, { role: "assistant", content: "我找不到要修改的那一張貼圖，請告訴我目前貨架上的第幾張。" }]);
          return;
        }
        setMode(action.draft.mode);
        setPrompt(action.draft.prompt);
        setImagePrompts([action.draft.prompt]);
        setUploaded([target.src]);
        const revised = await createSticker({ ...action.draft, imagePrompts: [action.draft.prompt], uploaded: [target.src], replaceIndex: targetIndex, revisionPrompt: action.draft.mode === "manual" ? action.draft.prompt : undefined, chatContext: true });
        setChatMessages((current) => [...current, { role: "assistant", content: revised ? "已沿用上一張貼圖重新調整，結果已更新在貼圖貨架；你可以繼續提出下一個修改。" : "這次修改尚未完成，可能是 AI 圖片服務暫時忙碌或額度已用完。原本貼圖仍保留，你可以稍後再試。" }]);
      } else if (action.draft) {
        setMode(action.draft.mode);
        setPrompt(action.draft.prompt);
        setImagePrompts(action.draft.imagePrompts);
        if (action.shouldGenerate) {
          await createSticker({ ...action.draft, plannedItems: plan.planItems });
          setChatMessages((current) => [...current, { role: "assistant", content: "貼圖已送進工作台，完成後會出現在右側貼圖貨架。你也可以繼續告訴我下一張想怎麼改。" }]);
        } else if (action.needsUpload) {
          setChatMessages((current) => [...current, { role: "assistant", content: `這個方向已準備好！請先上傳 1 至 ${MAX_REFERENCE_IMAGES} 張角色照片，我就能開始製作。` }]);
        }
      }
    } catch (error) {
      console.error("Sticker chat planning failed", error);
      toast.error("聊天規劃暫時失敗", { description: error instanceof Error ? error.message : "請稍後再試。" });
      setChatMessages((current) => [...current, { role: "assistant", content: error instanceof Error && error.message.includes("逾時") ? "我回應得有點慢，請再按一次送出；這次不會鎖住輸入框。" : "我暫時無法整理這句話，請再說一次你想製作的角色、文字或動作。" }]);
    } finally {
      setChatBusy(false);
    }
  }

  function submitFeedback() {
    const message = feedbackMessage.trim();
    if (!validateFeedbackMessage(message)) {
      toast.error("請再多寫一點", { description: "回饋內容至少需要 5 個字。" });
      return;
    }
    feedbackSubmit.mutate({ category: feedbackCategory, message, contact: feedbackContact.trim() || undefined, page: window.location.pathname });
  }

  function inspectAsset(src: string) {
    setAssetChecks((current) => ({ ...current, [src]: { width: 0, height: 0, transparent: false, status: "check" } }));
    inspectImage(src, (result) => setAssetChecks((current) => ({ ...current, [src]: result })));
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, MAX_REFERENCE_IMAGES);
    const oversized = selected.find((file) => file.size > 8 * 1024 * 1024);
    if (oversized) {
      toast.error("素材太大", { description: `「${oversized.name}」超過 8 MB，請先壓縮或選擇較小的圖片。` });
      return;
    }
    const localPreviews = selected.map((file) => URL.createObjectURL(file));
    setUploaded(localPreviews);
    setChatAttachmentNames(selected.map((file) => file.name));
    setImagePrompts(localPreviews.map((_, index) => imagePrompts[index] ?? (mode === "agent" ? prompt : "")));
    localPreviews.forEach(inspectAsset);
    toast.success(`已放入 ${selected.length} 張素材`, { description: "照片已同步到聊天框，正在保存到此專案。" });
    try {
      const id = await ensureProjectId();
      if (!id) return;
      const stored = await Promise.all(selected.map(async (file, index) => {
        const mimeType = file.type || (file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif") ? "image/heic" : "application/octet-stream");
        const dataUrl = await fileToDataUrl(file, mimeType);
        const result = await uploadProjectAsset.mutateAsync({ projectId: id, guestKey: guestKey ?? undefined, kind: "source", position: index, fileName: file.name, mimeType, dataUrl });
        return { id: result.asset.id, url: result.asset.url };
      }));
      const storedUrls = stored.map((item) => item.url);
      setUploaded(storedUrls);
      const storedAssetIds = stored.map((item) => item.id);
      setSourceAssetIds(storedAssetIds);
      storedUrls.forEach(inspectAsset);
      toast.success("素材已保存", { description: "重新開啟這個瀏覽器專案時，原始圖片仍可繼續使用。" });
      if (storedAssetIds.length) {
        void analyzeCharacter.mutateAsync({ projectId: id, guestKey: guestKey ?? undefined, sourceAssetIds: storedAssetIds, hint: prompt }).then((result) => {
          setCharacterProfile({ species: result.profile.species, appearance: [result.profile.identity, result.profile.face, result.profile.hairOrFur, result.profile.body, result.profile.colors, result.profile.proportions].filter(Boolean).join("；"), clothing: result.profile.clothing, accessories: result.profile.accessories, styleAnchors: result.profile.styleAnchors, preserve: result.profile.preserve, negative: result.profile.negative });
          setChatMessages((current) => [...current, { role: "assistant", content: "我已整理這些照片的角色特徵，接下來會用同一份角色設定維持每張貼圖一致。" }]);
        }).catch((error) => {
          console.warn("Character analysis failed", error);
          setChatMessages((current) => [...current, { role: "assistant", content: "照片已保存；角色分析暫時未完成，我仍會先用你的原圖製作，稍後可以再試一次分析。" }]);
        });
      }
    } catch (error) {
      console.warn("Project asset upload failed", error);
      toast.warning("素材暫存在本頁", { description: "目前無法保存到專案；本頁仍可繼續製作，但重新整理後需重新上傳。" });
    }
  }

  function removeChatAttachment(index: number) {
    setChatAttachmentNames((current) => current.filter((_, item) => item !== index));
    setUploaded((current) => current.filter((_, item) => item !== index));
    setSourceAssetIds((current) => current.filter((_, item) => item !== index));
    setImagePrompts((current) => current.filter((_, item) => item !== index));
  }

  async function processTransparency() {
    if (!uploaded.length) return;
    setIsProcessing(true);
    try {
      setProcessingProgress(4);
      const processed = await Promise.all(uploaded.map(async (src, index) => URL.createObjectURL(await toLinePng(src, true, (progress) => setProcessingProgress(Math.min(96, Math.round(((index + progress / 100) / uploaded.length) * 96)))))));
      setUploaded(processed);
      processed.forEach(inspectAsset);
      setProcessingProgress(100);
      toast.success("AI 去背完成", { description: "已保留角色輪廓，並套用透明背景與 370 × 320 px 畫布。" });
    } catch {
      toast.error("透明背景處理失敗", { description: "請換一張 PNG 或 JPG 圖片再試一次。" });
    } finally { window.setTimeout(() => { setIsProcessing(false); setProcessingProgress(0); }, 400); }
  }

  async function prepareLineSet() {
    if (!generated.length || isProcessing) return;
    setIsProcessing(true);
    setProcessingProgress(2);
    try {
      const source = generated[0].src;
      await Promise.all(LINE_OUTPUTS.filter((item) => item.key !== "sticker").map((item, index) => renderLineAsset(source, item.width, item.height, true, (progress) => setProcessingProgress(Math.min(96, Math.round(((index + progress / 100) / 3) * 96))), "")));
      setSpecReady(true);
      setProcessingProgress(100);
      toast.success("LINE 四類尺寸已整理", { description: "主圖、貼圖、聊天縮圖與標籤圖都已準備好。" });
    } catch { toast.error("尺寸整理失敗", { description: "請確認貼圖素材仍可讀取。" }); }
    finally { window.setTimeout(() => { setIsProcessing(false); setProcessingProgress(0); }, 400); }
  }

  async function exportZip() {
    if (generated.length !== packSize) {
      toast.error("貼圖組數量尚未符合 LINE 規定", { description: generated.length < packSize ? `目前有 ${generated.length} 張，還需要 ${packSize - generated.length} 張。` : `目前有 ${generated.length} 張，請移除 ${generated.length - packSize} 張。` });
      return;
    }
    if (!generated.length) return;
    const zip = new JSZip();
    try {
      setIsProcessing(true);
      setProcessingProgress(3);
      const stickerBlobs = await Promise.all(generated.map(async (sticker, index) => {
        const blob = await renderLineAsset(sticker.src, LINE_WIDTH, LINE_HEIGHT, true, (progress) => setProcessingProgress(Math.min(88, Math.round(((index + progress / 100) / generated.length) * 88))), sticker.label);
        const check = await validateLinePng(blob, LINE_WIDTH, LINE_HEIGHT);
        if (!check.valid) throw new Error(`LINE PNG 檢查未通過：${lineOutputFileName(index + 1)}`);
        return blob;
      }));
      stickerBlobs.forEach((blob, index) => zip.file(lineOutputFileName(index + 1), blob));
      const source = generated[0].src;
      const extras = await Promise.all(LINE_OUTPUTS.filter((item) => item.key !== "sticker").map((item) => renderLineAsset(source, item.width, item.height, true)));
      const extraOutputs = LINE_OUTPUTS.filter((item) => item.key !== "sticker");
      await Promise.all(extras.map(async (blob, index) => {
        const output = extraOutputs[index]!;
        const check = await validateLinePng(blob, output.width, output.height);
        if (!check.valid) throw new Error(`LINE PNG 檢查未通過：${output.file}`);
        zip.file(output.file, blob);
      }));
      const totalBytes = [...stickerBlobs, ...extras].reduce((sum, blob) => sum + blob.size, 0);
      if (!isWithinLineZipLimit(totalBytes)) throw new Error("整套 ZIP 超過 LINE 60 MB 上限，請減少圖片數量或壓縮素材。");
      zip.file("README.txt", "隨心所遇貼圖製作\nLINE 靜態貼圖輸出規格\n主圖：240 × 240 px\n貼圖圖片：370 × 320 px\n聊天縮圖：96 × 74 px\n標籤圖：96 × 74 px\n全部為透明背景 PNG，ZIP 已自動縮放與置中。\n");
      const file = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "隨心所遇貼圖組.zip";
      anchor.click();
      URL.revokeObjectURL(url);
      setProcessingProgress(100);
      toast.success(`已打包 ${generated.length} 張貼圖`, { description: "AI 去背與 ZIP 下載已完成。" });
    } catch {
      toast.error("ZIP 匯出失敗", { description: "請確認貼圖素材仍可讀取，或稍後再試。" });
    } finally { window.setTimeout(() => { setIsProcessing(false); setProcessingProgress(0); }, 400); }
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    setGenerated((current) => {
      const next = [...current];
      const [moved] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDraggedIndex(null);
    toast.success("貼圖順序已更新", { description: "ZIP 匯出會依照目前編號排列。" });
  }

  async function generateRandomWithRetry(source: string, action: string) {
    const originalImage = await imageInputFromSource(source);
    return generateWithRetry((input) => randomGenerate.mutateAsync(input), { prompt: action, originalImage }, 3, (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds)));
  }

  async function retrySticker(index: number) {
    const sticker = generated[index];
    if (!sticker?.source || !sticker.action) {
      toast.info("這張貼圖沒有可重試的隨機來源", { description: "請重新使用隨機生成建立一張可重試貼圖。" });
      return;
    }
    setRetryingIndex(index);
    setJobStates((current) => updateStickerJobState(current, index + 1, "retrying"));
    try {
      const refreshed = await regenerateSingleSticker(sticker, imageInputFromSource, (input) => randomGenerate.mutateAsync(input), (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds)));
      const stored = await persistGeneratedResult(refreshed.src, index + 1);
      setGenerated((current) => replaceStickerAt(current, index, { url: stored.url, assetId: stored.assetId ?? null }));
      setJobStates((current) => updateStickerJobState(current, index + 1, "completed"));
      toast.success(`第 ${String(index + 1).padStart(2, "0")} 張已重新生成`, { description: "原本的角色照片與動作需求已保留。" });
    } catch (error) {
      console.error("Single sticker retry failed", error);
      const failure = randomGenerationError();
      setJobStates((current) => updateStickerJobState(current, index + 1, "failed", error instanceof Error ? error.message : "單張重試失敗"));
      toast.error(failure.title, { description: "這張貼圖重試三次仍未完成，原本結果已保留。" });
    } finally {
      setRetryingIndex(null);
    }
  }

  async function createSticker(overrides?: { mode: Mode; prompt: string; imagePrompts: string[]; uploaded?: string[]; plannedItems?: StickerPlanItem[]; replaceIndex?: number; revisionPrompt?: string; chatContext?: boolean }): Promise<boolean> {
    const modeForGeneration = overrides?.mode ?? mode;
    const promptForGeneration = overrides?.prompt ?? prompt;
    const imagePromptsForGeneration = overrides?.imagePrompts ?? imagePrompts;
    const uploadedForGeneration = overrides?.uploaded ?? uploaded;
    if (!uploadedForGeneration.length) {
      toast.error("請先放入角色照片", { description: "每張上傳照片都會對應產出一張貼圖。" });
      if (overrides?.chatContext) setChatMessages((current) => [...current, { role: "assistant", content: "請先上傳照片，我才能依照這個方向製作貼圖。" }]);
      return false;
    }

    const sourceName = (source: string, index: number) => source === asset.rabbit ? "兔子" : source === asset.dog ? "狗狗" : source === asset.mouse ? "老鼠" : `素材 ${String(index + 1).padStart(2, "0")}`;
    const colors = ["sage", "red", "gold"] as const;
    const sources = uploadedForGeneration.slice(0, MAX_REFERENCE_IMAGES);
    setIsGenerating(true);
    setGenerationProgress(4);

    if (modeForGeneration === "manual" && overrides?.revisionPrompt) {
      const revisionResults = await Promise.all(sources.map(async (source, index) => {
        try {
          const originalImage = await imageInputFromSource(source);
          const result = await randomGenerate.mutateAsync({ prompt: overrides.revisionPrompt!, originalImage });
          const stored = await persistGeneratedResult(result.url, (overrides?.replaceIndex ?? index) + 1);
          return { src: stored.url, ...(stored.assetId !== undefined ? { assetId: stored.assetId } : {}), label: `${sourceName(source, index)}／${imagePromptsForGeneration[index]?.trim() || promptForGeneration}`, action: overrides.revisionPrompt ?? promptForGeneration, source, color: colors[index % colors.length] };
        } catch (error) {
          console.error("Manual text revision failed", error);
          return null;
        }
      }));
      const cards = revisionResults.filter((card): card is { src: string; assetId?: number; label: string; action: string; source: string; color: typeof colors[number] } => Boolean(card));
      setJobStates(revisionResults.map((card, index) => ({ position: overrides?.replaceIndex !== undefined ? overrides.replaceIndex + 1 : index + 1, status: card ? "completed" : "failed", ...(card ? {} : { errorMessage: "文字微調生成失敗" }) })));
      if (cards.length) {
        setGenerated((current) => overrides?.replaceIndex !== undefined ? replaceStickerAt(current, overrides.replaceIndex, { url: cards[0]!.src, label: cards[0]!.label, action: cards[0]!.action, source: cards[0]!.source, color: cards[0]!.color, assetId: cards[0]!.assetId ?? null }) : mergeBatchResults(current, cards, packSize));
        setLatestGeneratedLabel(cards[0]?.label ?? "");
        setGenerationProgress(100);
        toast.success(`已完成 ${cards.length} 張文字微調`, { description: "已保留角色與構圖，只更新文字修改要求。" });
      } else {
        toast.error("文字微調失敗", { description: "AI 圖片服務暫時無法生成，原本貼圖仍保留。" });
      }
      window.setTimeout(() => { setIsGenerating(false); setGenerationProgress(0); }, 400);
      if (!cards.length && overrides?.chatContext) setChatMessages((current) => [...current, { role: "assistant", content: "文字微調尚未完成，原本貼圖仍保留；你可以稍後再試。" }]);
      return cards.length > 0;
    }

    if (modeForGeneration === "manual") {
      const cards = sources.map((source, index) => ({ src: source, label: `${sourceName(source, index)}／${imagePromptsForGeneration[index]?.trim() || promptForGeneration || "好餓"}`, color: colors[index % colors.length] }));
      setJobStates(cards.map((_, index) => ({ position: index + 1, status: "completed" })));
      setGenerated((current) => mergeBatchResults(current, cards, packSize));
      setLatestGeneratedLabel(cards[0]?.label ?? "");
      if (learningEnabled) {
        cards.forEach((card, index) => { const text = imagePromptsForGeneration[index]?.trim() || promptForGeneration || "好餓"; const payload = buildLearningPayload("manual", text, `角色呈現「${text}」並搭配手動對話框`, card.label); if (!payload) return; if (user) saveLearnedIdea.mutate(payload); else setAnonymousLearningIdeas((current) => rememberAnonymousLearning(typeof window === "undefined" ? null : window.localStorage, payload)); });
      }
      setGenerationProgress(100);
      toast.success(`已完成 ${cards.length} 張手動貼圖`, { description: "每張角色照片都已建立對應的貼圖草稿。" });
      window.setTimeout(() => { setIsGenerating(false); setGenerationProgress(0); }, 400);
      return true;
    }

    const plannedJobs: BatchStickerJob[] = overrides?.plannedItems?.length ? createPlannedStickerJobs(sources, modeForGeneration, overrides.plannedItems, promptForGeneration) : [];
    const jobs: BatchStickerJob[] = plannedJobs.length ? plannedJobs : createBatchStickerJobs(sources, modeForGeneration, promptForGeneration, imagePromptsForGeneration, (keys) => pickRandomStickerConcept(keys, Math.random, learnedConcepts), recentConceptKeys);
    setJobStates(jobs.map((job, index) => ({ position: job.position ?? index + 1, status: "generating" })));
    if (modeForGeneration === "random") {
      setRecentConceptKeys((current) => [...jobs.map((job) => job.scenarioKey).filter((key): key is string => Boolean(key)), ...current].slice(0, 8));
    }

    const characterConsistencyPrompt = characterProfile ? `角色一致性錨點：${characterProfile.species}；外觀：${characterProfile.appearance}；服裝：${characterProfile.clothing}；配件：${characterProfile.accessories}；畫風：${characterProfile.styleAnchors}。必須保留：${characterProfile.preserve.join("、")}。避免：${characterProfile.negative.join("、")}` : "";
    let lastGenerationError: unknown;
    const results = await Promise.all(jobs.map(async (job) => {
      try {
        const generationPrompt = [characterConsistencyPrompt, job.prompt || "", `動作與情境：${job.action}`].filter(Boolean).join("。 ");
        const result = await generateRandomWithRetry(job.source, generationPrompt);
        setGenerationProgress((current) => Math.min(96, current + Math.round(92 / jobs.length)));
        return { job, result };
      } catch (error) {
        lastGenerationError = error;
        console.error("Batch sticker generation failed", error);
        return { job, result: null, errorMessage: error instanceof Error ? error.message : String(error) };
      }
    }));

    setJobStates(results.map(({ job, result, errorMessage }, index) => ({ position: overrides?.replaceIndex !== undefined ? overrides.replaceIndex + 1 : job.position ?? index + 1, status: result ? "completed" : "failed", ...(errorMessage ? { errorMessage } : {}) })));
    const collected = collectBatchResults(results);
    const cards = await Promise.all(collected.successful.map(async ({ job, result }) => {
      const stored = await persistGeneratedResult(result.url, job.position ?? job.sourceIndex + 1);
      return {
        src: stored.url,
        ...(stored.assetId !== undefined ? { assetId: stored.assetId } : {}),
        label: `${sourceName(job.source, job.sourceIndex)}／${job.text}`,
        color: colors[job.sourceIndex % colors.length],
        source: job.source,
        action: job.action,
      };
    }));
    const failedCount = collected.failedCount;
    if (cards.length) {
      setGenerated((current) => overrides?.replaceIndex !== undefined ? replaceStickerAt(current, overrides.replaceIndex, { url: cards[0]!.src, label: cards[0]!.label, action: cards[0]!.action, source: cards[0]!.source, color: cards[0]!.color, assetId: cards[0]!.assetId ?? null }) : mergeBatchResults(current, cards, packSize));
      setLatestGeneratedLabel(cards[0]?.label ?? "");
    }
    if (modeForGeneration === "agent" && learningEnabled) {
      collected.successful.forEach(({ job }) => { const payload = buildLearningPayload("agent", job.text, job.action, job.scenario); if (!payload) return; if (user) saveLearnedIdea.mutate(payload); else setAnonymousLearningIdeas((current) => rememberAnonymousLearning(typeof window === "undefined" ? null : window.localStorage, payload)); });
    }
    setGenerationProgress(100);
    if (cards.length && failedCount === 0) {
      toast.success(`AI 已完成 ${cards.length} 張貼圖`, { description: modeForGeneration === "random" ? "每張角色照片都已各自生成不同情境。" : "每張角色照片都已各自套用你的指定句子。" });
    } else if (cards.length) {
      toast.warning(`已完成 ${cards.length} 張，${failedCount} 張生成失敗`, { description: "成功的貼圖已保留，你可以重新上傳或稍後重試失敗素材。" });
    } else {
      const failure = randomGenerationError(sources.length, lastGenerationError);
      toast.error(failure.title, { description: failure.description });
    }
    window.setTimeout(() => { setIsGenerating(false); setGenerationProgress(0); }, 400);
    if (!cards.length && overrides?.chatContext) setChatMessages((current) => [...current, { role: "assistant", content: "這次修改尚未完成，可能是 AI 圖片服務暫時忙碌或額度已用完。原本貼圖仍保留，你可以稍後再試。" }]);
    return cards.length > 0;
  }

  async function downloadSticker(sticker: RandomStickerCard, position: number) {
    if (!generated.includes(sticker)) {
      toast.info("這是示例貼圖", { description: "先用 AI 對話框生成你的貼圖，完成後即可下載真正的 LINE PNG。" });
      return;
    }
    try {
      setIsProcessing(true);
      const blob = await renderLineAsset(sticker.src, LINE_WIDTH, LINE_HEIGHT, true, undefined, sticker.label);
      const plan = await buildLineDownloadPlan(blob, position + 1, LINE_WIDTH, LINE_HEIGHT);
      if (!plan.canDownload) throw new Error("LINE PNG 規格檢查未通過，請確認圖片仍可讀取。");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = lineOutputFileName(position + 1);
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(`「${sticker.label}」已下載`, { description: "已套用透明背景、370 × 320 px 與繁體中文後製繪字。" });
    } catch (error) {
      toast.error("單張 PNG 匯出失敗", { description: error instanceof Error ? error.message : "請確認貼圖素材仍可讀取。" });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <img src={asset.mark} alt="隨心所遇標誌" className="brand-mark" />
          <div><div className="brand-name">隨心所遇</div><div className="brand-sub">貼圖製作 STUDIO</div></div>
        </div>
        <div className="side-rule" />
        <div className="side-kicker">CREATOR'S DESK <span>✳</span></div>
        <nav className="side-nav" aria-label="主要功能">
          <button className="nav-item active"><Layers3 size={16} />製作工作台 <span>現在</span></button>
          <button className="nav-item" onClick={() => toast.info("貼圖組功能正在整理中")}>▦ 我的貼圖組 <span>0</span></button>
          <button className="nav-item" onClick={() => toast.info("尺寸檢查會在匯出時開啟")}>⌁ LINE 尺寸檢查</button>
          <button className="nav-item feedback-entry" onClick={() => setFeedbackOpen(true)}>✎ 意見回饋 {user?.role === "admin" && <span>{feedbackList.data?.filter((item) => item.status === "new").length ?? 0}</span>}</button>
        </nav>
        <div className="side-bottom">
          <div className="mini-note"><span className="note-pin">●</span><div><b>小提示</b><p>一句話就能讓角色有自己的語氣。</p></div></div>
          <div className="version">隨心所遇貼圖製作 <span>v0.8</span></div>
        </div>
      </aside>

      <main className="workbench">
        <header className="topbar"><div className="breadcrumb"><span>工作台</span><ChevronRight size={13} /><b>我的 LINE 貼圖草稿</b></div><div className="top-actions"><span className="status-dot" /> {projectResume.isFetching ? "正在載入草稿" : saveProjectSnapshot.isPending || createProject.isPending ? "正在保存" : "草稿已自動保存"} <button className="save-project-button" onClick={() => void persistProject("manual-save")} disabled={saveProjectSnapshot.isPending || createProject.isPending}>立即保存</button><button className="avatar">S</button></div></header>
        <section className="hero-strip">
          <div className="hero-copy"><div className="eyebrow"><span className="red-line" /> STICKER EDITOR / 001</div><h1>製作屬於你的<em>貼圖。</em></h1><p>從一張照片開始，把角色、日常對話與你的靈感，做成可以分享的 LINE 貼圖。</p><div className="hero-meta"><span>↳ 三種製作方式</span><span>↳ 即時預覽</span><span>↳ 可直接匯出</span></div></div>
          <div className="hero-image"><img src={asset.hero} alt="兔子、狗狗與老鼠的紙張拼貼" /><div className="hero-stamp">今日<br /><strong>有靈感</strong></div></div>
        </section>

        <div className="content-grid">
          <section className="editor-panel">
            <div className="section-heading"><div><div className="section-index">01 / TALK TO YOUR CREATOR</div><h2>先聊聊你的貼圖</h2></div><span className="paper-tag">AI WORKFLOW</span></div>
            <div className="sticker-chat-card"><div className="sticker-chat-heading"><div><div className="section-index">AI CREATOR CONVERSATION</div><h3>直接跟我說，你想做什麼貼圖</h3><p>不用先選模式。AI 會先理解你的需求，也會參考你在這個瀏覽器保存的創作風格。登入後也可同步到你的帳戶。</p></div><div className="chat-learning-controls"><span className="chat-mode-badge">{learningChatState.badge}</span><button className="chat-learning-control" onClick={() => setLearningEnabled((current) => !current)}>{learningChatState.controlLabel}</button></div></div><AIChatBox messages={chatMessages} onSendMessage={(content) => void handleStickerChatMessage(content)} onAttachFiles={(files) => onFiles(files)} attachmentNames={chatAttachmentNames} attachmentPreviews={uploaded.slice(0, chatAttachmentNames.length)} onRemoveAttachment={removeChatAttachment} isLoading={chatBusy || isGenerating || lotteryBusy} height={360} placeholder="例如：我想做一組兔子日常貼圖…" emptyStateMessage="告訴我你想製作的貼圖，我會先幫你分流。" suggestedPrompts={["我想製作 LINE 貼圖", "我沒有想法，幫我抽一張靈感", "讓我的狗狗說：今天也很棒"]} />{(planItems.length > 0 || characterProfile) && <div className="ai-plan-summary"><span className="ai-plan-summary-dot" />{planItems.length > 0 ? `AI 已規劃 ${planItems.length} 張貼圖` : "AI 正在整理套組計畫"}<small>{characterProfile ? "已鎖定角色外觀，後續貼圖會沿用" : "會依你的描述自動安排動作與情境"}</small></div>}{(planItems.length > 0 || jobStates.length > 0) && <div className="studio-job-summary" aria-label="AI 貼圖逐張製作狀態"><div className="studio-job-summary-head"><b>逐張製作狀態</b><span>{Math.min(completedJobCount, totalJobCount)} / {totalJobCount} 已完成</span></div><div className="studio-job-summary-counts"><span>{activeJobCount ? `生成中 ${activeJobCount} 張` : "目前已自動保存"}</span><span className={failedJobCount ? "has-failures" : "no-failures"}>{failedJobCount ? `需要重試 ${failedJobCount} 張` : "目前沒有失敗項目"}</span></div><div className="studio-job-dots">{(plannedPositions.length ? plannedPositions : Array.from({ length: Math.min(packSize, 8) }, (_, index) => index + 1)).slice(0, 8).map((position) => { const status = jobStatusForPosition(position); return <span key={position} className={`studio-job-dot ${status}`} title={`第 ${position} 張：${jobStatusLabel(status)}`} aria-label={`第 ${position} 張：${jobStatusLabel(status)}`}>{position}</span>; })}{Math.max(0, (plannedPositions.length || packSize) - 8) > 0 && <small>+{Math.max(0, (plannedPositions.length || packSize) - 8)} 張</small>}</div></div>}{lotteryChatPresentation.showCard && lotteryConcept && <div className="chat-lottery-card"><div className="chat-lottery-label">BONUS / STICKER LOTTERY</div><div className="chat-lottery-main"><div><b>{lotteryConcept.text}</b><small>{lotteryConcept.character} · {lotteryConcept.action}</small><em>{lotteryConcept.creative}</em></div>{lotteryImageUrl ? <img src={lotteryImageUrl} alt={`${lotteryConcept.text} Lottery 貼圖`} /> : <div className="chat-lottery-placeholder">尚未生成圖片</div>}</div><div className="chat-lottery-actions"><button onClick={() => drawLottery(true)} disabled={lotteryBusy}>再抽一組</button><button onClick={() => void generateLotteryConcept(lotteryConcept, true)} disabled={lotteryBusy || !lotteryChatPresentation.canGenerate}>{lotteryBusy ? "AI 生成中…" : "生成這張貼圖"}</button>{lotteryChatPresentation.canUseInAgent && <button onClick={useLotteryInAgent}>帶入代理修改</button>}</div></div>}</div>
            <div className="public-feedback-card"><div className="public-feedback-head"><div><div className="section-index">OPEN CREATOR WALL</div><h3>大家的建議</h3><p>每個人留下的想法，都會成為 Sticker Muse 下一步的靈感。</p></div><div className="public-feedback-actions"><select aria-label="建議排序" value={feedbackSort} onChange={(event) => setFeedbackSort(normalizeFeedbackSort(feedbackSort, event.target.value))}><option value="latest">最新留言</option><option value="popular">最多按讚</option></select><button className="public-feedback-add" onClick={() => setFeedbackOpen(true)}>留下建議</button></div></div>{publicFeedback.isLoading ? <p className="public-feedback-empty">正在讀取大家的想法…</p> : publicFeedback.isError ? <p className="public-feedback-empty">暫時讀不到留言，請稍後再試。</p> : publicFeedback.data?.length ? <div className="public-feedback-list">{publicFeedback.data.slice(0, 8).map((item) => <article className="public-feedback-item" key={item.id}><div className="public-feedback-meta"><span>{item.category === "bug" ? "錯誤回報" : item.category === "feature" ? "功能需求" : item.category === "other" ? "其他" : "使用建議"}</span><time>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("zh-TW") : "剛剛"}</time></div><p>{item.message}</p><div className="public-feedback-bottom"><small>匿名創作者</small><div className="public-feedback-vote"><span className={`feedback-status status-${item.status}`}>{getFeedbackStatusLabel(item.status)}</span><button onClick={() => feedbackVote.mutate({ id: item.id, voterToken: getFeedbackVoterToken(typeof window === "undefined" ? null : window.localStorage) })} disabled={feedbackVote.isPending}>+1 <b>{item.upvotes}</b></button></div></div></article>)}</div> : <p className="public-feedback-empty">還沒有公開建議，成為第一位留下想法的人吧。</p>}<div className="public-feedback-foot"><span>公開留言不會顯示聯絡方式</span><button onClick={() => setFeedbackOpen(true)}>查看並留言 <ChevronRight size={13} /></button></div></div><div className="lottery-card"><div className="lottery-card-head"><div><span className="section-index">BONUS / STICKER LOTTERY</span><h3>不放照片，也能抽一張貼圖</h3><p>從 {LOTTERY_CONCEPTS.length} 組原創情境抽靈感，像抽獎一樣隨機生成。</p></div><span className="lottery-count">{LOTTERY_CONCEPTS.length} 組</span></div><div className="lottery-actions"><button className="lottery-draw" onClick={() => drawLottery()} disabled={lotteryBusy}>抽一組靈感</button><button className="lottery-generate" onClick={generateLotterySticker} disabled={lotteryBusy}>{lotteryBusy ? "AI 生成中…" : "生成這張貼圖"}</button></div>{lotteryConcept && <div className="lottery-result"><div><b>{lotteryConcept.text}</b><small>{lotteryConcept.character} · {lotteryConcept.action}</small><em>{lotteryConcept.creative}</em></div><div className="lottery-result-actions">{lotteryImageUrl && <button onClick={useLotteryInAgent}>帶入代理修改</button>}<button onClick={() => drawLottery()}>再抽一組</button></div></div>}</div>

            <div className="section-heading compact"><div><div className="section-index">02 / ADD YOUR MATERIAL</div><h2>{activeMode.title}</h2><small className="material-mode-note">{mode === "random" ? "每張照片都會各自生成一張隨機貼圖" : mode === "agent" ? "每張角色照片都會各自套用你的指定句子" : "每張角色照片都會各自建立對話框"}</small></div><span className="material-count">{uploaded.length} 張素材</span></div>
            <div className="material-zone">
              <div className="upload-row">
                <div className="upload-copy"><div className="upload-icon"><ImagePlus size={19} /></div><div><b>把角色放進來</b><p>支援 JPG、PNG、HEIC、HEIF，一次放入最多 4 張參考圖；每張會各自產出貼圖</p></div></div>
                <input ref={fileRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/heic,image/heif,.heic,.heif" multiple onChange={(event) => onFiles(event.target.files)} />
                <button className="outline-button" onClick={() => fileRef.current?.click()}>選擇圖片 <ChevronRight size={14} /></button>
              </div>
              <div className="thumb-row">{uploaded.map((src, index) => <div className="material-item" key={`${src}-${index}`}><div className="thumb"><img src={src} alt={`已上傳素材 ${index + 1}`} /><button aria-label={`移除素材 ${index + 1}`} onClick={() => { setUploaded((current) => current.filter((_, item) => item !== index)); setImagePrompts((current) => current.filter((_, item) => item !== index)); }}><X size={12} /></button></div><input className="image-prompt-input" value={imagePrompts[index] ?? ""} onChange={(event) => setImagePrompts((current) => current.map((value, item) => item === index ? event.target.value : value))} placeholder={mode === "random" ? "可選：這張想做什麼？" : "這張要說什麼？"} maxLength={80} aria-label={`第 ${index + 1} 張素材專屬提示`} /></div>)}<button className="add-thumb" onClick={() => fileRef.current?.click()}><span>＋</span><small>再放一張</small></button></div>
              <div className="asset-quality"><div className="quality-title"><b>LINE 規格檢查</b><span>主圖建議 370 × 320 px · 首次 AI 處理會下載模型</span></div><div className="quality-items">{uploaded.slice(0, MAX_REFERENCE_IMAGES).map((src, index) => { const result = assetChecks[src]; return <div className="quality-item" key={src}><span className={`quality-icon ${result?.status === "ready" ? "ok" : result?.status === "needs" ? "warn" : "pending"}`}>{result?.status === "ready" ? "✓" : result?.status === "needs" ? "!" : "·"}</span><span>素材 {index + 1}</span><small>{result?.status === "check" ? "檢查中" : result?.width ? `${result.width} × ${result.height} · ${result.transparent ? "透明" : "需去背"}` : "等待檢查"}</small></div> })}</div><button className="transparent-button" onClick={processTransparency} disabled={isProcessing || !uploaded.length}>{isProcessing ? `AI 語意去背中 ${processingProgress}%` : "AI 語意去背／透明 PNG"}<ChevronRight size={14} /></button></div>
            </div>

            <div className="prompt-block"><label htmlFor="prompt"><span className="section-index">03 / MAKE YOUR STICKER</span><span>{mode === "manual" ? "對話框文字" : "你想讓角色做什麼？"}</span></label><div className="prompt-input-wrap"><textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={2} placeholder="輸入一句話，或描述一個動作…" /><span className="char-count">{prompt.length} / 80</span></div><div className="prompt-hint"><Info size={13} /> {mode === "random" ? "系統會逐張讀取你提供的照片，保留角色外觀，再隨機安排動作或情緒。" : mode === "manual" ? "文字會直接放入貼圖對話框，生成後仍可修改。" : "越像平常說話的句子，角色就越有個性。"}</div></div>
            <button className="generate-button" onClick={() => void createSticker()} disabled={isGenerating || uploaded.length === 0}><span className="button-seal">{isGenerating ? <RotateCcw className="spin" size={20} /> : <Play size={17} fill="currentColor" />}</span><span>{isGenerating ? mode === "manual" ? `正在建立 ${uploaded.length} 張貼圖…` : `AI 正在製作 ${uploaded.length} 張貼圖 ${generationProgress}%` : `生成 ${uploaded.length || 1} 張貼圖`}</span><ChevronRight size={18} /></button>
          </section>

          <aside className="preview-panel"><div className="preview-top"><div><div className="section-index">04 / YOUR STICKER SHELF</div><h2>剛剛做好的</h2></div><span className={`preview-count ${generated.length === packSize ? "valid" : "invalid"}`}>{generated.length} / {packSize}</span><button className="chat-preview-button" onClick={() => setChatPreviewOpen((current) => !current)}>{chatPreviewOpen ? "關閉聊天室" : "聊天室預覽"}<ChevronRight size={13} /></button></div><div className="pack-size-panel"><div><b>選擇貼圖組數</b><small>LINE 靜態貼圖可選 8、16、24、32 或 40 張</small></div><div className="pack-size-options">{LINE_PACK_SIZES.map((size) => <button key={size} className={packSize === size ? "selected" : ""} onClick={() => setPackSize(size)}>{size}</button>)}</div><div className={`pack-status ${generated.length === packSize ? "ready" : "needs"}`}>{generated.length === packSize ? "✓ 數量符合，可匯出" : generated.length < packSize ? `還需要 ${remainingStickers} 張貼圖` : `請移除 ${generated.length - packSize} 張貼圖`}</div><div className="completion-meter" role="progressbar" aria-label="貼圖組完成度" aria-valuenow={completionPercent} aria-valuemin={0} aria-valuemax={100}><div className="completion-meter-top"><span>貼圖組完成度</span><strong>{completionPercent}%</strong></div><div className="completion-track"><div className={`completion-fill ${completionPercent === 100 ? "complete" : ""}`} style={{ width: `${completionPercent}%` }} /></div><div className="completion-caption"><span>已完成 {generated.length} / {packSize} 張</span><span>{remainingStickers ? `還差 ${remainingStickers} 張` : "可以開始匯出"}</span></div></div></div><div className="line-spec-panel"><div className="line-spec-header"><div><b>LINE 輸出規格</b><small>四種尺寸會自動縮放、置中與保留透明背景</small></div><span className={`spec-badge ${specReady ? "ready" : "pending"}`}>{specReady ? "已整理" : "待整理"}</span></div><div className="line-spec-grid">{LINE_OUTPUTS.map((item) => <div className="line-spec-item" key={item.key}><span className={`spec-check ${specReady ? "done" : ""}`}>{specReady ? "✓" : "·"}</span><div><b>{item.label}</b><small>{item.size} px</small></div></div>)}</div><button className="auto-scale-button" onClick={prepareLineSet} disabled={isProcessing || !generated.length}>{isProcessing ? `自動整理中 ${processingProgress}%` : "自動縮放全部輸出"}<ChevronRight size={13} /></button></div><div className="shelf-rule"><span /> 拖曳卡片調整順序</div><div className="sticker-shelf">{(generated.length ? generated : starterStickers).map((sticker, index) => <article className={`sticker-card ${sticker.color} ${draggedIndex === index ? "dragging" : ""}`} key={`${sticker.label}-${index}`} draggable onDragStart={() => handleDragStart(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => handleDrop(index)} onDragEnd={() => setDraggedIndex(null)} aria-label={`第 ${index + 1} 張貼圖：${sticker.label}`}><div className="sticker-art"><span className="sticker-order">{String(index + 1).padStart(2, "0")}</span><img src={sticker.src} alt={sticker.label} /><div className="sticker-caption">{sticker.label.split("／")[1]}</div></div><div className="sticker-footer"><span><i /> {index === 0 ? "剛剛" : "草稿"}</span><div className="sticker-actions">{sticker.source && sticker.action && <button className="retry-button" onClick={(event) => { event.stopPropagation(); void retrySticker(index); }} disabled={retryingIndex === index || isGenerating} aria-label={`重新生成第 ${index + 1} 張貼圖`}>{retryingIndex === index ? <RotateCcw className="spin" size={12} /> : <RotateCcw size={12} />}<span>{retryingIndex === index ? "重試中" : "重來"}</span></button>}<button onClick={() => void downloadSticker(sticker, index)} aria-label={`匯出${sticker.label}`}><Download size={14} /></button></div></div></article>)}</div><div className="export-box"><div><b>{generated.length === packSize ? "貼圖組數量已就位" : "貼圖組還在成形"}</b><p>{isProcessing ? `AI 去背、四類尺寸與打包中 ${processingProgress}%` : generated.length === packSize ? `共 ${packSize} 張，符合 LINE 規定。` : `完成 ${packSize} 張後才可下載 ZIP。`}</p></div><button onClick={exportZip} disabled={generated.length !== packSize || isProcessing}><Download size={13} /> 下載 ZIP <ChevronRight size={14} /></button></div></aside>
        </div>
        {chatPreviewOpen && <section className={`chat-preview ${chatTone}`} aria-label="LINE 聊天室貼圖預覽"><div className="chat-preview-heading"><div><div className="section-index">05 / CHATROOM PREVIEW</div><h2>放進對話裡看看</h2><p>切換貼圖，確認在實際聊天室中的大小與背景對比。</p></div><button className="close-chat-preview" onClick={() => setChatPreviewOpen(false)}>關閉 <X size={14} /></button></div><div className="chat-preview-layout"><div className="chat-window"><div className="chat-window-top"><span className="chat-back">‹</span><div className="contact-avatar">M</div><div><b>毛毛的日常</b><small>線上 · 今天有靈感</small></div><span className="chat-more">···</span></div><div className="chat-date">今天 10:24</div><div className="chat-messages"><div className="chat-bubble other">早安！今天想做什麼？</div><div className="chat-bubble mine">先做一張貼圖看看。</div><div className="chat-sticker-message"><img src={generated[chatStickerIndex]?.src || asset.dog} alt="聊天室中的貼圖" /><span>已送出 · 10:25</span></div></div><div className="chat-composer"><span>＋</span><div>輸入訊息…</div><span>☺</span></div></div><div className="chat-controls"><div className="chat-control-title"><b>預覽控制</b><span>目前第 {String(Math.min(chatStickerIndex + 1, generated.length)).padStart(2, "0")} 張</span></div><div className="chat-sticker-picker">{(generated.length ? generated : starterStickers).map((sticker, index) => <button key={`${sticker.label}-chat-${index}`} className={chatStickerIndex === index ? "selected" : ""} onClick={() => setChatStickerIndex(index)}><img src={sticker.src} alt={`選擇第 ${index + 1} 張貼圖`} /><small>{String(index + 1).padStart(2, "0")}</small></button>)}</div><div className="chat-tone-label">聊天室背景對比</div><div className="chat-tone-options">{(["light", "soft", "dark"] as const).map((tone) => <button key={tone} className={chatTone === tone ? "selected" : ""} onClick={() => setChatTone(tone)}>{tone === "light" ? "淺色" : tone === "soft" ? "柔和" : "深色"}</button>)}</div><div className="chat-preview-note"><Info size={13} /> 貼圖會以聊天中的自然大小顯示，方便檢查淺色角色的可讀性。</div></div></div></section>}
        {feedbackOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2b1d18]/45 p-4" role="dialog" aria-modal="true" aria-label="意見回饋"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#d9bfa7] bg-[#fffaf2] p-5 shadow-2xl sm:p-7"><div className="mb-5 flex items-start justify-between gap-4"><div><div className="section-index">CREATOR FEEDBACK</div><h2 className="mt-1 text-2xl font-semibold text-[#42291f]">把想法留在這裡</h2><p className="mt-1 text-sm text-[#795b4b]">遇到問題、想到新功能，或只是想告訴我哪裡可以更好，都可以直接回報。</p></div><button className="rounded-full border border-[#d9bfa7] px-3 py-1 text-sm text-[#795b4b]" onClick={() => setFeedbackOpen(false)}>關閉</button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-[#42291f]">回饋類型<select className="mt-1 w-full rounded-lg border border-[#d9bfa7] bg-white px-3 py-2" value={feedbackCategory} onChange={(event) => setFeedbackCategory(event.target.value as typeof feedbackCategory)}><option value="suggestion">使用建議</option><option value="bug">錯誤回報</option><option value="feature">功能需求</option><option value="other">其他</option></select></label><label className="text-sm text-[#42291f]">聯絡方式（選填）<input className="mt-1 w-full rounded-lg border border-[#d9bfa7] bg-white px-3 py-2" value={feedbackContact} onChange={(event) => setFeedbackContact(event.target.value)} placeholder="Email 或其他聯絡方式" maxLength={320} /></label></div><label className="mt-4 block text-sm text-[#42291f]">你的回饋<textarea className="mt-1 min-h-28 w-full rounded-lg border border-[#d9bfa7] bg-white px-3 py-2" value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} placeholder="例如：代理生成很方便，但希望可以選擇貼圖風格。" maxLength={2000} /></label><div className="mt-4 flex justify-end"><button className="rounded-lg bg-[#a64b32] px-5 py-2 font-medium text-white disabled:opacity-50" onClick={submitFeedback} disabled={feedbackSubmit.isPending}>{feedbackSubmit.isPending ? "送出中…" : "送出回饋"}</button></div>{user?.role === "admin" && <div className="mt-8 border-t border-[#e5cfbb] pt-5"><div className="mb-3 flex items-center justify-between"><div><div className="section-index">OWNER INBOX</div><h3 className="text-lg font-semibold text-[#42291f]">收到的回饋</h3></div><button className="text-sm text-[#a64b32]" onClick={() => void feedbackList.refetch()}>重新整理</button></div>{feedbackList.isLoading ? <p className="text-sm text-[#795b4b]">讀取中…</p> : feedbackList.data?.length ? <div className="space-y-3">{feedbackList.data.map((item) => <article key={item.id} className="rounded-xl border border-[#e5cfbb] bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold text-[#a64b32]">{item.category === "bug" ? "錯誤回報" : item.category === "feature" ? "功能需求" : item.category === "other" ? "其他" : "使用建議"}</span><select className="rounded border border-[#d9bfa7] px-2 py-1 text-xs" value={item.status} onChange={(event) => feedbackStatus.mutate({ id: item.id, status: event.target.value as "new" | "reviewing" | "resolved" })}><option value="new">新回饋</option><option value="reviewing">處理中</option><option value="resolved">已完成</option></select></div><p className="mt-2 whitespace-pre-wrap text-sm text-[#42291f]">{item.message}</p><p className="mt-2 text-xs text-[#795b4b]">{item.contact || "未留聯絡方式"} · {item.page || "未提供頁面"}</p><button className="mt-2 text-xs text-[#a64b32]" onClick={() => feedbackVisibility.mutate({ id: item.id, isPublic: !item.isPublic })}>{item.isPublic ? "從公開留言牆隱藏" : "恢復公開顯示"}</button></article>)}</div> : <p className="text-sm text-[#795b4b]">目前還沒有回饋。</p>}</div>}</div></div>}
      </main>
    </div>
  );
}

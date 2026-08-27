/**
 * Style reminder — 靜水編輯室：初始畫面以光學置中的 Composer 與大量留白邀請書寫；進入對話後，Composer 平滑沉入底部。
 */

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import AIComposer from "@/components/chat/AIComposer";
import MessageList from "@/components/chat/MessageList";
import type { Attachment, ChatMessageData } from "@/components/chat/chat-types";
import { useChatStream } from "@/hooks/useChatStream";
import type { AttachmentMeta, PersistedChatMessage } from "@shared/chat";

const HERO_IMAGE = "/manus-storage/suixin-hero-paper-mist_e02f08ca.jpg";
const LOGO_URL = "/manus-storage/suixin-logo-mark_0f74f416.png";

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const CLIENT_ID_KEY = "suixin.phase2.client-id";
const THREAD_ID_KEY = "suixin.phase2.thread-id";

function getClientId() {
  const existing = window.localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(CLIENT_ID_KEY, next);
  return next;
}

function fromPersistedMessage(message: PersistedChatMessage): ChatMessageData {
  return {
    id: message.id,
    role: message.role === "tool" ? "assistant" : message.role,
    content: message.content,
    attachments: message.attachments.map(attachment => ({
      id: attachment.id,
      name: attachment.name,
      type: attachment.mimeType,
      url: attachment.source?.value ?? "",
      size: attachment.size,
      source: attachment.source,
    })),
    toolCalls: message.toolCalls,
  };
}

export default function Home() {
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [threadId, setThreadId] = useState<string | undefined>();
  const [clientId, setClientId] = useState<string | undefined>();
  const [loadError, setLoadError] = useState<string | null>(null);
  const { start, stop } = useChatStream();
  const activeChat = messages.length > 0;
  const isStreaming = messages.some((message) => message.isStreaming);

  const stopStream = useCallback(() => {
    stop();
    setMessages((current) => current.map((message) => (message.isStreaming ? { ...message, isStreaming: false } : message)));
  }, [stop]);

  useEffect(() => () => stopStream(), [stopStream]);

  useEffect(() => {
    const savedClientId = getClientId();
    setClientId(savedClientId);
    const savedThreadId = window.localStorage.getItem(THREAD_ID_KEY);
    if (!savedThreadId) return;

    const loadHistory = async () => {
      try {
        const response = await fetch(`/api/chat/thread?threadId=${encodeURIComponent(savedThreadId)}&clientId=${encodeURIComponent(savedClientId)}`, { credentials: "include" });
        if (!response.ok) throw new Error("找不到先前的對話紀錄。");
        const data = await response.json() as { threadId: string; messages: PersistedChatMessage[] };
        setThreadId(data.threadId);
        setMessages(data.messages.map(fromPersistedMessage));
      } catch (error) {
        window.localStorage.removeItem(THREAD_ID_KEY);
        setLoadError(error instanceof Error ? error.message : "無法載入先前的對話紀錄。");
      }
    };
    void loadHistory();
  }, []);

  const submitMessage = useCallback(() => {
    const content = draft.trim();
    if ((!content && !attachments.length) || isStreaming || !clientId) return;
    const userMessage: ChatMessageData = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      attachments,
    };
    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessageData = { id: assistantId, role: "assistant", content: "", isStreaming: true };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setDraft("");
    setAttachments([]);
    setLoadError(null);

    const transportAttachments: AttachmentMeta[] = attachments.map(attachment => ({
      id: attachment.id,
      name: attachment.name,
      mimeType: attachment.type,
      size: attachment.size,
      source: attachment.source,
    }));
    void start({
      threadId,
      clientId,
      messageId: userMessage.id,
      message: content,
      attachments: transportAttachments,
    }, {
      onMeta: nextThreadId => {
        setThreadId(nextThreadId);
        window.localStorage.setItem(THREAD_ID_KEY, nextThreadId);
      },
      onDelta: text => setMessages(current => current.map(message => message.id === assistantId ? { ...message, content: message.content + text } : message)),
      onTool: toolCall => setMessages(current => current.map(message => message.id === assistantId ? { ...message, toolCalls: [...(message.toolCalls ?? []), toolCall] } : message)),
      onStatus: () => undefined,
      onDone: () => setMessages(current => current.map(message => message.id === assistantId ? { ...message, isStreaming: false } : message)),
      onError: errorMessage => {
        setLoadError(errorMessage);
        setMessages(current => current.map(message => message.id === assistantId ? {
          ...message,
          content: message.content || "抱歉，這次回覆暫時無法完成。請再試一次。",
          isStreaming: false,
        } : message));
      },
    });
  }, [attachments, clientId, draft, isStreaming, start, threadId]);

  const addAttachments = useCallback((files: File[]) => {
    const asAttachment = (file: File) => new Promise<Attachment>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type || "application/octet-stream",
        url: URL.createObjectURL(file),
        size: file.size,
        source: { kind: "data_url", value: String(reader.result) },
      });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    void Promise.all(files.map(asAttachment)).then(next => setAttachments(current => [...current, ...next]));
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => {
      const item = current.find((attachment) => attachment.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return current.filter((attachment) => attachment.id !== id);
    });
  }, []);

  const regenerate = useCallback(() => {
    setLoadError("重新產生將在下一個互動版本開放。你可以直接補充指示，讓我延續目前的企劃。 ");
  }, []);

  return (
    <LayoutGroup>
      <div className="relative h-[100dvh] overflow-hidden bg-[#fdfbf7] text-stone-800">
        <div className="paper-grain pointer-events-none absolute inset-0" />
        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center px-5 pt-5 sm:px-8 sm:pt-7">
          <div className="flex items-center gap-2.5 opacity-90">
            <img src={LOGO_URL} alt="隨心所遇" className="h-8 w-8 object-contain" />
            <span className="font-serif text-[15px] font-semibold tracking-[0.14em] text-stone-700">隨心所遇</span>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {!activeChat ? (
            <motion.main
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
              className="relative flex h-full items-center justify-center px-4 pb-[14vh] sm:px-8 sm:pb-[11vh]"
            >
              <img src={HERO_IMAGE} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.34] mix-blend-multiply" />
              <div className="relative z-10 w-full max-w-[680px]">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
                  className="mb-8 text-center sm:mb-10"
                >
                  <img src={LOGO_URL} alt="" className="mx-auto mb-4 h-14 w-14 object-contain sm:h-[60px] sm:w-[60px]" />
                  <h1 className="font-serif text-[31px] font-semibold tracking-[0.17em] text-stone-800 sm:text-[39px]">隨心所遇</h1>
                  <p className="mt-3 text-[14px] tracking-[0.08em] text-stone-500 sm:text-[15px]">讓每一個念頭，都有一處安靜相遇。</p>
                </motion.div>
                <motion.div
                  layoutId="composer-shell"
                  transition={{ type: "spring", stiffness: 210, damping: 28 }}
                >
                  <AIComposer
                    value={draft}
                    attachments={attachments}
                    isStreaming={isStreaming}
                    autoFocus
                    onChange={setDraft}
                    onSubmit={submitMessage}
                    onStop={stopStream}
                    onAddAttachments={addAttachments}
                    onRemoveAttachment={removeAttachment}
                  />
                </motion.div>
              </div>
            </motion.main>
          ) : (
            <motion.main
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <div className="h-full">
                {loadError && <p className="absolute top-20 left-1/2 z-20 -translate-x-1/2 rounded-full border border-stone-200 bg-[#fffefa]/90 px-3 py-1.5 text-[11px] text-stone-500 shadow-sm">{loadError}</p>}
                <MessageList messages={messages} onRegenerate={regenerate} />
              </div>
            </motion.main>
          )}
        </AnimatePresence>

        {activeChat && (
          <motion.div
            layoutId="composer-shell"
            transition={{ type: "spring", stiffness: 210, damping: 28 }}
            className="absolute inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] pt-5 sm:px-6 sm:pb-[calc(env(safe-area-inset-bottom)+1rem)]"
          >
            <div className="mx-auto max-w-3xl">
              <div className="pointer-events-none absolute inset-x-0 -top-14 h-16 bg-gradient-to-t from-[#fdfbf7] via-[#fdfbf7]/92 to-transparent" />
              <AIComposer
                value={draft}
                attachments={attachments}
                isStreaming={isStreaming}
                onChange={setDraft}
                onSubmit={submitMessage}
                onStop={stopStream}
                onAddAttachments={addAttachments}
                onRemoveAttachment={removeAttachment}
              />
            </div>
          </motion.div>
        )}
      </div>
    </LayoutGroup>
  );
}

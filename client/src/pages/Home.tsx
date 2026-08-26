/**
 * Style reminder — 靜水編輯室：初始畫面以光學置中的 Composer 與大量留白邀請書寫；進入對話後，Composer 平滑沉入底部。
 */

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import AIComposer from "@/components/chat/AIComposer";
import MessageList from "@/components/chat/MessageList";
import type { Attachment, ChatMessageData } from "@/components/chat/chat-types";

const HERO_IMAGE = "/manus-storage/suixin-hero-paper-mist_e02f08ca.jpg";
const LOGO_URL = "/manus-storage/suixin-logo-mark_0f74f416.png";

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function replyFor(input: string) {
  const focus = input.trim().replace(/\s+/g, " ").slice(0, 42) || "這個想法";
  return `我收到了。你提到「**${focus}**」，我們可以先不急著把它變成答案。\n\n### 先把念頭放在這裡\n- 你真正想靠近的是什麼？\n- 眼前最需要釐清的一件事是什麼？\n- 若只做一個小動作，你會從哪裡開始？\n\n你願意的話，我可以陪你把它整理成一段更清楚的方向。`;
}

export default function Home() {
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const streamTimerRef = useRef<number | null>(null);
  const activeChat = messages.length > 0;
  const isStreaming = messages.some((message) => message.isStreaming);

  const stopStream = useCallback(() => {
    if (streamTimerRef.current !== null) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setMessages((current) => current.map((message) => (message.isStreaming ? { ...message, isStreaming: false } : message)));
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const beginStream = useCallback((assistantId: string, source: string) => {
    if (streamTimerRef.current !== null) window.clearInterval(streamTimerRef.current);
    const response = replyFor(source);
    let index = 0;
    streamTimerRef.current = window.setInterval(() => {
      index = Math.min(index + (index < 58 ? 1 : 2), response.length);
      const content = response.slice(0, index);
      setMessages((current) => current.map((message) => (message.id === assistantId ? { ...message, content } : message)));
      if (index >= response.length) {
        if (streamTimerRef.current !== null) window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
        setMessages((current) => current.map((message) => (message.id === assistantId ? { ...message, isStreaming: false } : message)));
      }
    }, 18);
  }, []);

  const submitMessage = useCallback(() => {
    const content = draft.trim();
    if ((!content && !attachments.length) || isStreaming) return;
    const userMessage: ChatMessageData = {
      id: makeId("user"),
      role: "user",
      content,
      attachments,
    };
    const assistantId = makeId("assistant");
    const assistantMessage: ChatMessageData = { id: assistantId, role: "assistant", content: "", isStreaming: true };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setDraft("");
    setAttachments([]);
    window.setTimeout(() => beginStream(assistantId, content || "我附上了一份檔案，想請你看看"), 280);
  }, [attachments, beginStream, draft, isStreaming]);

  const addAttachments = useCallback((files: File[]) => {
    const next = files.map((file) => ({
      id: makeId("file"),
      name: file.name,
      type: file.type || "application/octet-stream",
      url: URL.createObjectURL(file),
      size: file.size,
    }));
    setAttachments((current) => [...current, ...next]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => {
      const item = current.find((attachment) => attachment.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return current.filter((attachment) => attachment.id !== id);
    });
  }, []);

  const regenerate = useCallback((messageId: string) => {
    if (isStreaming) return;
    const targetIndex = messages.findIndex((message) => message.id === messageId);
    const source = [...messages.slice(0, targetIndex)].reverse().find((message) => message.role === "user")?.content ?? "這個想法";
    setMessages((current) => current.map((message) => (message.id === messageId ? { ...message, content: "", isStreaming: true } : message)));
    beginStream(messageId, source);
  }, [beginStream, isStreaming, messages]);

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
              <MessageList messages={messages} onRegenerate={regenerate} />
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

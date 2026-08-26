/**
 * Style reminder — 靜水編輯室：Composer 是畫面唯一主角；暖紙底、深墨字、遇青焦點，所有控制項保持低調且可及。
 */

import { motion } from "framer-motion";
import { Paperclip, SendHorizontal, Square } from "lucide-react";
import { useEffect, useRef } from "react";
import AttachmentPreview from "./AttachmentPreview";
import type { Attachment } from "./chat-types";

type AIComposerProps = {
  value: string;
  attachments: Attachment[];
  isStreaming: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onAddAttachments: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
};

const MAX_TEXTAREA_HEIGHT = 156;

export default function AIComposer({
  value,
  attachments,
  isStreaming,
  autoFocus = false,
  onChange,
  onSubmit,
  onStop,
  onAddAttachments,
  onRemoveAttachment,
}: AIComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasDraft = Boolean(value.trim() || attachments.length);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 52), MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  const submitIfReady = () => {
    if (hasDraft && !isStreaming) onSubmit();
  };

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-[1.15rem] border border-stone-300/90 bg-[#fffefa]/95 shadow-[0_14px_36px_rgba(46,52,50,0.09),0_2px_8px_rgba(46,52,50,0.06)] backdrop-blur-md transition duration-200 focus-within:border-[#2d7d7a]/65 focus-within:shadow-[0_16px_42px_rgba(45,125,122,0.13),0_2px_8px_rgba(46,52,50,0.06)]">
        {attachments.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-3 pt-3 pb-1.5 scrollbar-none sm:px-4">
            {attachments.map((attachment) => (
              <AttachmentPreview key={attachment.id} attachment={attachment} onRemove={onRemoveAttachment} />
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          autoFocus={autoFocus}
          rows={1}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submitIfReady();
            }
          }}
          aria-label="向隨心所遇輸入訊息"
          placeholder="把此刻想到的，寫下來…"
          className="block min-h-[64px] max-h-[156px] w-full resize-none bg-transparent px-4 pt-4 pb-2 font-sans text-[15px] leading-6 text-stone-800 outline-none placeholder:text-stone-400 sm:px-5 sm:text-base"
        />

        <div className="flex items-center justify-between gap-3 px-3 pb-3 sm:px-4 sm:pb-3.5">
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            accept="image/*,.pdf,.txt,.md,.doc,.docx"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length) onAddAttachments(files);
              event.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d7d7a]/40"
            aria-label="新增圖片或檔案"
            title="新增圖片或檔案"
          >
            <Paperclip className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </button>

          <p className="hidden flex-1 select-none text-center text-[11px] tracking-wide text-stone-400 sm:block">
            Enter 發送　·　Shift + Enter 換行
          </p>

          {isStreaming ? (
            <motion.button
              type="button"
              onClick={onStop}
              whileTap={{ scale: 0.95 }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-800 text-[#fffefa] shadow-sm transition hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500/35"
              aria-label="停止生成"
              title="停止生成"
            >
              <Square className="h-3 w-3 fill-current" strokeWidth={2} />
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={submitIfReady}
              disabled={!hasDraft}
              whileTap={hasDraft ? { scale: 0.94 } : undefined}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d7d7a]/40 ${
                hasDraft
                  ? "bg-[#2d7d7a] text-white shadow-[0_3px_10px_rgba(45,125,122,0.28)] hover:bg-[#256a68]"
                  : "bg-stone-100 text-stone-300"
              }`}
              aria-label="送出訊息"
              title="送出訊息"
            >
              <SendHorizontal className="h-[17px] w-[17px] translate-x-px" strokeWidth={1.8} />
            </motion.button>
          )}
        </div>
      </div>
      <p className="mt-2.5 text-center text-[10px] tracking-[0.08em] text-stone-400 sm:hidden">
        Enter 發送 · Shift + Enter 換行
      </p>
    </div>
  );
}

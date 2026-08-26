/**
 * Style reminder — 靜水編輯室：AI 回覆以編輯欄的閱讀節奏呈現；不用大卡片，靠字級、行距與微型操作建立層次。
 */

import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, FileText, ImageIcon, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import type { Attachment, ChatMessageData } from "./chat-types";

const LOGO_URL = "/manus-storage/suixin-logo-mark_0f74f416.png";

type ChatMessageProps = {
  message: ChatMessageData;
  onRegenerate?: () => void;
};

function inlineContent(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-stone-800">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[0.86em] text-stone-700">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copyCode = async () => {
    await navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="my-4 overflow-hidden rounded-lg border border-stone-200 bg-[#fbfaf7]">
      <div className="flex items-center justify-between border-b border-stone-200/80 px-3 py-2">
        <span className="font-mono text-[10px] tracking-[0.12em] text-stone-400">CODE</span>
        <button
          type="button"
          onClick={copyCode}
          className="flex items-center gap-1.5 text-[11px] text-stone-500 transition hover:text-[#2d7d7a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d7d7a]/40"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "已複製" : "複製"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-[12px] leading-5 text-stone-700"><code>{code.trim()}</code></pre>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const blocks = useMemo(() => content.split(/```(?:\w+)?\n?([\s\S]*?)```/g), [content]);

  return (
    <div className="markdown-message">
      {blocks.map((block, blockIndex) => {
        if (blockIndex % 2 === 1) return <CodeBlock key={blockIndex} code={block} />;
        const lines = block.split("\n");
        const nodes: React.ReactNode[] = [];
        for (let i = 0; i < lines.length; i += 1) {
          const line = lines[i];
          if (!line.trim()) continue;
          if (line.startsWith("### ")) {
            nodes.push(<h3 key={`${blockIndex}-${i}`} className="mt-5 mb-2 text-[15px] font-semibold text-stone-800">{inlineContent(line.slice(4))}</h3>);
            continue;
          }
          if (line.startsWith("## ")) {
            nodes.push(<h2 key={`${blockIndex}-${i}`} className="mt-5 mb-2 text-[17px] font-semibold text-stone-800">{inlineContent(line.slice(3))}</h2>);
            continue;
          }
          if (line.startsWith("# ")) {
            nodes.push(<h1 key={`${blockIndex}-${i}`} className="mt-5 mb-2 text-[19px] font-semibold text-stone-800">{inlineContent(line.slice(2))}</h1>);
            continue;
          }
          if (/^[-*] /.test(line)) {
            const listItems = [line.slice(2)];
            while (i + 1 < lines.length && /^[-*] /.test(lines[i + 1])) {
              i += 1;
              listItems.push(lines[i].slice(2));
            }
            nodes.push(
              <ul key={`${blockIndex}-${i}`} className="my-2.5 space-y-1.5 pl-4 text-stone-650">
                {listItems.map((item, itemIndex) => <li key={itemIndex}>{inlineContent(item)}</li>)}
              </ul>,
            );
            continue;
          }
          nodes.push(<p key={`${blockIndex}-${i}`} className="my-2.5">{inlineContent(line)}</p>);
        }
        return <div key={blockIndex}>{nodes}</div>;
      })}
    </div>
  );
}

function UserAttachments({ attachments }: { attachments: Attachment[] }) {
  return (
    <div className="mb-2 flex flex-wrap justify-end gap-2">
      {attachments.map((attachment) => {
        const image = attachment.type.startsWith("image/");
        return (
          <a
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            key={attachment.id}
            className="group flex max-w-48 items-center gap-2 rounded-lg border border-stone-200 bg-[#fffefa] p-1.5 shadow-sm transition hover:border-[#2d7d7a]/40"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-stone-100">
              {image ? <img src={attachment.url} alt="附加圖片" className="h-full w-full object-cover" /> : <FileText className="h-4 w-4 text-stone-500" />}
            </span>
            <span className="truncate pr-1 text-[11px] text-stone-600">{attachment.name}</span>
            {image && <ImageIcon className="mr-1 h-3 w-3 shrink-0 text-stone-400" />}
          </a>
        );
      })}
    </div>
  );
}

export default function ChatMessage({ message, onRegenerate }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const copyMessage = async () => {
    await navigator.clipboard?.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (isUser) {
    return (
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        className="ml-auto max-w-[88%] sm:max-w-[72%]"
      >
        {message.attachments?.length ? <UserAttachments attachments={message.attachments} /> : null}
        {message.content && (
          <div className="rounded-[1.05rem] rounded-br-[0.3rem] bg-stone-800 px-4 py-3 text-[14px] leading-6 text-[#fffefa] shadow-[0_3px_12px_rgba(41,37,36,0.12)]">
            {message.content}
          </div>
        )}
      </motion.article>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className="max-w-[96%] sm:max-w-[84%]"
    >
      <div className="flex items-start gap-3">
        <img src={LOGO_URL} alt="" className="mt-1 h-7 w-7 shrink-0 object-contain" />
        <div className="min-w-0 flex-1 text-[14px] leading-7 text-stone-600 sm:text-[15px]">
          {message.content ? <MarkdownContent content={message.content} /> : <span className="text-stone-400">正在整理思緒</span>}
          {message.isStreaming && <span className="stream-caret ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-0.5 bg-[#2d7d7a]" aria-label="正在生成" />}
          <AnimatePresence>
            {!message.isStreaming && message.content && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 flex items-center gap-1"
              >
                <button
                  type="button"
                  onClick={copyMessage}
                  className="flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d7d7a]/40"
                  title="複製內容"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-[#2d7d7a]" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="sr-only">{copied ? "已複製" : "複製內容"}</span>
                </button>
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d7d7a]/40"
                  title="重新產生"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="sr-only">重新產生</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}

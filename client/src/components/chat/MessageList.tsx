/**
 * Style reminder — 靜水編輯室：訊息串是窄幅、可閱讀的編輯欄，無側欄、無任務卡，以節奏和留白承接對話。
 */

import { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";
import type { ChatMessageData } from "./chat-types";

type MessageListProps = {
  messages: ChatMessageData[];
  onRegenerate: (messageId: string) => void;
};

export default function MessageList({ messages, onRegenerate }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestMessage = messages[messages.length - 1];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: latestMessage?.isStreaming ? "auto" : "smooth", block: "end" });
  }, [messages.length, latestMessage?.content, latestMessage?.isStreaming]);

  return (
    <section className="h-full overflow-y-auto overscroll-contain px-4 pt-24 pb-44 sm:px-8 sm:pt-28 sm:pb-48" aria-label="對話紀錄">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 sm:gap-10">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} onRegenerate={() => onRegenerate(message.id)} />
        ))}
        <div ref={bottomRef} className="h-1" />
      </div>
    </section>
  );
}

/**
 * Style reminder — 靜水編輯室：附件是 Composer 內部的安靜紙籤，以纖細邊界與留白呈現，不建立獨立卡片系統。
 */

import { FileText, ImageIcon, X } from "lucide-react";
import type { Attachment } from "./chat-types";

type AttachmentPreviewProps = {
  attachment: Attachment;
  onRemove: (id: string) => void;
  compact?: boolean;
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentPreview({
  attachment,
  onRemove,
  compact = false,
}: AttachmentPreviewProps) {
  const isImage = attachment.type.startsWith("image/");

  return (
    <div
      className={`group relative flex items-center gap-2 border border-stone-200/90 bg-[#fffefa]/95 pr-2 shadow-[0_2px_8px_rgba(47,46,40,0.05)] ${
        compact ? "h-10 rounded-md" : "h-14 rounded-lg"
      }`}
    >
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden bg-stone-100 ${
          compact ? "h-10 w-10 rounded-l-md" : "h-14 w-14 rounded-l-lg"
        }`}
      >
        {isImage ? (
          <img src={attachment.url} alt="已附加的圖片預覽" className="h-full w-full object-cover" />
        ) : (
          <FileText className="h-4 w-4 text-stone-500" strokeWidth={1.65} />
        )}
      </div>
      <div className="min-w-0 pr-3">
        <p className="max-w-32 truncate text-[11px] font-medium text-stone-700">{attachment.name}</p>
        {!compact && (
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-stone-400">
            {isImage && <ImageIcon className="h-2.5 w-2.5" />}
            {formatSize(attachment.size)}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-stone-200 bg-[#fffefa] text-stone-500 opacity-100 shadow-sm transition hover:border-stone-300 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d7d7a]/40 sm:opacity-0 sm:group-hover:opacity-100"
        aria-label={`移除附件：${attachment.name}`}
      >
        <X className="h-3 w-3" strokeWidth={2} />
      </button>
    </div>
  );
}

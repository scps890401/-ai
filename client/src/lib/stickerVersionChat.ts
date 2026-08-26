export type StickerVersionChatCommand =
  | { kind: "list"; position: number }
  | { kind: "restore"; position: number; version: number };

function toValidPosition(value: string) {
  const position = Number(value);
  return Number.isInteger(position) && position >= 1 && position <= 40 ? position : null;
}

export function parseStickerVersionChatCommand(message: string): StickerVersionChatCommand | null {
  const normalized = message.replace(/[Ｖv]/g, "V").replace(/\u0000/g, "").trim();
  const restore = normalized.match(/(?:回復|恢復|還原|切回|換回).{0,16}?(?:第\s*)?(\d+)\s*張.{0,20}?(?:版本\s*)?[Vv]?(\d+)/i)
    ?? normalized.match(/(?:第\s*)?(\d+)\s*張.{0,16}?(?:回復|恢復|還原|切回|換回).{0,20}?(?:版本\s*)?[Vv]?(\d+)/i);
  if (restore) {
    const position = toValidPosition(restore[1]!);
    const version = Number(restore[2]);
    if (position && Number.isInteger(version) && version > 0) return { kind: "restore", position, version };
  }
  const list = normalized.match(/(?:查看|看|列出|顯示).{0,16}?(?:第\s*)?(\d+)\s*張.{0,12}?(?:版本|歷程|紀錄)/i)
    ?? normalized.match(/(?:第\s*)?(\d+)\s*張.{0,12}?(?:有哪些|有什麼).{0,12}?(?:版本|歷程|紀錄)/i);
  if (list) {
    const position = toValidPosition(list[1]!);
    if (position) return { kind: "list", position };
  }
  return null;
}

export function formatStickerVersionHistory(position: number, versions: Array<{ version: number; isCurrent: boolean; changeSummary?: string | null }>) {
  if (!versions.length) return `第 ${position} 張目前還沒有可回復的已保存版本。`;
  const summary = versions.map((item) => `V${item.version}${item.isCurrent ? "（目前使用）" : ""}${item.changeSummary ? `：${item.changeSummary}` : ""}`).join("；");
  return `第 ${position} 張共有 ${versions.length} 個版本：${summary}。你可以直接說「回復第 ${position} 張 V2」。`;
}

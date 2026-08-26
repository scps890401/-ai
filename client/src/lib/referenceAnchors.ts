export type ReferenceAnchorState = {
  acceptedUrls: string[];
  styleUrls: string[];
  styleNote: string;
};

export const emptyReferenceAnchors = (): ReferenceAnchorState => ({ acceptedUrls: [], styleUrls: [], styleNote: "" });

function uniqueUrls(urls: string[]) {
  return Array.from(new Set(urls.filter((url) => typeof url === "string" && url.trim())));
}

export function addAcceptedReference(current: ReferenceAnchorState, url: string) {
  return { ...current, acceptedUrls: uniqueUrls([url, ...current.acceptedUrls]).slice(0, 3) };
}

export function addStyleReference(current: ReferenceAnchorState, url: string, note = "") {
  return {
    ...current,
    acceptedUrls: uniqueUrls([url, ...current.acceptedUrls]).slice(0, 3),
    styleUrls: uniqueUrls([url, ...current.styleUrls]).slice(0, 2),
    styleNote: note.trim().slice(0, 400) || current.styleNote,
  };
}

export function selectGenerationReferenceUrls(args: {
  sourceUrl: string;
  anchors: ReferenceAnchorState;
  currentEditUrl?: string;
  maxReferences?: number;
}) {
  const max = Math.max(1, Math.min(4, args.maxReferences ?? 4));
  // The per-job source remains first to avoid merging unrelated uploaded characters.
  // User-confirmed assets enrich the reference set only after an explicit adoption.
  return uniqueUrls([
    args.sourceUrl,
    ...args.anchors.acceptedUrls,
    ...args.anchors.styleUrls,
    args.currentEditUrl ?? "",
  ]).slice(0, max);
}

export type AnchorChatCommand = { kind: "character" | "style"; position?: number; note: string };

export function parseAnchorChatCommand(message: string): AnchorChatCommand | null {
  const normalized = message.trim();
  const positionMatch = normalized.match(/第\s*(\d+)\s*張/);
  const position = positionMatch ? Number(positionMatch[1]) : undefined;
  const validPosition = position && Number.isInteger(position) && position >= 1 && position <= 40 ? position : undefined;
  if (/(以後|全部|後面).{0,18}(照|沿用).{0,12}(這個|這張).{0,12}(風格|畫風)|(?:這張|第\s*\d+\s*張).{0,12}(當|設成|設為).{0,12}(風格|畫風).{0,12}(參考|錨點)?/i.test(normalized)) {
    return { kind: "style", position: validPosition, note: normalized };
  }
  if (/(?:這張|第\s*\d+\s*張).{0,16}(當|設成|設為).{0,12}(角色|人物|寵物).{0,12}(參考|錨點)?/i.test(normalized)) {
    return { kind: "character", position: validPosition, note: normalized };
  }
  return null;
}

import type { StickerConcept } from "./stickerLanguage";

export type BatchStickerJob = {
  source: string;
  action: string;
  text: string;
  scenario: string;
  scenarioKey?: string;
  sourceIndex: number;
};

export type BatchStickerResult<T> = {
  job: BatchStickerJob;
  result: T;
};

export function collectBatchResults<T>(
  results: Array<BatchStickerResult<T | null>>,
): { successful: Array<BatchStickerResult<T>>; failedCount: number } {
  const successful = results.filter((item): item is BatchStickerResult<T> => item.result !== null);
  return { successful, failedCount: results.length - successful.length };
}

export function createBatchStickerJobs(
  sources: string[],
  mode: "random" | "agent",
  prompt: string,
  prompts: string[],
  pickConcept: (recentKeys: string[]) => StickerConcept,
  recentKeys: string[],
): BatchStickerJob[] {
  const coolingKeys = [...recentKeys];
  return sources.map((source, sourceIndex) => {
    if (mode === "random") {
      const concept = pickConcept(coolingKeys);
      coolingKeys.unshift(concept.scenarioKey);
      const customPrompt = prompts[sourceIndex]?.trim();
      const action = customPrompt ? `${concept.action}；同時遵照使用者提示：${customPrompt}` : concept.action;
      return { source, sourceIndex, action, text: customPrompt || concept.text, scenario: concept.scenario, scenarioKey: concept.scenarioKey };
    }
    const text = prompts[sourceIndex]?.trim() || prompt.trim() || "真棒";
    return { source, sourceIndex, action: `角色說「${text}」並做出自然、符合角色個性的反應`, text, scenario: "代理指定" };
  });
}

export function mergeBatchResults<T>(
  current: T[],
  results: T[],
  packSize: number,
): T[] {
  return [...results, ...current].slice(0, packSize);
}

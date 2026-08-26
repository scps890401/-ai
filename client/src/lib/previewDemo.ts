export const PREVIEW_DEMO = {
  projectName: "可愛兔子日常貼圖",
  prompt: "我要做 8 張可愛兔子 LINE 貼圖，使用繁體中文。",
  stages: ["分析角色", "建立角色設定", "規劃 8 張", "選擇模型", "生成貼圖", "品質檢查", "保存專案"],
  stickers: [
    { number: 1, text: "早安", pose: "揮手", status: "已通過" },
    { number: 2, text: "謝謝你", pose: "鞠躬", status: "已通過" },
    { number: 3, text: "加油", pose: "握拳", status: "V2 已保存" },
    { number: 4, text: "好餓", pose: "摸肚子", status: "已通過" },
    { number: 5, text: "晚安", pose: "蓋被子", status: "已通過" },
    { number: 6, text: "太棒了", pose: "跳起來", status: "已通過" },
    { number: 7, text: "等等我", pose: "小跑步", status: "已通過" },
    { number: 8, text: "沒問題", pose: "比讚", status: "已通過" },
  ],
} as const;

export function previewStageLabel(index: number) {
  return PREVIEW_DEMO.stages[index] ?? "完成";
}

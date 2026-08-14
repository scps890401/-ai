export type StickerScenario = {
  key: string;
  label: string;
  phrases: string[];
  actions: string[];
};

export type StickerConcept = {
  key: string;
  scenarioKey: string;
  scenario: string;
  text: string;
  action: string;
};

export const STICKER_SCENARIOS: StickerScenario[] = [
  { key: "greeting", label: "問候告別", phrases: ["早安", "午安", "晚安", "哈囉", "掰掰", "晚點聊"], actions: ["揮手微笑打招呼", "伸懶腰迎接早晨", "揮手準備離開", "窩進被子準備睡覺"] },
  { key: "reply", label: "回覆確認", phrases: ["收到", "了解", "OK", "沒問題", "好的", "晚點回"], actions: ["點頭比出 OK 手勢", "認真看手機快速回覆", "敬禮表示收到", "舉起手指表示等一下"] },
  { key: "thanks", label: "感謝道歉", phrases: ["謝謝", "甘溫", "辛苦了", "抱歉", "拍謝", "不客氣"], actions: ["雙手合十鞠躬道謝", "擦著眼淚送出愛心", "鞠躬並揮手致意", "搔頭露出不好意思的表情"] },
  { key: "cheer", label: "鼓勵祝賀", phrases: ["加油", "你可以的", "恭喜", "讚", "100分", "太棒啦"], actions: ["握拳高舉歡呼", "舉起加油牌跳起來", "雙手撒花慶祝", "豎起大拇指閃閃發光"] },
  { key: "emotion", label: "情緒反應", phrases: ["哈哈哈", "耶", "真的假的", "蛤", "傻眼", "登愣"], actions: ["捧腹大笑翻滾", "驚訝跳起摀住嘴巴", "瞪大眼睛歪頭懷疑", "攤手露出無言表情"] },
  { key: "life", label: "生活行程", phrases: ["我到了", "在路上", "吃飽沒", "好睏", "好冷", "等我一下"], actions: ["揮手在門口報到", "背著小包快步奔跑", "端著碗開心吃飯", "打著哈欠裹進棉被", "抱緊自己瑟瑟發抖", "看著手錶焦急等待"] },
  { key: "work", label: "工作日常", phrases: ["辛苦了", "交給我", "馬上處理", "開會中", "想下班", "下班啦"], actions: ["戴著眼鏡快速打字", "舉手接下任務", "抱著文件衝刺工作", "趴在桌上疲憊嘆氣", "看著時鐘歡呼下班"] },
  { key: "comfort", label: "安慰陪伴", phrases: ["抱抱", "別難過", "讓我靜靜", "沒事的", "有你真好", "好想你"], actions: ["張開雙手送出大擁抱", "遞上手帕輕輕安慰", "安靜坐在角落陪伴", "拍拍對方的肩膀", "抱著愛心溫柔思念"] },
  { key: "cute", label: "可愛俏皮", phrases: ["啾咪", "好開勳", "就醬吧", "棒棒der", "一起吧", "美麥"], actions: ["歪頭眨眼比出愛心", "轉圈圈撒花", "吐舌頭調皮比 YA", "拉著對方一起跳舞"] },
  { key: "rest", label: "疲憊自嘲", phrases: ["好累", "心好累", "不想面對", "我就爛", "耍廢中", "懷疑人生"], actions: ["癱在地上放空", "抱著枕頭把臉埋起來", "慢慢爬進紙箱躲起來", "攤手看著遠方發呆"] },
];

export function pickRandomStickerConcept(
  recentKeys: string[] = [],
  random = Math.random,
  learnedConcepts: StickerConcept[] = [],
): StickerConcept {
  const freshScenarios = STICKER_SCENARIOS.filter((scenario) => !recentKeys.includes(scenario.key));
  const builtInPool = freshScenarios.length ? freshScenarios : STICKER_SCENARIOS;
  const freshLearned = learnedConcepts.filter((concept) => !recentKeys.includes(concept.scenarioKey));
  if (freshLearned.length && random() < 0.4) {
    return freshLearned[Math.floor(random() * freshLearned.length)] ?? freshLearned[0]!;
  }
  const scenario = builtInPool[Math.floor(random() * builtInPool.length)] ?? STICKER_SCENARIOS[0];
  const text = scenario.phrases[Math.floor(random() * scenario.phrases.length)] ?? scenario.phrases[0];
  const action = scenario.actions[Math.floor(random() * scenario.actions.length)] ?? scenario.actions[0];
  return { key: `${scenario.key}:${text}:${action}`, scenarioKey: scenario.key, scenario: scenario.label, text, action };
}

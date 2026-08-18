export type RabbitExample = {
  id: string;
  src: string;
  text: string;
  action: string;
  mood: string;
  elements: string[];
  prompt: string;
};

export function rabbitExampleToStickerConcept(example: RabbitExample) {
  return { key: `rabbit-reference:${example.id}`, scenarioKey: `rabbit-reference:${example.id}`, scenario: "兔子日常參考", text: example.text, action: example.action };
}

export function buildRabbitExampleDraft(example: RabbitExample) {
  return { mode: "agent" as const, prompt: example.prompt, imagePrompts: [example.prompt] };
}

export function applyRabbitExampleToComposer(currentPrompts: string[], example: RabbitExample) {
  const draft = buildRabbitExampleDraft(example);
  return {
    mode: draft.mode,
    prompt: draft.prompt,
    imagePrompts: currentPrompts.length ? currentPrompts.map(() => draft.imagePrompts[0]) : draft.imagePrompts,
  };
}

export const RABBIT_EXAMPLES: RabbitExample[] = [
  { id: "rabbit-01", src: "/manus-storage/rabbit-sticker-01_7ba049a2.jpg", text: "好期待！", action: "兩個角色並排靠近，雙手放在胸前，眼睛閃閃發亮", mood: "期待、雀躍", elements: ["雙角色", "星光符號", "大字短句"], prompt: "保留角色外觀，製作兩個角色並排靠近、眼睛閃亮、雙手放在胸前的期待貼圖；加入星光符號與繁體中文文字「好期待！」，白色貼圖邊框，乾淨留白。" },
  { id: "rabbit-02", src: "/manus-storage/rabbit-sticker-02_ddd3d087.jpg", text: "哈囉！", action: "單一角色抬手揮手，臉部朝向觀者", mood: "親切、問候", elements: ["揮手", "單角色", "口語招呼"], prompt: "保留角色辨識特徵，製作單一角色抬手揮手、面向觀者打招呼的貼圖；加入繁體中文文字「哈囉！」，白色貼圖邊框，動作清楚。" },
  { id: "rabbit-03", src: "/manus-storage/rabbit-sticker-03_5f0a2141.jpg", text: "讚啦！", action: "單一角色豎起大拇指並露出肯定表情", mood: "肯定、鼓勵", elements: ["大拇指", "正向手勢", "短句"], prompt: "保留角色外觀，製作角色豎起大拇指、露出肯定笑容的鼓勵貼圖；加入繁體中文文字「讚啦！」，白色貼圖邊框，手勢要醒目。" },
  { id: "rabbit-04", src: "/manus-storage/rabbit-sticker-04_f53323f2.jpg", text: "晚安囉", action: "兩個角色相依睡覺，頭頂有 Z 字睡眠符號", mood: "安穩、陪伴", elements: ["睡覺", "雙角色", "Zzz 擬聲符號"], prompt: "保留角色特徵，製作兩個角色相依熟睡的晚安貼圖；加入柔和的 Zzz 睡眠符號與繁體中文文字「晚安囉」，白色貼圖邊框，營造安心陪伴感。" },
  { id: "rabbit-05", src: "/manus-storage/rabbit-sticker-05_cf605778.jpg", text: "開動囉", action: "角色抱著胡蘿蔔準備開心吃飯", mood: "日常、期待美食", elements: ["胡蘿蔔道具", "準備吃飯", "生活情境"], prompt: "保留角色外觀，製作角色抱著一根大胡蘿蔔、準備開心吃飯的生活貼圖；加入繁體中文文字「開動囉」，白色貼圖邊框，食物道具要清楚。" },
  { id: "rabbit-06", src: "/manus-storage/rabbit-sticker-06_4c3e2c39.jpg", text: "開動囉", action: "角色閉眼咬住胡蘿蔔，呈現享受食物的表情", mood: "滿足、享受", elements: ["咬食物", "閉眼表情", "動作變化"], prompt: "保留角色外觀，製作角色閉眼咬著胡蘿蔔、享受美食的貼圖；加入繁體中文文字「開動囉」，白色貼圖邊框，表情要比準備吃飯更滿足。" },
  { id: "rabbit-07", src: "/manus-storage/rabbit-sticker-07_f0d1d22e.jpg", text: "不要吵！", action: "角色趴低、皺眉直視觀者，呈現不耐煩情緒", mood: "不耐煩、拒絕", elements: ["趴低姿勢", "強烈表情", "界線語句"], prompt: "保留角色辨識特徵，製作角色趴低、皺眉直視觀者的拒絕貼圖；加入繁體中文文字「不要吵！」，白色貼圖邊框，情緒要明確但保持可愛。" },
  { id: "rabbit-08", src: "/manus-storage/rabbit-sticker-08_8a1b942a.jpg", text: "我愛你", action: "兩個角色互相親吻，頭頂浮現愛心", mood: "親密、告白", elements: ["雙角色互動", "親吻", "愛心符號"], prompt: "保留兩個角色的外觀差異，製作兩個角色互相親吻、頭頂浮現愛心的告白貼圖；加入繁體中文文字「我愛你」，白色貼圖邊框，溫暖可愛。" },
  { id: "rabbit-09", src: "/manus-storage/rabbit-sticker-09_1a3f3d85.jpg", text: "兔年行大運", action: "兩個角色並排祝福，周圍有小愛心與節慶氛圍", mood: "祝福、喜氣", elements: ["節慶祝福", "雙角色", "愛心裝飾"], prompt: "保留角色外觀，製作兩個角色並排送出節慶祝福的貼圖；加入小愛心與繁體中文文字「兔年行大運」，白色貼圖邊框，呈現喜氣但乾淨的構圖。" },
];

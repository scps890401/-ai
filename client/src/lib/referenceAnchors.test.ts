import { describe, expect, it } from "vitest";
import { addAcceptedReference, addStyleReference, emptyReferenceAnchors, parseAnchorChatCommand, selectGenerationReferenceUrls } from "./referenceAnchors";

describe("reference priority anchors", () => {
  it("keeps the job source first and only adds explicitly accepted references", () => {
    const anchors = addStyleReference(addAcceptedReference(emptyReferenceAnchors(), "accepted.png"), "style.png", "暖色手繪");
    expect(selectGenerationReferenceUrls({ sourceUrl: "rabbit.png", anchors, currentEditUrl: "edit.png" })).toEqual(["rabbit.png", "style.png", "accepted.png", "edit.png"]);
  });

  it("recognizes style and character adoption from natural Chinese", () => {
    expect(parseAnchorChatCommand("我喜歡第 3 張，以後全部照這個風格")).toMatchObject({ kind: "style", position: 3 });
    expect(parseAnchorChatCommand("把第 2 張當成角色參考")).toMatchObject({ kind: "character", position: 2 });
  });
});

import { describe, expect, it } from "vitest";
import { addAcceptedReference, addPoseReference, addSceneReference, addStyleReference, emptyReferenceAnchors, parseAnchorChatCommand, selectGenerationReferenceUrls } from "./referenceAnchors";

describe("reference priority anchors", () => {
  it("keeps the job source first and only adds explicitly accepted references", () => {
    const anchors = addStyleReference(addAcceptedReference(emptyReferenceAnchors(), "accepted.png"), "style.png", "暖色手繪");
    expect(selectGenerationReferenceUrls({ sourceUrl: "rabbit.png", anchors, currentEditUrl: "edit.png" })).toEqual(["rabbit.png", "style.png", "accepted.png", "edit.png"]);
  });

  it("recognizes style and character adoption from natural Chinese", () => {
    expect(parseAnchorChatCommand("我喜歡第 3 張，以後全部照這個風格")).toMatchObject({ kind: "style", position: 3 });
    expect(parseAnchorChatCommand("把第 2 張當成角色參考")).toMatchObject({ kind: "character", position: 2 });
  });

  it("keeps pose and scene references semantically distinct from character identity", () => {
    const anchors = addSceneReference(addPoseReference(emptyReferenceAnchors(), "pose.png"), "scene.png");
    expect(selectGenerationReferenceUrls({ sourceUrl: "rabbit.png", anchors })).toEqual(["rabbit.png", "pose.png", "scene.png"]);
    expect(parseAnchorChatCommand("把第 2 張素材當成姿勢參考")).toMatchObject({ kind: "pose", position: 2, source: "uploaded" });
    expect(parseAnchorChatCommand("用第 4 張的背景做場景參考")).toMatchObject({ kind: "scene", position: 4, source: "generated" });
  });
});

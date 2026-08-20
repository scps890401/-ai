import { readFileSync, writeFileSync } from "node:fs";

const input = "/tmp/manus-mcp/mcp_result_4300aee1-d837-463d-a865-583a93954fd3.json";
const output = "/home/ubuntu/sticker-tycoon-replica/reference-line-features.txt";
const lines = readFileSync(input, "utf8").split(/\r?\n/).filter(Boolean);
const out = [];
for (const line of lines) {
  try {
    const item = JSON.parse(line);
    if (item.type === "chat" && item.content) out.push(`[CHAT] ${item.content}`);
    if (item.type === "explanation" && item.content) out.push(`[PROGRESS] ${item.content}`);
    if (item.type === "toolUsed" && item.description) out.push(`[TOOL] ${item.tool ?? "unknown"}: ${item.description}`);
    if (item.type === "chat" && Array.isArray(item.attachments)) {
      for (const attachment of item.attachments) {
        if (attachment.filename || attachment.contentType) out.push(`[ASSET] ${attachment.filename ?? "unnamed"} (${attachment.contentType ?? "unknown"})`);
      }
    }
  } catch {}
}
writeFileSync(output, out.join("\n") + "\n");
console.log(`Wrote ${out.length} extracted records to ${output}`);

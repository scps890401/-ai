type QualityItem = { state: "checking" | "pass" | "retry" | "review" | "unavailable"; summary: string };

export function AgentOperationsCard(props: {
  acceptedAnchorCount: number;
  styleAnchorCount: number;
  styleNote: string;
  qualityByPosition: Record<number, QualityItem>;
  onCheckAll: () => void;
  disabled?: boolean;
}) {
  const items = Object.entries(props.qualityByPosition).sort(([a], [b]) => Number(a) - Number(b));
  const retryCount = items.filter(([, value]) => value.state === "retry").length;
  return (
    <div className="mt-3 rounded-xl border border-[#ead9c6] bg-[#fffdf8] p-3 text-sm text-[#5f463b]">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><b className="text-[#3f2920]">AI 工作階段</b><small className="ml-2 text-[#8a6b5b]">角色鎖定 → 生成 → 檢查 → 保存</small></div><button className="rounded-full border border-[#d9bfa7] px-3 py-1 text-xs font-medium text-[#8b3f2d] disabled:opacity-50" onClick={props.onCheckAll} disabled={props.disabled}>檢查已生成貼圖</button></div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-[#eff4eb] px-2 py-1">已確認角色錨點 {props.acceptedAnchorCount}</span><span className="rounded-full bg-[#f8eee0] px-2 py-1">風格錨點 {props.styleAnchorCount}</span>{props.styleNote && <span className="max-w-full truncate rounded-full bg-[#f5eef3] px-2 py-1" title={props.styleNote}>已採用風格</span>}<span className={`rounded-full px-2 py-1 ${retryCount ? "bg-[#f9e7e2] text-[#a64b32]" : "bg-[#eef5ef] text-[#52735a]"}`}>{retryCount ? `需處理 ${retryCount} 張` : "品質檢查就緒"}</span></div>
      {items.length > 0 && <div className="mt-2 space-y-1 text-xs">{items.slice(0, 4).map(([position, item]) => <div key={position} className="flex gap-2"><b>#{String(position).padStart(2, "0")}</b><span>{item.state === "checking" ? "檢查中" : item.state === "pass" ? "已通過" : item.state === "retry" ? "建議重試" : item.state === "review" ? "等待你確認" : "暫時無法檢查"}</span><span className="min-w-0 truncate text-[#8a6b5b]">{item.summary}</span></div>)}</div>}
    </div>
  );
}

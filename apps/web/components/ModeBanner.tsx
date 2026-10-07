import type { AgentMode, QuoteSource } from "@metrix/shared";

export default function ModeBanner({
  mode,
  quoteSource,
}: {
  mode: AgentMode;
  quoteSource?: QuoteSource;
}) {
  if (mode === "sim") {
    return (
      <p className="subtitle">
        当前 <span className="badge sim">SIM</span> 演示模式：决策流成交为本地模拟；下方 Kuru 测试网 hash 为真实链上证据。Perpl 公开行情与 RiskGate 裁决见 Trade 页看板。
      </p>
    );
  }
  const quote =
    quoteSource === "kuru_amm"
      ? "行情为 AMM 隐含价（L2 盘口不可用时的诚实降级，不是 CLOB 最优档）。"
      : quoteSource === "kuru_l2"
        ? "行情来自 Kuru L2。"
        : "";
  return (
    <p className="subtitle">
      当前 <span className="badge ok">{mode === "live" ? "LIVE 主网" : "TESTNET"}</span>{" "}
      {mode === "live" ? "真实下单。请确认金额与密钥。" : "Kuru 测试网。"} {quote}
      Perpl 默认关闭，Kuru 测试网 hash 不是 Perpl 成交。
    </p>
  );
}

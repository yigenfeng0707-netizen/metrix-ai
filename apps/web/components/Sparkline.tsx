"use client";

/** 轻量 SVG 折线图（无第三方依赖） */
export default function Sparkline({ data, width = 320, height = 64 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return <div className="muted small">数据采集中…</div>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * (height - 6) - 3).toFixed(1)}`)
    .join(" ");
  const rising = data[data.length - 1] >= data[0];
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={rising ? "var(--green)" : "var(--red)"} strokeWidth="2" />
    </svg>
  );
}

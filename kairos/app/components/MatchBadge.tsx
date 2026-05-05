"use client";

export function MatchBadge({
  score,
  size = "default",
}: {
  score: number;
  size?: "default" | "large";
}) {
  const pct = Math.max(0, Math.min(100, Math.round(score * 100)));
  const isHigh = pct >= 85;
  const isLarge = size === "large";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: isLarge ? "4px" : "3px",
        padding: isLarge ? "6px 14px" : "4px 10px",
        borderRadius: "999px",
        background: "linear-gradient(135deg, #a855f7 0%, #f472b6 100%)",
        fontFamily: "var(--font-body), system-ui, sans-serif",
        fontWeight: 600,
        color: "#fff",
        letterSpacing: "0.01em",
        boxShadow: isHigh
          ? "0 0 18px rgba(168,85,247,0.55), 0 0 40px rgba(168,85,247,0.2)"
          : "0 2px 12px rgba(168,85,247,0.25)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: isLarge ? "15px" : "12px", lineHeight: 1 }}>
        {pct}%
      </span>
      <span
        style={{
          fontSize: isLarge ? "11px" : "9px",
          opacity: 0.85,
          fontWeight: 500,
          lineHeight: 1,
        }}
      >
        match
      </span>
    </div>
  );
}

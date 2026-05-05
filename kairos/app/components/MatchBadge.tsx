"use client";

import { useEffect, useRef, useState } from "react";

export function MatchBadge({
  score,
  size = "default",
}: {
  score: number;
  size?: "default" | "large";
}) {
  const target = Math.max(0, Math.min(100, Math.round(score * 100)));
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(target);
      return;
    }

    const duration = 600;
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  const isHigh = target >= 85;
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
        {display}%
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

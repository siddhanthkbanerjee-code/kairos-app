"use client";

export function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="kairos-btn-press"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px 18px",
        borderRadius: "999px",
        border: active
          ? "1px solid rgba(168,85,247,0.6)"
          : "1px solid rgba(255,255,255,0.10)",
        background: active
          ? "linear-gradient(135deg, rgba(168,85,247,0.22) 0%, rgba(244,114,182,0.14) 100%)"
          : "rgba(255,255,255,0.03)",
        color: active ? "#fff" : "rgba(255,255,255,0.6)",
        fontFamily: "var(--font-body), system-ui, sans-serif",
        fontSize: "13px",
        fontWeight: active ? 600 : 400,
        letterSpacing: "0.01em",
        cursor: "pointer",
        transition: "all 150ms ease",
        boxShadow: active
          ? "0 0 18px rgba(168,85,247,0.2), inset 0 1px 0 rgba(255,255,255,0.08)"
          : "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

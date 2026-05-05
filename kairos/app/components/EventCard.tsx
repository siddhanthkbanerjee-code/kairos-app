"use client";

import EventImageWithFallback from "./EventImageWithFallback";
import { MatchBadge } from "./MatchBadge";

export type EventCardEvent = {
  id: string;
  score: number;
  title: string | null;
  venue: string | null;
  date: string | null;
  price_display: string | null;
  image_url: string | null;
  url: string | null;
  vibe_tags: string[] | null;
  event_dna: Record<string, unknown> | null;
};

function formatEventDate(date: string | null) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).formatToParts(d);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  if (!weekday || !day || !month) return date;
  return `${weekday} ${day} ${month}`;
}

function formatPriceDisplay(price: string | null) {
  if (!price) return "Price TBA";
  const t = price.trim();
  if (!t.length) return "Price TBA";
  if (t.includes("£")) return t;
  if (/^\d+(\.\d+)?$/.test(t)) return `£${t}`;
  return t;
}

function getAiExplanation(ev: EventCardEvent) {
  const dna = ev.event_dna ?? {};
  const exp =
    (dna as Record<string, unknown>).ai_explanation ??
    (dna as Record<string, unknown>).explanation ??
    (dna as Record<string, unknown>).why ??
    null;
  return typeof exp === "string" ? exp.trim() : null;
}

function getCategoryLabel(ev: EventCardEvent) {
  const dna = (ev.event_dna ?? {}) as Record<string, unknown>;
  const genre =
    (typeof dna.genre === "string" ? dna.genre : null) ??
    (Array.isArray(dna.genres) && typeof dna.genres[0] === "string"
      ? dna.genres[0]
      : null) ??
    "";
  const g = genre.toLowerCase();
  const tags = Array.isArray(ev.vibe_tags)
    ? ev.vibe_tags.join(" ").toLowerCase()
    : "";
  const hay = `${g} ${tags}`;

  if (hay.includes("comedy")) return "Comedy";
  if (hay.includes("jazz") || hay.includes("soul")) return "Jazz & Soul";
  if (hay.includes("electronic") || hay.includes("club") || hay.includes("techno")) return "Electronic";
  if (hay.includes("classical")) return "Classical";
  if (hay.includes("rock") || hay.includes("indie")) return "Rock & Indie";
  if (hay.includes("pop")) return "Pop";
  if (hay.includes("arts") || hay.includes("theatre") || hay.includes("immersive")) return "Arts";
  if (hay.includes("food") || hay.includes("drink") || hay.includes("bar")) return "Food & Drink";
  if (hay.includes("outdoor") || hay.includes("sports")) return "Outdoor";
  return "Event";
}

export function EventCard({
  ev,
  onOpen,
  isSaved,
  onToggleSave,
  variant,
}: {
  ev: EventCardEvent;
  onOpen: (ev: EventCardEvent) => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  variant: "carousel" | "grid";
}) {
  const dateLabel = formatEventDate(ev.date);
  const venueLine = [ev.venue, dateLabel].filter(Boolean).join(" · ");
  const explanation = getAiExplanation(ev);
  const category = getCategoryLabel(ev);
  const isCarousel = variant === "carousel";

  return (
    <div
      className={isCarousel ? "w-[188px] shrink-0" : "w-full"}
      onClick={() => onOpen(ev)}
    >
      <article
        className="kairos-event-card overflow-hidden"
        style={{
          borderRadius: "16px",
          border: "1px solid rgba(168,85,247,0.15)",
          background: "#14141f",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        {/* Image zone */}
        <div className="relative">
          <div
            className="kairos-event-image relative w-full overflow-hidden bg-white/[0.03]"
            style={{ aspectRatio: "9 / 10" }}
          >
            <EventImageWithFallback
              key={`${ev.id}:${ev.image_url ?? "none"}`}
              event={ev}
              wrapperClassName="absolute inset-0"
              imgClassName="absolute inset-0 h-full w-full object-cover"
              size={isCarousel ? "small" : "default"}
            />
            {/* Bottom gradient fade into card */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(20,20,31,0.90) 0%, rgba(20,20,31,0.35) 50%, transparent 100%)",
              }}
            />
            {/* Category pill: bottom-left, frosted glass */}
            <div
              className="absolute bottom-3 left-3 z-10"
              style={{
                padding: "3px 10px",
                borderRadius: "999px",
                background: "rgba(10,10,18,0.55)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(10px)",
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.75)",
                fontFamily: "var(--font-body), system-ui, sans-serif",
              }}
            >
              {category}
            </div>
          </div>

          {/* Save button: top-left */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={isSaved}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSave(ev.id);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              e.stopPropagation();
              onToggleSave(ev.id);
            }}
            className="absolute left-3 top-3 z-10 flex cursor-pointer items-center justify-center"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "999px",
              background: isSaved
                ? "linear-gradient(135deg, #a855f7 0%, #f472b6 100%)"
                : "rgba(10,10,18,0.55)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(10px)",
              boxShadow: isSaved ? "0 0 16px rgba(244,114,182,0.4)" : "none",
              transition: "background 200ms ease, box-shadow 200ms ease",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={isSaved ? "#fff" : "none"}
              stroke={isSaved ? "#fff" : "rgba(255,255,255,0.8)"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>

          {/* Match badge: top-right */}
          <div className="absolute right-3 top-3 z-10">
            <MatchBadge score={ev.score ?? 0} size="default" />
          </div>
        </div>

        {/* Card body */}
        <div className="px-4 pb-4 pt-3 space-y-1.5">
          <h3
            className="editorial line-clamp-2 leading-snug text-white"
            style={{
              fontSize: isCarousel ? "13px" : "15px",
              fontWeight: 700,
            }}
          >
            {ev.title ?? "Untitled event"}
          </h3>

          <p
            className="line-clamp-1"
            style={{
              fontSize: "11px",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-body), system-ui, sans-serif",
            }}
          >
            {venueLine || "—"}
          </p>

          {explanation ? (
            <p
              className="line-clamp-2"
              style={{
                fontSize: "10px",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                fontFamily: "var(--font-body), system-ui, sans-serif",
                minHeight: "30px",
              }}
            >
              {explanation}
            </p>
          ) : (
            <div style={{ minHeight: "30px" }} />
          )}

          <div
            className="flex items-center justify-between pt-0.5"
          >
            <span
              style={{
                fontSize: "11px",
                color: "rgba(255,255,255,0.7)",
                fontFamily: "var(--font-body), system-ui, sans-serif",
                fontWeight: 500,
              }}
            >
              {formatPriceDisplay(ev.price_display)}
            </span>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              &rarr;
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

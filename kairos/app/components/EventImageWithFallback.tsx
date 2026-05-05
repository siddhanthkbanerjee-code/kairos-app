"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type EventLike = {
  id?: string;
  image_url?: string | null;
  title?: string | null;
  venue?: string | null;
  vibe_tags?: string[] | null;
  event_dna?: Record<string, unknown> | null;
};

type PlaceholderUi = {
  icon: React.ReactNode;
  label: string;
  gradient: string;
};

function sanitizeSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s.length ? s : null;
}

function safeTags(tags: EventLike["vibe_tags"]) {
  if (!Array.isArray(tags)) return [];
  return tags.filter((t) => typeof t === "string" && t.trim().length > 0);
}

function getSocialContext(ev: EventLike) {
  const dna = (ev.event_dna ?? {}) as Record<string, unknown>;
  const v = dna.social_context ?? dna.socialContext ?? dna.social ?? null;
  return typeof v === "string" ? v.toLowerCase() : "";
}

function IconMusic() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" aria-hidden="true">
      <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
    </svg>
  );
}

function IconArts() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconComedy() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

function IconSports() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconFood() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
    </svg>
  );
}

function IconEvent() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function getPlaceholderUi(ev: EventLike): PlaceholderUi {
  const dna = (ev.event_dna ?? {}) as Record<string, unknown>;
  const genreRaw =
    (typeof dna.genre === "string" ? dna.genre : null) ??
    (Array.isArray(dna.genres) && typeof dna.genres[0] === "string"
      ? dna.genres[0]
      : null) ??
    (typeof dna.music_genre === "string" ? dna.music_genre : null) ??
    "";
  const genre = typeof genreRaw === "string" ? genreRaw.toLowerCase() : "";

  const tags = safeTags(ev.vibe_tags).map((t) => t.toLowerCase());
  const venue = (ev.venue ?? "").toLowerCase();
  const social = getSocialContext(ev);
  const hay = `${genre} ${tags.join(" ")} ${venue} ${social}`.toLowerCase();
  const matchesAny = (needles: string[]) => needles.some((n) => hay.includes(n));

  if (matchesAny(["comedy"])) {
    return { icon: <IconComedy />, label: "Comedy", gradient: "linear-gradient(135deg, #1e3a5f, #3b82f6)" };
  }
  if (matchesAny(["sports", "fitness", "gym", "workout", "trail", "run", "running", "outdoor", "active", "energetic"])) {
    return { icon: <IconSports />, label: "Sports & Fitness", gradient: "linear-gradient(135deg, #064e3b, #10b981)" };
  }
  if (matchesAny(["food", "drink", "bar", "cafe", "restaurant", "kitchen", "dining", "bistro", "cocktail", "wine", "beer"])) {
    return { icon: <IconFood />, label: "Food & Drink", gradient: "linear-gradient(135deg, #78350f, #d97706)" };
  }
  if (matchesAny(["arts", "culture", "theatre", "theater", "museum", "exhibition", "immersive", "experimental", "intimate", "atmospheric"])) {
    return { icon: <IconArts />, label: "Arts & Culture", gradient: "linear-gradient(135deg, #831843, #db2777)" };
  }
  if (matchesAny(["music", "rave", "club", "electronic", "dance", "dj", "house", "techno", "rock", "pop", "jazz", "latin", "alternative", "r&b"])) {
    return { icon: <IconMusic />, label: "Music", gradient: "linear-gradient(135deg, #4c1d95, #7c3aed)" };
  }

  return { icon: <IconEvent />, label: "Event", gradient: "linear-gradient(135deg, #1e1b4b, #a855f7)" };
}

export default function EventImageWithFallback({
  event,
  wrapperClassName,
  imgClassName,
  size = "default",
}: {
  event: EventLike;
  wrapperClassName: string;
  imgClassName?: string;
  size?: "default" | "small";
}) {
  const dna = (event.event_dna ?? {}) as Record<string, unknown>;

  const src =
    sanitizeSrc(event.image_url) ??
    sanitizeSrc((event as unknown as { imageUrl?: unknown }).imageUrl) ??
    sanitizeSrc(dna.image_url) ??
    sanitizeSrc(dna.imageUrl) ??
    sanitizeSrc(dna.image);

  const [imgReady, setImgReady] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const imgSucceededRef = useRef(false);

  const placeholderUi = useMemo(() => getPlaceholderUi(event), [event]);

  // 3-second timeout: if the image hasn't confirmed real content by then, fall back.
  useEffect(() => {
    if (!src) return;
    imgSucceededRef.current = false;
    const timer = window.setTimeout(() => {
      if (!imgSucceededRef.current) {
        console.log("[Kairos] Image timeout (3s), falling back:", src);
        setImgFailed(true);
      }
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [src]);

  function handleLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (e.currentTarget.naturalWidth === 0) {
      // Image request succeeded but content is empty (common with Ticketmaster CDN).
      console.log("[Kairos] Image loaded with naturalWidth=0, falling back:", src);
      setImgFailed(true);
    } else {
      imgSucceededRef.current = true;
      setImgReady(true);
    }
  }

  function handleError() {
    console.log("[Kairos] Image error, falling back:", src);
    setImgFailed(true);
  }

  const showImg = !!src && !imgFailed;
  const isSmall = size === "small";
  const labelClass = isSmall ? "mt-1 text-[10px]" : "mt-2 text-[11px]";
  const imageState = showImg && imgReady ? "image" : "fallback";

  return (
    <div
      className={["relative", wrapperClassName].join(" ")}
      data-event-id={event.id ?? ""}
      data-image-src={src ?? ""}
      data-image-state={imageState}
    >
      {/* Branded gradient fallback: always visible underneath. */}
      <div
        className="absolute inset-0 z-[50] flex items-center justify-center"
        style={{
          background: placeholderUi.gradient,
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow:
            "0 10px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(168,85,247,0.10) inset",
        }}
      >
        <div className="flex h-full w-full flex-col items-center justify-center text-center">
          <div
            style={{
              filter: "drop-shadow(0 12px 26px rgba(0,0,0,0.55))",
              transform: isSmall ? "scale(0.75)" : undefined,
            }}
          >
            {placeholderUi.icon}
          </div>
          <div className={labelClass + " font-semibold text-white/90 drop-shadow"}>
            {placeholderUi.label}
          </div>
        </div>
      </div>

      {/* Real image fades in over fallback once naturalWidth > 0 is confirmed. */}
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src ?? ""}
          alt={event.title ?? "Event image"}
          className={
            imgClassName ?? "absolute inset-0 h-full w-full object-cover"
          }
          loading="lazy"
          decoding="async"
          style={{
            opacity: imgReady ? 1 : 0,
            transition: "opacity 280ms ease",
            zIndex: 60,
          }}
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : null}
    </div>
  );
}

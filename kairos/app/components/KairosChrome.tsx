"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Palette = {
  bg: string;
  blob1: string;
  blob2: string;
  blob3: string;
  blob4: string;
};

const PALETTES: Record<string, Palette> = {
  "light-landing": {
    bg: "rgb(250, 249, 247)",
    blob1: "rgba(180, 150, 255, 0.20)",
    blob2: "rgba(255, 180, 150, 0.18)",
    blob3: "rgba(150, 200, 255, 0.15)",
    blob4: "rgba(200, 150, 200, 0.12)",
  },
  "night-underground": {
    bg: "rgb(6, 4, 20)",
    blob1: "rgba(160, 60, 255, 0.55)",
    blob2: "rgba(80, 40, 240, 0.50)",
    blob3: "rgba(120, 20, 180, 0.45)",
    blob4: "rgba(60, 10, 140, 0.40)",
  },
  "night-underground-light": {
    bg: "rgb(10, 8, 26)",
    blob1: "rgba(170, 90, 255, 0.42)",
    blob2: "rgba(110, 80, 245, 0.36)",
    blob3: "rgba(140, 60, 200, 0.32)",
    blob4: "rgba(90, 50, 170, 0.28)",
  },
  "warm-intimate": {
    bg: "rgb(12, 6, 2)",
    blob1: "rgba(200, 100, 20, 0.55)",
    blob2: "rgba(180, 60, 10, 0.50)",
    blob3: "rgba(220, 140, 40, 0.45)",
    blob4: "rgba(160, 40, 20, 0.40)",
  },
  "warm-intimate-light": {
    bg: "rgb(16, 9, 4)",
    blob1: "rgba(215, 130, 50, 0.40)",
    blob2: "rgba(195, 90, 35, 0.34)",
    blob3: "rgba(230, 160, 70, 0.30)",
    blob4: "rgba(180, 70, 40, 0.26)",
  },
  "outdoor-fresh": {
    bg: "rgb(2, 12, 8)",
    blob1: "rgba(20, 200, 120, 0.55)",
    blob2: "rgba(10, 160, 100, 0.50)",
    blob3: "rgba(40, 220, 80, 0.45)",
    blob4: "rgba(0, 140, 80, 0.40)",
  },
  "outdoor-fresh-light": {
    bg: "rgb(4, 14, 10)",
    blob1: "rgba(50, 210, 135, 0.40)",
    blob2: "rgba(35, 175, 115, 0.34)",
    blob3: "rgba(70, 225, 100, 0.30)",
    blob4: "rgba(20, 155, 95, 0.26)",
  },
  "social-warm": {
    bg: "rgb(14, 4, 8)",
    blob1: "rgba(220, 40, 100, 0.55)",
    blob2: "rgba(200, 20, 80, 0.50)",
    blob3: "rgba(240, 80, 120, 0.45)",
    blob4: "rgba(180, 10, 60, 0.40)",
  },
  "social-warm-light": {
    bg: "rgb(16, 6, 10)",
    blob1: "rgba(230, 80, 125, 0.40)",
    blob2: "rgba(210, 55, 100, 0.34)",
    blob3: "rgba(245, 110, 140, 0.30)",
    blob4: "rgba(195, 40, 85, 0.26)",
  },
  "gold-dark": {
    bg: "rgb(12, 9, 2)",
    blob1: "rgba(212, 165, 60, 0.48)",
    blob2: "rgba(190, 130, 30, 0.42)",
    blob3: "rgba(235, 195, 90, 0.34)",
    blob4: "rgba(160, 110, 25, 0.30)",
  },
  "blue-dark": {
    bg: "rgb(4, 7, 20)",
    blob1: "rgba(99, 102, 241, 0.52)",
    blob2: "rgba(70, 90, 235, 0.44)",
    blob3: "rgba(120, 130, 250, 0.36)",
    blob4: "rgba(55, 70, 200, 0.32)",
  },
  "default-dark": {
    bg: "rgb(8, 8, 18)",
    blob1: "rgba(140, 60, 255, 0.50)",
    blob2: "rgba(80, 50, 220, 0.45)",
    blob3: "rgba(20, 160, 140, 0.42)",
    blob4: "rgba(180, 30, 100, 0.38)",
  },
};

/* Blobs are lit from within: instead of a flat fill, each one gets a radial
   falloff built from its palette colour. Same palette system, more life. */
function luminous(color: string) {
  return `radial-gradient(circle at 34% 32%, ${color} 0%, transparent 74%)`;
}

function setBlob(n: number, color: string) {
  const el = document.querySelector<HTMLElement>(`.kairos-blob-${n}`);
  if (el) el.style.background = luminous(color);
}

function applyPalette(name: string) {
  const palette = PALETTES[name] ?? PALETTES["default-dark"];
  const root = document.documentElement;
  root.style.background = palette.bg;

  setBlob(1, palette.blob1);
  setBlob(2, palette.blob2);
  setBlob(3, palette.blob3);
  setBlob(4, palette.blob4);

  // Nav color: light palette uses dark nav; others use light nav.
  const isLight = name === "light-landing";
  root.style.setProperty("--navText", isLight ? "#1a1a2e" : "rgba(255,255,255,0.88)");
  root.style.setProperty(
    "--navIcon",
    isLight ? "rgba(26,26,46,0.75)" : "rgba(255,255,255,0.75)"
  );
}

function applyOrbPreset() {
  // Match the "floating orb" background: purple/rose on dark navy.
  const root = document.documentElement;
  root.style.background = "rgb(10, 10, 18)"; // #0a0a12

  const purple = "rgba(168, 85, 247, 0.4)"; // #a855f7
  const rose = "rgba(244, 114, 182, 0.3)"; // #f472b6

  setBlob(1, purple);
  setBlob(2, rose);
  setBlob(3, purple);
  setBlob(4, rose);

  // Ensure nav stays readable on dark orb background.
  root.style.setProperty("--navText", "rgba(255,255,255,0.88)");
  root.style.setProperty("--navIcon", "rgba(255,255,255,0.75)");
}

export function setKairosPalette(name: string) {
  sessionStorage.setItem("kairos:palette", name);
  applyPalette(name);
}

function LondonClock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/London",
    });
    const update = () => setTime(fmt.format(new Date()));
    update();
    const id = window.setInterval(update, 15000);
    return () => window.clearInterval(id);
  }, []);

  if (!time) return null;

  return (
    <span className="kairos-nav-clock" aria-label={`London time ${time}`}>
      <span className="kairos-live-dot" aria-hidden="true" />
      LDN {time}
    </span>
  );
}

const NAV_LINKS = [
  { href: "/feed", label: "Discover" },
  { href: "/passport", label: "Passport" },
  { href: "/saved", label: "Saved" },
  { href: "/about", label: "About" },
];

export default function KairosChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const orbPages = pathname === "/" || pathname === "/feed" || pathname === "/quiz";

  const initialPalette = useMemo(() => {
    if (pathname === "/") return "light-landing";
    return "default-dark";
  }, [pathname]);

  useEffect(() => {
    ["1", "2", "3", "4"].forEach((n) => {
      const el = document.querySelector<HTMLElement>(`.kairos-blob-${n}`);
      if (el) {
        el.style.transition = "background 3s ease, opacity 3s ease";
      }
    });
    document.documentElement.style.transition = "background 4s ease";
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.transition = "background-color 1.2s ease, filter 1.2s ease";

    try {
      const stored = sessionStorage.getItem("kairos:palette");
      const name = stored || initialPalette;
      applyPalette(name);
      if (orbPages) applyOrbPreset();
    } catch {
      applyPalette(initialPalette);
      if (orbPages) applyOrbPreset();
    }
  }, [initialPalette, orbPages]);

  useEffect(() => {
    function onPaletteChange(e: Event) {
      const ce = e as CustomEvent<string>;
      const name = ce.detail;
      sessionStorage.setItem("kairos:palette", name);
      applyPalette(name);
      if (orbPages) applyOrbPreset();
    }
    window.addEventListener("kairos-palette-change", onPaletteChange as EventListener);
    return () =>
      window.removeEventListener(
        "kairos-palette-change",
        onPaletteChange as EventListener
      );
  }, [orbPages]);

  useEffect(() => {
    if (!orbPages) return;
    try {
      applyOrbPreset();
    } catch {}
  }, [orbPages]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Cursor spotlight: a soft torch trailing the pointer. Desktop only.
  useEffect(() => {
    const el = spotlightRef.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const half = 360; // half of the 720px spotlight
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 3;
    let tx = x;
    let ty = y;
    let visible = false;
    let rafId = 0;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) {
        visible = true;
        el.style.opacity = "1";
      }
    };

    const tick = () => {
      x += (tx - x) * 0.07;
      y += (ty - y) * 0.07;
      el.style.transform = `translate3d(${x - half}px, ${y - half}px, 0)`;
      rafId = window.requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <div className="kairos-blobs" aria-hidden="true">
        <div className="kairos-blob kairos-blob-1" />
        <div className="kairos-blob kairos-blob-2" />
        <div className="kairos-blob kairos-blob-3" />
        <div className="kairos-blob kairos-blob-4" />
      </div>

      <div className="kairos-content">
        <nav className="kairos-nav">
          <Link href="/" className="kairos-wordmark editorial">
            Kairos
          </Link>

          <div className="kairos-nav-right">
            <div className="kairos-nav-links">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={[
                    "kairos-nav-link",
                    pathname === l.href ? "active" : "",
                  ].join(" ")}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <LondonClock />

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={["kairos-hamburger", drawerOpen ? "open" : ""].join(" ")}
              aria-label="Open menu"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </nav>

        <div key={pathname} className="kairos-page-enter">
          {children}
        </div>

        <div
          className={[
            "kairos-drawer-overlay",
            drawerOpen ? "open" : "",
          ].join(" ")}
          onClick={() => setDrawerOpen(false)}
          aria-hidden={!drawerOpen}
        />
        <aside className={["kairos-drawer", drawerOpen ? "open" : ""].join(" ")}>
          <div className="kairos-drawer-head">
            <div className="editorial text-lg font-semibold text-white">Menu</div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="kairos-drawer-close"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <div className="kairos-drawer-links">
            <Link href="/feed" onClick={() => setDrawerOpen(false)}>
              Discover
            </Link>
            <Link href="/passport" onClick={() => setDrawerOpen(false)}>
              Taste Passport
            </Link>
            <Link href="/saved" onClick={() => setDrawerOpen(false)}>
              Saved Events
            </Link>
            <Link href="/about" onClick={() => setDrawerOpen(false)}>
              About
            </Link>
            <Link href="/settings" onClick={() => setDrawerOpen(false)}>
              Settings
            </Link>
            <Link href="/help" onClick={() => setDrawerOpen(false)}>
              Help
            </Link>
          </div>
        </aside>
      </div>

      {/* Atmosphere layers: torch, vignette, film grain. */}
      <div ref={spotlightRef} className="kairos-spotlight" aria-hidden="true" />
      <div className="kairos-vignette" aria-hidden="true" />
      <div className="kairos-grain" aria-hidden="true" />
    </>
  );
}

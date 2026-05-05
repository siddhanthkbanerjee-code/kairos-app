"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RevealOnScroll } from "./components/RevealOnScroll";

export default function Home() {
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("kairos-palette-change", { detail: "light-landing" })
    );
  }, []);

  return (
    <main>
      {/* Hero */}
      <section className="relative flex min-h-[calc(100dvh-72px)] flex-col items-center justify-center px-6 pb-24 pt-10 text-center sm:px-10">
        <div className="relative z-10 max-w-4xl">
          <p
            className="mb-6 text-[10px] font-semibold uppercase"
            style={{
              color: "#a855f7",
              letterSpacing: "0.38em",
              animation: "kairos-fade-up 400ms cubic-bezier(0.4,0,0.2,1) 0ms both",
            }}
          >
            London tonight, curated by AI
          </p>

          <h1
            className="editorial text-balance leading-[0.92] tracking-tight"
            style={{
              fontSize: "clamp(48px, 9.5vw, 112px)",
              color: "rgba(255,255,255,0.97)",
              fontWeight: 700,
              textShadow: "0 24px 70px rgba(0,0,0,0.6)",
              animation: "kairos-fade-up 500ms cubic-bezier(0.4,0,0.2,1) 100ms both",
            }}
          >
            Find your perfect{" "}
            <span
              style={{
                color: "transparent",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                backgroundImage:
                  "linear-gradient(135deg, #a855f7 0%, #f472b6 55%, #a855f7 100%)",
              }}
            >
              moment.
            </span>
          </h1>

          <p
            className="mx-auto mt-8 max-w-lg text-base sm:text-xl"
            style={{
              color: "rgba(255,255,255,0.56)",
              lineHeight: 1.7,
              textShadow: "0 10px 30px rgba(0,0,0,0.4)",
              animation: "kairos-fade-up 500ms cubic-bezier(0.4,0,0.2,1) 250ms both",
            }}
          >
            Eight questions. A hundred signals. Your nights in London,
            discovered for you alone.
          </p>

          <div
            className="mt-12 flex flex-col items-center gap-5 sm:flex-row sm:justify-center"
            style={{
              animation: "kairos-fade-up 400ms cubic-bezier(0.4,0,0.2,1) 400ms both",
            }}
          >
            <Link
              href="/quiz"
              className="kairos-btn-press inline-flex h-14 w-full items-center justify-center rounded-full px-10 text-base font-semibold text-white transition-transform hover:scale-[1.03] focus-visible:outline-none sm:w-auto"
              style={{
                background:
                  "linear-gradient(135deg, #a855f7 0%, #f472b6 100%)",
                boxShadow:
                  "0 0 48px rgba(168,85,247,0.45), 0 8px 28px rgba(0,0,0,0.35)",
              }}
            >
              Find your moment
            </Link>
            <span
              className="text-sm"
              style={{ color: "rgba(255,255,255,0.38)" }}
            >
              8 questions &nbsp;·&nbsp; 90 seconds
            </span>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section
        className="px-6 py-16 sm:px-10"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 sm:grid-cols-3">
          {[
            {
              num: "01",
              title: "Tell us your vibe",
              body:
                "Eight questions about your energy, aesthetic, and taste. No signup required.",
            },
            {
              num: "02",
              title: "We map your taste",
              body:
                "Our AI builds your cultural fingerprint across 100-plus dimensions in real time.",
            },
            {
              num: "03",
              title: "You get your city",
              body:
                "Personalised events with match scores, AI explanations, and zero noise.",
            },
          ].map((f, i) => (
            <RevealOnScroll key={f.num} delay={i * 80}>
              <div className="space-y-3">
                <div
                  className="text-[10px] font-semibold uppercase"
                  style={{ color: "#a855f7", letterSpacing: "0.3em" }}
                >
                  {f.num}
                </div>
                <div className="editorial text-2xl font-semibold text-white">
                  {f.title}
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.52)" }}
                >
                  {f.body}
                </p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>
    </main>
  );
}

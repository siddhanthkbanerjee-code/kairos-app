"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RevealOnScroll } from "./components/RevealOnScroll";
import KairosFooter from "./components/KairosFooter";

const MARQUEE_ITEMS = [
  "Secret gigs",
  "Warehouse raves",
  "Gallery lates",
  "Supper clubs",
  "Jazz basements",
  "Rooftop cinema",
  "Poetry nights",
  "After hours",
  "Immersive theatre",
  "Vinyl sessions",
];

function MarqueeStrip() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div
      className="kairos-marquee py-7"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
      aria-hidden="true"
    >
      <div className="kairos-marquee-track">
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="inline-flex items-baseline">
            <span
              className="editorial px-6 text-2xl italic sm:text-3xl"
              style={{ color: "rgba(255,255,255,0.82)", fontWeight: 700 }}
            >
              {item}
            </span>
            <span
              className="text-lg"
              style={{ color: "rgba(168,85,247,0.65)" }}
            >
              ✦
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("kairos-palette-change", { detail: "light-landing" })
    );
  }, []);

  return (
    <main>
      {/* Hero */}
      <section className="relative flex min-h-[calc(100dvh-77px)] flex-col items-center justify-center px-6 pb-24 pt-10 text-center sm:px-10">
        <div className="relative z-10 max-w-5xl">
          <p
            className="mb-7 inline-flex items-center gap-2.5 text-[10px] font-semibold uppercase"
            style={{
              color: "#a855f7",
              letterSpacing: "0.38em",
              animation: "kairos-fade-up 500ms cubic-bezier(0.4,0,0.2,1) 100ms both",
            }}
          >
            <span className="kairos-live-dot" aria-hidden="true" />
            London tonight, curated by AI
          </p>

          <h1
            className="editorial text-balance tracking-tight"
            style={{
              fontSize: "clamp(52px, 10.5vw, 128px)",
              lineHeight: 0.94,
              color: "rgba(255,255,255,0.97)",
              fontWeight: 700,
              textShadow: "0 24px 70px rgba(0,0,0,0.6)",
            }}
          >
            <span className="kairos-line-mask">
              <span style={{ animationDelay: "150ms" }}>Find your</span>
            </span>
            <span className="kairos-line-mask">
              <span style={{ animationDelay: "300ms" }}>
                perfect{" "}
                <em className="kairos-gradient-text" style={{ fontStyle: "italic" }}>
                  moment.
                </em>
              </span>
            </span>
          </h1>

          <p
            className="mx-auto mt-9 max-w-lg text-base sm:text-xl"
            style={{
              color: "rgba(255,255,255,0.56)",
              lineHeight: 1.7,
              textShadow: "0 10px 30px rgba(0,0,0,0.4)",
              animation: "kairos-fade-up 600ms cubic-bezier(0.4,0,0.2,1) 650ms both",
            }}
          >
            Eight questions. A hundred signals. Your nights in London,
            discovered for you alone.
          </p>

          <div
            className="mt-12 flex flex-col items-center gap-5 sm:flex-row sm:justify-center"
            style={{
              animation: "kairos-fade-up 500ms cubic-bezier(0.4,0,0.2,1) 850ms both",
            }}
          >
            <Link
              href="/quiz"
              className="kairos-cta kairos-btn-press inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-10 text-base font-semibold text-white focus-visible:outline-none sm:w-auto"
              style={{
                background: "linear-gradient(135deg, #a855f7 0%, #f472b6 100%)",
                boxShadow:
                  "0 0 48px rgba(168,85,247,0.45), 0 8px 28px rgba(0,0,0,0.35)",
              }}
            >
              Find your moment
              <span className="kairos-cta-arrow" aria-hidden="true">
                &rarr;
              </span>
            </Link>
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>
              8 questions &nbsp;·&nbsp; 90 seconds
            </span>
          </div>

          <div
            className="mx-auto mt-16 flex max-w-xl flex-wrap items-center justify-center gap-x-8 gap-y-3"
            style={{
              animation: "kairos-fade-up 500ms cubic-bezier(0.4,0,0.2,1) 1050ms both",
            }}
          >
            {[
              "828 events indexed",
              "3,072 taste dimensions",
              "1 perfect night",
            ].map((stat) => (
              <span
                key={stat}
                className="text-[10px] font-semibold uppercase"
                style={{
                  color: "rgba(255,255,255,0.34)",
                  letterSpacing: "0.26em",
                }}
              >
                {stat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Marquee: what's out there tonight */}
      <MarqueeStrip />

      {/* Feature strip */}
      <section className="px-6 py-24 sm:px-10">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-14 sm:grid-cols-3">
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
            <RevealOnScroll key={f.num} delay={i * 90}>
              <div className="relative pt-10">
                <div
                  className="editorial pointer-events-none absolute -top-4 left-0 select-none"
                  style={{
                    fontSize: "120px",
                    fontWeight: 900,
                    lineHeight: 1,
                    color: "rgba(255,255,255,0.035)",
                  }}
                  aria-hidden="true"
                >
                  {f.num}
                </div>
                <div className="relative space-y-3">
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
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* Closing statement */}
      <section className="px-6 pb-28 pt-4 sm:px-10">
        <RevealOnScroll>
          <div className="mx-auto max-w-3xl text-center">
            <p
              className="editorial text-balance text-3xl leading-snug sm:text-4xl"
              style={{ color: "rgba(255,255,255,0.85)", fontWeight: 400 }}
            >
              Your perfect night looks{" "}
              <em style={{ color: "#f472b6" }}>nothing</em> like anyone
              else&rsquo;s. That&rsquo;s the point.
            </p>
            <Link
              href="/quiz"
              className="mt-10 inline-flex items-center gap-2 text-sm font-semibold uppercase transition-colors"
              style={{ color: "#a855f7", letterSpacing: "0.22em" }}
            >
              Take the quiz
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </RevealOnScroll>
      </section>

      <KairosFooter />
    </main>
  );
}

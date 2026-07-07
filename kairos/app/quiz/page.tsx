"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type QuizAnswers = {
  timeOfDay?: string;
  fridayNight?: string;
  aesthetic?: string;
  soundtrack?: string;
  social?: string;
  genres?: string[];
  discoveryScore?: number; // 0..100
  experienceIntent?: string;
};

type QuestionBase = {
  id: keyof QuizAnswers;
  label: string;
  question: string;
  subtext?: string;
};

type SingleQuestion = QuestionBase & {
  kind: "single";
  options: string[];
};

type MultiQuestion = QuestionBase & {
  kind: "multi";
  options: string[];
  gridCols?: 2;
  minSelected?: number;
};

type SliderQuestion = QuestionBase & {
  kind: "slider";
  min: number;
  max: number;
  leftLabel: string;
  rightLabel: string;
};

type AnyQuestion = SingleQuestion | MultiQuestion | SliderQuestion;

const ACCENT = "#a855f7";

const LOADER_PHRASES = [
  "Reading your energy…",
  "Mapping 3,072 taste dimensions…",
  "Scanning 828 London nights…",
  "Weighing the unexpected…",
  "Curating your city…",
];

/* Full-screen interstitial while the recommendation engine runs. Turns
   dead API latency into the most cinematic moment of the product. */
function SubmitOverlay() {
  const [phrase, setPhrase] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setPhrase((x) => (x + 1) % LOADER_PHRASES.length),
      1600
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-14 px-6 text-center"
      style={{
        background: "rgba(6,5,14,0.88)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        animation: "kairos-page-in 400ms cubic-bezier(0.4,0,0.2,1) both",
      }}
      role="status"
      aria-live="polite"
    >
      <div className="kairos-orb">
        <div className="kairos-orb-ring" aria-hidden="true" />
        <div className="kairos-orb-ring kairos-orb-ring-2" aria-hidden="true" />
      </div>
      <div>
        <div
          key={phrase}
          className="editorial text-2xl font-semibold text-white sm:text-3xl"
          style={{
            animation: "kairos-fade-up 500ms cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          {LOADER_PHRASES[phrase]}
        </div>
        <div
          className="mt-5 text-[10px] font-semibold uppercase"
          style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.32em" }}
        >
          Kairos AI is building your profile
        </div>
      </div>
    </div>
  );
}

type PaletteName =
  | "night-underground"
  | "night-underground-light"
  | "warm-intimate"
  | "warm-intimate-light"
  | "outdoor-fresh"
  | "outdoor-fresh-light"
  | "social-warm"
  | "social-warm-light"
  | "gold-dark"
  | "blue-dark"
  | "default-dark";

function dispatchPalette(name: PaletteName) {
  try {
    sessionStorage.setItem("kairos:palette", name);
  } catch {}
  window.dispatchEvent(new CustomEvent("kairos-palette-change", { detail: name }));
}

const QUESTIONS: AnyQuestion[] = [
  {
    id: "fridayNight",
    kind: "single",
    label: "01 / VIBE",
    question: "What's your Friday night energy?",
    options: [
      "Quiet table deep conversation",
      "Buzzy bar run into people",
      "Dance floor no thoughts",
      "Wherever the night takes me",
    ],
  },
  {
    id: "aesthetic",
    kind: "single",
    label: "02 / AESTHETIC",
    question: "Pick your aesthetic.",
    options: [
      "Candlelit & cosy",
      "Neon & electric",
      "Elegant & refined",
      "Gritty & underground",
    ],
  },
  {
    id: "soundtrack",
    kind: "single",
    label: "03 / SOUNDTRACK",
    question: "What's your default soundtrack?",
    options: [
      "Chill / lo-fi / jazz",
      "Pop / mainstream",
      "Electronic / house / techno",
      "Indie / alternative",
    ],
  },
  {
    id: "genres",
    kind: "multi",
    label: "04 / TASTE",
    question: "What pulls you in? Pick all that apply.",
    options: [
      "Jazz and Soul",
      "Electronic and Club",
      "Classical and Arts",
      "Rock and Indie",
      "Comedy and Spoken Word",
      "Sports and Outdoor",
      "Social and Networking",
      "Food and Drinks",
      "Books and Ideas",
      "Experimental and Weird",
    ],
    gridCols: 2,
    minSelected: 1,
  },
  {
    id: "experienceIntent",
    kind: "single",
    label: "05 / INTENT",
    question: "What do you want tonight to do to you?",
    options: [
      "Make me think",
      "Make me feel something",
      "Make me move",
      "Make me laugh",
      "Surprise me",
    ],
  },
  {
    id: "social",
    kind: "single",
    label: "06 / SOCIAL",
    question: "Who's in your orbit tonight?",
    options: [
      "Solo",
      "Partner or one close friend",
      "Small gang 3 to 5 people",
      "The more the merrier",
    ],
  },
  {
    id: "timeOfDay",
    kind: "single",
    label: "07 / TIME",
    question: "When do you come alive?",
    options: [
      "Morning before 10am",
      "Afternoon noon to 6pm",
      "Evening 6pm to 10pm",
      "Night owl the later the better",
    ],
  },
  {
    id: "discoveryScore",
    kind: "slider",
    label: "08 / DISCOVERY DIAL",
    question: "How adventurous are you feeling?",
    min: 0,
    max: 100,
    leftLabel: "Comfort zone",
    rightLabel: "Surprise me",
  },
];

function glassCardClassName() {
  return [
    "rounded-3xl border border-white/10 bg-white/[0.06]",
    "shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_90px_rgba(0,0,0,0.55)]",
    "backdrop-blur-[20px]",
  ].join(" ");
}

function optionClassName(selected: boolean) {
  return [
    "w-full rounded-2xl border px-5 py-5 text-left",
    "transition-colors duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
    selected
      ? "border-[rgba(168,85,247,0.65)] bg-[rgba(168,85,247,0.14)]"
      : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]",
  ].join(" ");
}

function chipClassName(selected: boolean) {
  return [
    "rounded-full border px-4 py-2 text-sm font-medium",
    "transition-colors duration-200 ease-out",
    selected
      ? "border-[rgba(168,85,247,0.55)] bg-[rgba(168,85,247,0.12)] text-white"
      : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/25 hover:bg-white/[0.05]",
  ].join(" ");
}

function getDiscoveryLabel(v: number) {
  if (v <= 10) return "Only what I already love";
  if (v <= 20) return "Mostly familiar territory";
  if (v <= 30) return "A little outside my usual";
  if (v <= 40) return "Open to something new";
  if (v <= 50) return "Balanced explorer";
  if (v <= 60) return "Leaning adventurous";
  if (v <= 70) return "Show me something different";
  if (v <= 80) return "Take me somewhere unexpected";
  if (v <= 90) return "The more unusual the better";
  return "Fully uncharted, surprise me completely";
}

function getAnswerForQuestion(q: AnyQuestion, answers: QuizAnswers) {
  return answers[q.id];
}

export default function QuizPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const total = QUESTIONS.length; // 8
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({
    discoveryScore: 50,
    genres: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pulsing, setPulsing] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const current = QUESTIONS[index];

  useEffect(() => {
    // Keep current palette until Q1 triggers first shift.
  }, []);

  const stepDisplay = useMemo(() => {
    const x = Math.min(index + 1, total);
    return `${x} of ${total}`;
  }, [index, total]);

  const progressPct = useMemo(() => {
    const x = Math.min(index + 1, total);
    return total === 0 ? 0 : (x / total) * 100;
  }, [index, total]);

  useEffect(() => {
    sessionStorage.setItem("kairos:quiz", JSON.stringify({ quizAnswers: answers }));
  }, [answers]);

  async function submitAndGoFeed(finalAnswers: QuizAnswers) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      sessionStorage.setItem(
        "kairos:quiz",
        JSON.stringify({ quizAnswers: finalAnswers })
      );

      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quizAnswers: finalAnswers }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { results?: unknown };
      const results = Array.isArray((data as any)?.results) ? (data as any).results : [];

      sessionStorage.setItem(
        "kairos:recommendations",
        JSON.stringify({ results, createdAt: Date.now(), answers: finalAnswers })
      );

      router.push("/feed");
    } catch (e) {
      console.error("Quiz submit error:", e);
      setIsSubmitting(false);
      setSubmitError("We couldn't load your events. Check your connection and try again.");
    }
  }

  function goFeed() {
    sessionStorage.setItem("kairos:quiz", JSON.stringify({ quizAnswers: answers }));
    void submitAndGoFeed(answers);
  }

  function updateAnswer<K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "timeOfDay") {
        dispatchPalette("default-dark");
      }
      if (key === "fridayNight") {
        const v = String(value).toLowerCase();
        if (v.includes("dance floor")) dispatchPalette("night-underground");
        else if (v.includes("quiet table")) dispatchPalette("warm-intimate");
        else if (v.includes("buzzy bar")) dispatchPalette("social-warm");
        else dispatchPalette("default-dark");
      }
      if (key === "social") {
        const v = String(value).toLowerCase();
        if (v === "solo") dispatchPalette("night-underground-light");
        else if (v.startsWith("partner")) dispatchPalette("warm-intimate-light");
        else if (v.includes("more the merrier")) dispatchPalette("social-warm");
      }
      if (key === "aesthetic") {
        const v = String(value).toLowerCase();
        if (v.includes("neon")) dispatchPalette("night-underground");
        else if (v.includes("candlelit")) dispatchPalette("warm-intimate");
        else if (v.includes("elegant")) dispatchPalette("gold-dark");
        else if (v.includes("gritty")) dispatchPalette("night-underground");
      }
      if (key === "soundtrack") {
        const v = String(value).toLowerCase();
        if (v.includes("electronic")) dispatchPalette("night-underground");
        else if (v.includes("jazz")) dispatchPalette("warm-intimate");
        else if (v.includes("indie")) dispatchPalette("blue-dark");
        else dispatchPalette("default-dark");
      }
      if (key === "experienceIntent") {
        const v = String(value).toLowerCase();
        if (v.includes("think")) dispatchPalette("warm-intimate");
        else if (v.includes("move")) dispatchPalette("social-warm");
        else if (v.includes("feel")) dispatchPalette("night-underground-light");
      }
      return next;
    });
  }

  function toggleMulti(key: keyof QuizAnswers, option: string) {
    setAnswers((prev) => {
      const currentVal = prev[key];
      const arr = Array.isArray(currentVal) ? (currentVal as string[]) : [];
      const next = arr.includes(option) ? arr.filter((x) => x !== option) : [...arr, option];
      const nextAnswers = { ...prev, [key]: next } as QuizAnswers;
      if (key === "genres") {
        const g = (nextAnswers.genres ?? []).map((x) => x.toLowerCase());
        const has = (needle: string) => g.some((x) => x.includes(needle));
        const hasElectronic = has("electronic") || has("club");
        const hasWarm = has("jazz") || has("classical");
        const hasOutdoor = has("outdoor") || has("sports");

        if (hasElectronic) dispatchPalette("night-underground");
        else if (hasOutdoor) dispatchPalette("outdoor-fresh");
        else if (hasWarm) dispatchPalette("warm-intimate");
        else dispatchPalette("default-dark");
      }
      return nextAnswers;
    });
  }

  function canContinue() {
    if (!current) return false;
    const a = getAnswerForQuestion(current, answers);

    switch (current.kind) {
      case "single":
        return typeof a === "string" && a.trim().length > 0;
      case "multi": {
        const arr = Array.isArray(a) ? a : [];
        const min = current.minSelected ?? 1;
        return arr.length >= min;
      }
      case "slider":
        return true;
      default:
        return false;
    }
  }

  function advanceToNextCard() {
    if (index >= total - 1) {
      void submitAndGoFeed(answers);
      return;
    }
    setIndex((i) => Math.min(i + 1, total - 1));
  }

  // Keyboard flow: number keys pick an answer, Enter continues. The quiz
  // should feel playable, like an instrument.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isSubmitting) return;
      if (!current) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "BUTTON" ||
          target.tagName === "INPUT" ||
          target.tagName === "A")
      ) {
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        next();
        return;
      }

      if (current.kind === "single") {
        const n = Number(e.key);
        if (Number.isInteger(n) && n >= 1 && n <= current.options.length) {
          const opt = current.options[n - 1];
          setPulsing(opt);
          updateAnswer(current.id, opt);
          window.setTimeout(() => {
            setPulsing(null);
            advanceToNextCard();
          }, 250);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function next() {
    if (!current) return;
    if (!canContinue()) return;

    if (current.id === "discoveryScore") {
      void submitAndGoFeed(answers);
      return;
    }

    if (index >= total - 1) {
      void submitAndGoFeed(answers);
      return;
    }

    advanceToNextCard();
  }

  return (
    <main className="min-h-dvh" style={{ color: "rgba(255,255,255,0.92)" }}>
      {isSubmitting ? <SubmitOverlay /> : null}
      <div className="mx-auto w-full max-w-3xl px-5 pb-14 pt-8 sm:px-8">
        <header className="mb-6">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <div className="text-sm font-semibold tracking-[0.28em] text-white/70 uppercase">
              Kairos
            </div>

            <div className="flex items-center justify-center">
              <div className="text-sm font-medium text-white/70">{stepDisplay}</div>
            </div>

            <button
              type="button"
              onClick={goFeed}
              disabled={isSubmitting}
              className="text-sm font-medium text-white/60 underline decoration-white/20 underline-offset-4 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Skip
            </button>
          </div>

          <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${ACCENT} 0%, #f472b6 100%)`,
                boxShadow:
                  "0 0 12px rgba(168,85,247,0.75), 0 0 26px rgba(244,114,182,0.35)",
              }}
            />
          </div>
        </header>

        <AnimatePresence mode="wait">
        <motion.section
          key={index}
          className={[glassCardClassName(), "px-6 pb-6 pt-6 sm:px-8 sm:pb-7 sm:pt-7"].join(" ")}
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { duration: prefersReducedMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] },
          }}
          exit={{
            opacity: 0,
            y: prefersReducedMotion ? 0 : -20,
            transition: { duration: prefersReducedMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] },
          }}
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="text-xs font-semibold tracking-[0.22em] text-white/60 uppercase">
              {current.label}
            </div>
          </div>

          <h1 className="editorial text-balance text-3xl font-semibold leading-tight text-white sm:text-5xl">
            {current.question}
          </h1>

          {current.subtext ? (
            <p className="mt-3 text-sm text-white/60">{current.subtext}</p>
          ) : null}

          <div className="mt-7 space-y-4">
            {current.kind === "single" ? (
              <div className="grid grid-cols-1 gap-3">
                {current.options.map((opt, optIdx) => {
                  const selected = answers[current.id] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        if (isSubmitting) return;
                        setPulsing(opt);
                        updateAnswer(current.id, opt);
                        if (current.id === "discoveryScore") return;
                        window.setTimeout(() => {
                          setPulsing(null);
                          advanceToNextCard();
                        }, 250);
                      }}
                      disabled={isSubmitting}
                      className={optionClassName(selected)}
                      style={{
                        animation:
                          pulsing === opt
                            ? "kairos-pulse-select 250ms ease-out"
                            : `kairos-fade-up 440ms cubic-bezier(0.16,1,0.3,1) ${
                                140 + optIdx * 65
                              }ms both`,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                          style={{
                            background: selected
                              ? "linear-gradient(135deg, rgba(168,85,247,0.85) 0%, rgba(244,114,182,0.75) 100%)"
                              : "rgba(255,255,255,0.05)",
                            border: selected
                              ? "1px solid rgba(255,255,255,0.25)"
                              : "1px solid rgba(255,255,255,0.12)",
                            color: selected ? "#fff" : "rgba(255,255,255,0.45)",
                            transition: "all 200ms ease",
                          }}
                          aria-hidden="true"
                        >
                          {optIdx + 1}
                        </span>
                        <span className="text-base font-medium text-white">
                          {opt}
                        </span>
                      </div>
                    </button>
                  );
                })}
                <div
                  className="mt-1 hidden text-xs sm:block"
                  style={{ color: "rgba(255,255,255,0.28)" }}
                >
                  Press 1 to {current.options.length} to choose
                </div>
              </div>
            ) : null}

            {current.kind === "multi" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {current.options.map((opt, optIdx) => {
                  const arr = (answers[current.id] ?? []) as string[];
                  const selected = Array.isArray(arr) && arr.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        if (isSubmitting) return;
                        toggleMulti(current.id, opt);
                      }}
                      disabled={isSubmitting}
                      className={optionClassName(selected)}
                      style={{
                        animation: `kairos-fade-up 440ms cubic-bezier(0.16,1,0.3,1) ${
                          120 + optIdx * 45
                        }ms both`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-base font-medium text-white">
                          {opt}
                        </span>
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]"
                          style={{
                            background: selected
                              ? "linear-gradient(135deg, #a855f7 0%, #f472b6 100%)"
                              : "rgba(255,255,255,0.06)",
                            border: selected
                              ? "1px solid rgba(255,255,255,0.3)"
                              : "1px solid rgba(255,255,255,0.14)",
                            color: "#fff",
                            transition: "all 200ms ease",
                          }}
                          aria-hidden="true"
                        >
                          {selected ? "✓" : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {current.kind === "slider" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-white/60">
                  <div>{current.leftLabel}</div>
                  <div>{current.rightLabel}</div>
                </div>

                <input
                  type="range"
                  min={current.min}
                  max={current.max}
                  value={typeof answers.discoveryScore === "number" ? answers.discoveryScore : 50}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateAnswer("discoveryScore", val);
                    if (val > 70) dispatchPalette("night-underground");
                    else if (val >= 40) dispatchPalette("default-dark");
                    else dispatchPalette("warm-intimate");
                  }}
                  className="kairos-range"
                  style={{
                    ["--pct" as never]: `${
                      typeof answers.discoveryScore === "number"
                        ? `${answers.discoveryScore}%`
                        : "50%"
                    }`,
                  }}
                />

                <div className="text-sm font-medium" style={{ color: ACCENT }}>
                  {getDiscoveryLabel(typeof answers.discoveryScore === "number" ? answers.discoveryScore : 50)}
                </div>
              </div>
            ) : null}

          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={next}
              disabled={!canContinue()}
              className={[
                "inline-flex h-12 w-full items-center justify-center rounded-2xl px-6 text-sm font-semibold",
                "transition-all duration-200 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
                canContinue() ? "text-white kairos-btn-press" : "cursor-not-allowed text-white/45",
              ].join(" ")}
              style={{
                background: canContinue()
                  ? "linear-gradient(135deg, #a855f7 0%, #f472b6 100%)"
                  : "rgba(255,255,255,0.08)",
                boxShadow: canContinue()
                  ? "0 0 34px rgba(168,85,247,0.35), 0 8px 24px rgba(0,0,0,0.3)"
                  : "none",
              }}
            >
              {isSubmitting
                ? "Finding your matches…"
                : current.id === "discoveryScore"
                  ? "See my results"
                  : "Continue"}
            </button>

            {submitError ? (
              <p
                className="mt-3 text-center text-sm"
                style={{ color: "#f472b6", fontFamily: "var(--font-body), system-ui, sans-serif" }}
                role="alert"
              >
                {submitError}
              </p>
            ) : null}
          </div>
        </motion.section>
        </AnimatePresence>
      </div>
    </main>
  );
}


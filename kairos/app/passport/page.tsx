"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import KairosFooter from "../components/KairosFooter";

type QuizAnswers = {
  timeOfDay?: string;
  fridayNight?: string;
  social?: string;
  genres?: string[];
  discoveryScore?: number;
  setting?: string[];
  spendMindset?: string;
  priceRange?: string[];
  physical?: string;
  experienceType?: string[];
  openness?: string;
  spontaneity?: string;
  frequency?: string;
};

const ACCENT = "#a855f7";
const ACCENT_2 = "#f472b6";

type Archetype = {
  name: string;
  sub: string;
  description: string;
};

const ARCHETYPE_DESC: Record<string, string> = {
  Raver:
    "You live for the after-midnight hours when the city reveals its best-kept secrets. Dark rooms, heavy bass, and the electric feeling of being exactly where you are supposed to be.",
  Flaneur:
    "You drift through the city with a connoisseur's eye, collecting experiences like others collect stamps. The journey is never linear and that is exactly how you like it.",
  Connector:
    "Events are your social infrastructure. You measure a good night by who you met, what was said, and whether you will see them again.",
  Athlete:
    "The city is your playground and you mean that literally. You want to feel the world through your body and the best events leave you physically spent.",
  Connoisseur:
    "You have standards and that is not a crime. You do not go to many events but the ones you choose are researched, deliberate, and almost always exceptional.",
  Hedonist:
    "You decided to go out at 6pm tonight. You are already in line by 9. Plans are suggestions, budgets are flexible.",
  "Lone Wolf":
    "You go out deliberately and you go alone. Not from shyness, from a desire to be fully present. You have seen more extraordinary things than most people know exist in this city.",
  Intellectual:
    "You want to leave with your mind rearranged. Panel discussions, philosophical debates, author talks. You take notes at events.",
};

function deriveArchetype(a: QuizAnswers): Archetype {
  const physical = (a.physical ?? "").toLowerCase();
  const timeOfDay = (a.timeOfDay ?? "").toLowerCase();
  const friday = (a.fridayNight ?? "").toLowerCase();
  const social = (a.social ?? "").toLowerCase();
  const exp = (a.experienceType ?? []).join(" ").toLowerCase();
  const openness = (a.openness ?? "").toLowerCase();
  const spend = (a.spendMindset ?? "").toLowerCase();
  const spont = (a.spontaneity ?? "").toLowerCase();

  if (physical.includes("hike run cycle")) {
    return { name: "The Athlete", sub: "The Urban Explorer", description: ARCHETYPE_DESC.Athlete };
  }
  if (timeOfDay.includes("night owl") && friday.includes("dance floor")) {
    return { name: "The Raver", sub: "The Midnight Architect", description: ARCHETYPE_DESC.Raver };
  }
  if (social.includes("solo")) {
    return { name: "The Lone Wolf", sub: "The Quiet Discoverer", description: ARCHETYPE_DESC["Lone Wolf"] };
  }
  if (exp.includes("make me think")) {
    return { name: "The Intellectual", sub: "The Thinking Flaneur", description: ARCHETYPE_DESC.Intellectual };
  }
  if (friday.includes("buzzy bar") && openness.includes("love meeting strangers")) {
    return { name: "The Connector", sub: "The Scene Weaver", description: ARCHETYPE_DESC.Connector };
  }
  if (spend.includes("price rarely stops me")) {
    return { name: "The Connoisseur", sub: "The Velvet Underground", description: ARCHETYPE_DESC.Connoisseur };
  }
  if (spont.includes("whim")) {
    return { name: "The Hedonist", sub: "The Spontaneous Architect", description: ARCHETYPE_DESC.Hedonist };
  }
  return { name: "The Flaneur", sub: "The Cultural Cartographer", description: ARCHETYPE_DESC.Flaneur };
}

function tasteTags(a: QuizAnswers) {
  const g = (a.genres ?? []).join(" ").toLowerCase();
  const tags: string[] = [];
  if (g.includes("electronic")) tags.push("Electronic");
  if (g.includes("jazz")) tags.push("Jazz");
  if (g.includes("classical")) tags.push("Classical");
  if (g.includes("sports") || g.includes("outdoor")) tags.push("Outdoor");
  if ((a.timeOfDay ?? "").toLowerCase().includes("night owl")) tags.push("Night Owl");
  if (tags.length < 4 && (a.discoveryScore ?? 0) >= 70) tags.push("Adventurous");
  return Array.from(new Set(tags)).slice(0, 4);
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

function radarValues(a: QuizAnswers) {
  const friday = (a.fridayNight ?? "").toLowerCase();
  const social = (a.social ?? "").toLowerCase();
  const exp = (a.experienceType ?? []).join(" ").toLowerCase();
  const time = (a.timeOfDay ?? "").toLowerCase();

  const energy = friday.includes("dance floor") ? 95 : friday.includes("buzzy bar") ? 70 : friday.includes("quiet") ? 30 : 55;
  const socialV =
    social.includes("more the merrier") ? 95 :
    social.includes("small gang") ? 70 :
    social.includes("partner") ? 45 :
    social.includes("solo") ? 20 : 55;
  const discovery = clamp(Math.round(a.discoveryScore ?? 50));
  const culture =
    exp.includes("make me think") ? 90 :
    exp.includes("make me feel") ? 75 :
    exp.includes("make me laugh") ? 65 :
    exp.includes("make me move") ? 55 : 60;
  const night =
    time.includes("night owl") ? 95 :
    time.includes("evening") ? 70 :
    time.includes("afternoon") ? 40 :
    time.includes("morning") ? 20 : 55;

  return { energy, social: socialV, discovery, culture, night };
}

function polygonPoints(values: number[]) {
  const cx = 120;
  const cy = 120;
  const r = 92;
  const pts = values.map((v, i) => {
    const angle = (-90 + i * 72) * (Math.PI / 180);
    const rr = (v / 100) * r;
    const x = cx + Math.cos(angle) * rr;
    const y = cy + Math.sin(angle) * rr;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return pts.join(" ");
}

type Integration = {
  id: string;
  icon: React.ReactNode;
  name: string;
  desc: string;
};

function IconMusic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(168,85,247,0.85)" aria-hidden="true">
      <path d="M9 3v11.55A4 4 0 1 0 11 18V7h4V3z" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconBowl() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11a9 9 0 1 0 18 0H3z" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

const INTEGRATIONS: Integration[] = [
  { id: "spotify", icon: <IconMusic />, name: "Spotify", desc: "Your listening patterns and moods." },
  { id: "strava", icon: <IconActivity />, name: "Strava", desc: "Your movement habits and routines." },
  { id: "hinge", icon: <IconHeart />, name: "Hinge", desc: "Your dating energy and social style." },
  { id: "deliveroo", icon: <IconBowl />, name: "Deliveroo", desc: "Your cravings and comfort spots." },
  { id: "goodreads", icon: <IconBook />, name: "Goodreads", desc: "Your ideas, authors, and obsessions." },
];

export default function PassportPage() {
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [animateBars, setAnimateBars] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kairos:quiz");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { quizAnswers?: QuizAnswers };
      setAnswers(parsed.quizAnswers ?? {});
    } catch {
      setAnswers({});
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setAnimateBars(true), 120);
    return () => window.clearTimeout(t);
  }, []);

  const archetype = useMemo(() => deriveArchetype(answers), [answers]);
  const tags = useMemo(() => tasteTags(answers), [answers]);
  const values = useMemo(() => radarValues(answers), [answers]);

  const axes = [
    { k: "Energy", v: values.energy },
    { k: "Social", v: values.social },
    { k: "Discovery", v: values.discovery },
    { k: "Culture", v: values.culture },
    { k: "Night", v: values.night },
  ];

  const pts = polygonPoints([values.energy, values.social, values.discovery, values.culture, values.night]);

  const badges = useMemo(() => {
    const b: string[] = [archetype.name];
    if ((answers.discoveryScore ?? 0) > 60) b.push("Trailblazer");
    if ((answers.frequency ?? "").toLowerCase().includes("live for this")) b.push("Night Owl");
    if ((answers.genres ?? []).length >= 4) b.push("Genre Hopper");
    if ((answers.spontaneity ?? "").toLowerCase().includes("whim")) b.push("Yes Person");
    return b.slice(0, 4);
  }, [answers, archetype.name]);

  return (
    <main className="min-h-dvh">
      <div className="mx-auto w-full max-w-5xl px-6 pb-20 pt-10 sm:px-10">

        <div className="mb-10 flex items-center gap-3">
          <Link
            href="/feed"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/80"
            style={{ background: "rgba(255,255,255,0.04)", boxShadow: "0 0 0 1px rgba(255,255,255,0.08)" }}
            aria-label="Back to feed"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <Link href="/" className="editorial text-lg font-semibold text-white">
            Kairos
          </Link>
        </div>

        <div className="mb-2">
          <p
            className="mb-3 text-[10px] font-semibold uppercase"
            style={{ color: ACCENT, letterSpacing: "0.35em" }}
          >
            Profile
          </p>
          <h1 className="editorial text-balance text-4xl font-semibold leading-tight text-white sm:text-6xl">
            Your Taste{" "}
            <em className="kairos-gradient-text" style={{ fontStyle: "italic" }}>
              DNA
            </em>
          </h1>
        </div>

        {/* Archetype card */}
        <div
          className="mt-10 rounded-3xl px-6 py-8 sm:px-10 sm:py-10"
          style={{
            background: "rgba(255,255,255,0.03)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 24px 90px rgba(0,0,0,0.55)",
            backdropFilter: "blur(18px)",
          }}
        >
          <div
            className="text-[10px] font-semibold uppercase"
            style={{ color: ACCENT, letterSpacing: "0.3em" }}
          >
            {archetype.sub}
          </div>
          <div className="editorial mt-2 text-[48px] font-bold leading-none text-white sm:text-[60px]">
            {archetype.name}
          </div>
          <p className="mt-5 max-w-2xl text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
            {archetype.description}
          </p>

          {tags.length > 0 ? (
            <div className="mt-7 flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full px-4 py-2 text-sm font-medium"
                  style={{
                    color: "rgba(255,255,255,0.90)",
                    background: "rgba(168,85,247,0.12)",
                    border: "1px solid rgba(168,85,247,0.32)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          {/* Radar + axes */}
          <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-2 md:items-start">
            {/* Score bars */}
            <div className="space-y-5">
              <div className="editorial text-2xl font-semibold text-white">Your radar</div>
              <div className="space-y-4">
                {axes.map((a, index) => (
                  <div key={a.k}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                        {a.k}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: ACCENT }}>
                        {a.v}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div
                        className="h-full rounded-full transition-[width] duration-700 ease-out"
                        style={{
                          width: animateBars ? `${a.v}%` : "0%",
                          transitionDelay: `${index * 80}ms`,
                          background: `linear-gradient(90deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SVG radar */}
            <div className="flex justify-center">
              <svg
                width="260"
                height="260"
                viewBox="0 0 240 240"
                role="img"
                aria-label="Taste radar chart"
              >
                {[1, 0.75, 0.5, 0.25].map((s, i) => (
                  <polygon
                    key={i}
                    points={polygonPoints([100 * s, 100 * s, 100 * s, 100 * s, 100 * s])}
                    fill="none"
                    stroke="rgba(255,255,255,0.09)"
                    strokeWidth="1"
                  />
                ))}

                {["Energy", "Social", "Discovery", "Culture", "Night"].map((label, i) => {
                  const angle = (-90 + i * 72) * (Math.PI / 180);
                  const x = 120 + Math.cos(angle) * 114;
                  const y = 120 + Math.sin(angle) * 114;
                  return (
                    <text
                      key={label}
                      x={x}
                      y={y}
                      fill="rgba(255,255,255,0.45)"
                      fontSize="10"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="var(--font-body), system-ui, sans-serif"
                    >
                      {label}
                    </text>
                  );
                })}

                <polygon
                  points={pts}
                  fill="rgba(168,85,247,0.18)"
                  stroke={ACCENT}
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Badges */}
        <section className="mt-10 space-y-5">
          <div className="editorial text-2xl font-semibold text-white">Badges</div>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b}
                className="rounded-full px-5 py-2 text-sm font-semibold text-white"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                {b}
              </span>
            ))}
          </div>
        </section>

        {/* Integrations */}
        <section className="mt-10 space-y-5">
          <div className="editorial text-2xl font-semibold text-white">Connect your apps</div>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            Unlock a richer taste profile by connecting the apps that already know you.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {INTEGRATIONS.map((itg) => {
              const isOn = !!connected[itg.id];
              return (
                <div
                  key={itg.id}
                  className="flex items-center justify-between gap-4 rounded-2xl px-4 py-4"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.09)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: "rgba(168,85,247,0.10)",
                        border: "1px solid rgba(168,85,247,0.20)",
                      }}
                    >
                      {itg.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{itg.name}</div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>
                        {itg.desc}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConnected((p) => ({ ...p, [itg.id]: true }))}
                    className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity"
                    style={{
                      background: isOn
                        ? "rgba(255,255,255,0.06)"
                        : `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`,
                      border: "1px solid rgba(255,255,255,0.10)",
                      opacity: isOn ? 0.8 : 1,
                    }}
                  >
                    {isOn ? "Connected" : "Connect"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTAs */}
        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/feed"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`,
              boxShadow: "0 18px 60px rgba(168,85,247,0.22)",
            }}
          >
            Explore my feed
          </Link>
          <Link
            href="/quiz"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white/80 transition-opacity hover:opacity-80"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
          >
            Retake the quiz
          </Link>
        </div>
      </div>
      <KairosFooter />
    </main>
  );
}

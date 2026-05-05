"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EventCard } from "../components/EventCard";
import type { EventCardEvent } from "../components/EventCard";

type RecommendResult = {
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

export default function SavedPage() {
  const router = useRouter();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [allEvents, setAllEvents] = useState<RecommendResult[]>([]);

  useEffect(() => {
    try {
      const savedRaw = sessionStorage.getItem("kairos:saved");
      const saved = savedRaw ? (JSON.parse(savedRaw) as string[]) : [];
      setSavedIds(Array.isArray(saved) ? saved : []);

      const recRaw = sessionStorage.getItem("kairos:recommendations");
      const recParsed = recRaw ? JSON.parse(recRaw) : null;
      const recs = Array.isArray(recParsed?.results)
        ? (recParsed.results as RecommendResult[])
        : [];
      setAllEvents(recs);
    } catch {
      setSavedIds([]);
      setAllEvents([]);
    }
  }, []);

  const savedEvents = useMemo(
    () => allEvents.filter((e) => savedIds.includes(e.id)),
    [allEvents, savedIds]
  );

  const suggested = useMemo(
    () => allEvents.filter((e) => !savedIds.includes(e.id)).slice(0, 6),
    [allEvents, savedIds]
  );

  function persist(next: string[]) {
    setSavedIds(next);
    try {
      sessionStorage.setItem("kairos:saved", JSON.stringify(next));
    } catch {
      // Ignore storage errors.
    }
  }

  function toggleSave(id: string) {
    if (savedIds.includes(id)) {
      persist(savedIds.filter((x) => x !== id));
    } else {
      persist([...savedIds, id]);
    }
  }

  function openEvent(ev: EventCardEvent) {
    sessionStorage.setItem("kairos:currentEvent", JSON.stringify(ev));
    router.push(`/event/${encodeURIComponent(ev.id)}`);
  }

  return (
    <main className="min-h-dvh">
      <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-10 sm:px-8">
        <header className="mb-10">
          <p
            className="mb-3 text-[10px] font-semibold uppercase"
            style={{ color: "#a855f7", letterSpacing: "0.32em" }}
          >
            Your shortlist
          </p>
          <h1 className="editorial text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Saved
          </h1>
          <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.50)" }}>
            Events you want to remember.
          </p>
        </header>

        {savedEvents.length === 0 ? (
          <section
            className="flex flex-col items-center justify-center rounded-3xl px-8 py-16 text-center"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                background:
                  "linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(244,114,182,0.12) 100%)",
                border: "1px solid rgba(168,85,247,0.25)",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(168,85,247,0.8)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <p
              className="editorial mb-2 text-2xl font-semibold text-white"
            >
              Nothing saved yet
            </p>
            <p
              className="mb-8 max-w-sm text-sm"
              style={{ color: "rgba(255,255,255,0.50)" }}
            >
              Explore your feed and tap the heart on events you want to
              remember.
            </p>
            <Link
              href="/feed"
              className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
              style={{
                background:
                  "linear-gradient(135deg, #a855f7 0%, #f472b6 100%)",
                boxShadow: "0 0 32px rgba(168,85,247,0.35)",
              }}
            >
              Find your moment.
            </Link>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {savedEvents.map((ev) => (
              <EventCard
                key={ev.id}
                ev={ev}
                onOpen={openEvent}
                isSaved={true}
                onToggleSave={toggleSave}
                variant="grid"
              />
            ))}
          </section>
        )}

        {suggested.length > 0 ? (
          <section className="mt-14">
            <p
              className="mb-5 text-[10px] font-semibold uppercase"
              style={{ color: "rgba(255,255,255,0.38)", letterSpacing: "0.26em" }}
            >
              You might also like
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {suggested.map((ev) => (
                <EventCard
                  key={ev.id}
                  ev={ev}
                  onOpen={openEvent}
                  isSaved={savedIds.includes(ev.id)}
                  onToggleSave={toggleSave}
                  variant="grid"
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

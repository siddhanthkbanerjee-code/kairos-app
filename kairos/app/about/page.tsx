import Link from "next/link";
import KairosFooter from "../components/KairosFooter";

export default function AboutPage() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto w-full max-w-4xl px-6 pb-4 pt-16 sm:px-10">
        <p
          className="mb-6 text-[10px] font-semibold uppercase"
          style={{ color: "#a855f7", letterSpacing: "0.38em" }}
        >
          Manifesto
        </p>

        <h1
          className="editorial text-balance font-bold leading-[1.04] text-white"
          style={{ fontSize: "clamp(38px, 6.5vw, 72px)" }}
        >
          Great nights should{" "}
          <em style={{ fontStyle: "italic", color: "#f472b6" }}>find you.</em>
        </h1>

        <div className="mt-12 space-y-7 text-base leading-relaxed text-white/70 sm:text-lg">
          <p>
            London has thousands of events happening every week, but discovery
            is broken. You either scroll endless ticket grids, or you find out
            about something perfect the next day through someone else&rsquo;s
            story.
          </p>
          <p>
            Kairos uses AI to understand your cultural taste at a deeper level
            than &ldquo;popular near you.&rdquo; We learn the shape of your
            nights: the energy, the setting, the social context, and what you
            actually want to feel. We then surface the events that match that
            profile.
          </p>
        </div>

        <blockquote
          className="my-14 border-l-2 py-2 pl-8"
          style={{ borderColor: "rgba(168,85,247,0.6)" }}
        >
          <p
            className="editorial text-balance text-2xl italic leading-snug sm:text-3xl"
            style={{ color: "rgba(255,255,255,0.88)" }}
          >
            A city that feels curated. Not by influencers, not by algorithms
            chasing virality. By your taste, in the moment it matters.
          </p>
        </blockquote>

        <div className="space-y-7 text-base leading-relaxed text-white/70 sm:text-lg">
          <p>
            The taste quiz is the start: it captures how you move through the
            city. The match score isn&rsquo;t a generic rating; it&rsquo;s a
            similarity signal calculated from your profile against event
            &ldquo;DNA&rdquo; so the feed becomes more you every time.
          </p>
          <p>
            Kairos is Greek for the perfect moment. Not clock time, the other
            kind: the night you still talk about years later. That is what we
            are building toward.
          </p>
        </div>

        <div className="mt-14">
          <Link
            href="/quiz"
            className="kairos-cta kairos-btn-press inline-flex h-12 items-center justify-center gap-2 rounded-full px-8 text-sm font-semibold text-white"
            style={{
              background:
                "linear-gradient(135deg, rgba(168,85,247,1) 0%, rgba(244,114,182,0.92) 100%)",
              boxShadow: "0 18px 60px rgba(168,85,247,0.22)",
            }}
          >
            Start discovering
            <span className="kairos-cta-arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>
        </div>
      </div>

      <KairosFooter />
    </main>
  );
}

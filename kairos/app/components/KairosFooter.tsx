import Link from "next/link";

/* Shared editorial footer. A huge ghost wordmark sits behind hairline
   link rows, the way a fashion house closes a lookbook. */
export default function KairosFooter() {
  return (
    <footer
      className="relative mt-20 overflow-hidden"
      style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div
        className="kairos-footer-ghost absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[38%]"
        aria-hidden="true"
      >
        Kairos
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-6 pb-10 pt-14 sm:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:items-start">
          <div className="space-y-3">
            <Link href="/" className="editorial text-2xl font-bold text-white">
              Kairos
            </Link>
            <div
              className="text-[10px] font-semibold uppercase"
              style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.3em" }}
            >
              Find your perfect moment
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/60">
              <Link href="/feed" className="transition-colors hover:text-white">
                Discover
              </Link>
              <Link href="/passport" className="transition-colors hover:text-white">
                Taste Passport
              </Link>
              <Link href="/saved" className="transition-colors hover:text-white">
                Saved
              </Link>
              <Link href="/about" className="transition-colors hover:text-white">
                About
              </Link>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/40">
              <Link href="/coming-soon" className="transition-colors hover:text-white/70">
                For Venues
              </Link>
              <Link href="/coming-soon" className="transition-colors hover:text-white/70">
                Careers
              </Link>
              <Link href="/coming-soon" className="transition-colors hover:text-white/70">
                Press
              </Link>
              <Link href="/help" className="transition-colors hover:text-white/70">
                Help
              </Link>
            </div>
            <div className="text-xs text-white/30">
              All rights reserved. All wrongs reversed. · Made with obsession in London.
            </div>
          </div>

          <div className="flex flex-col gap-2 text-xs text-white/35 md:items-end md:text-right">
            <div className="flex items-center gap-2 md:justify-end">
              <span className="kairos-live-dot" aria-hidden="true" />
              <span
                className="font-semibold uppercase"
                style={{ letterSpacing: "0.22em" }}
              >
                London · Live
              </span>
            </div>
            <div>Kairos 2026. Not responsible for life-changing nights.</div>
            <div style={{ color: "rgba(168,85,247,0.55)" }}>v0.2</div>
          </div>
        </div>
      </div>
    </footer>
  );
}

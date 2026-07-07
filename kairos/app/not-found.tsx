import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto flex min-h-[calc(100dvh-160px)] w-full max-w-3xl flex-col items-center justify-center px-6 pb-16 pt-10 text-center sm:px-10">
        <p
          className="mb-6 text-[10px] font-semibold uppercase"
          style={{ color: "#a855f7", letterSpacing: "0.38em" }}
        >
          404
        </p>
        <h1
          className="editorial text-balance font-bold leading-[1.02] text-white"
          style={{ fontSize: "clamp(44px, 8vw, 84px)" }}
        >
          Lost in the{" "}
          <em style={{ fontStyle: "italic", color: "#f472b6" }}>night.</em>
        </h1>
        <p className="mt-6 max-w-md text-base text-white/55">
          This page doesn&rsquo;t exist, or the moment has passed. The city
          moves fast.
        </p>
        <Link
          href="/"
          className="kairos-cta kairos-btn-press mt-10 inline-flex h-12 items-center justify-center gap-2 rounded-full px-8 text-sm font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, #a855f7 0%, #f472b6 100%)",
            boxShadow: "0 0 40px rgba(168,85,247,0.35)",
          }}
        >
          Take me home
          <span className="kairos-cta-arrow" aria-hidden="true">
            &rarr;
          </span>
        </Link>
      </div>
    </main>
  );
}

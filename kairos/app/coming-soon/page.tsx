import Link from "next/link";

export default function ComingSoonPage() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto flex min-h-[calc(100dvh-77px)] w-full max-w-3xl flex-col items-center justify-center px-6 pb-16 pt-10 text-center sm:px-10">
        <p
          className="mb-6 inline-flex items-center gap-2.5 text-[10px] font-semibold uppercase"
          style={{ color: "#a855f7", letterSpacing: "0.38em" }}
        >
          <span className="kairos-live-dot" aria-hidden="true" />
          In the works
        </p>
        <h1
          className="editorial text-balance font-bold leading-[1.02] text-white"
          style={{ fontSize: "clamp(44px, 8vw, 84px)" }}
        >
          Coming{" "}
          <em style={{ fontStyle: "italic", color: "#f472b6" }}>soon.</em>
        </h1>
        <p className="mt-6 max-w-md text-base text-white/60">
          We are building something here. Check back soon.
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 text-sm font-semibold uppercase transition-colors hover:text-white"
          style={{ color: "#a855f7", letterSpacing: "0.22em" }}
        >
          Back to home
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </main>
  );
}

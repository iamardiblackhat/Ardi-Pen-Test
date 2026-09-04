import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { routes } from "@/shared/config/routes";

export default function NotFound() {
  return (
    <main className="dark grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,rgba(82,132,255,0.22),transparent_34%),#080b21] px-4 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-violet-300/20 bg-[#17113a]/90 p-8 shadow-[0_24px_80px_rgba(4,7,28,0.55)]">
        <AlertCircle className="h-10 w-10 text-cyan-200" aria-hidden="true" />
        <p className="mt-6 font-mono text-sm uppercase tracking-[0.18em] text-cyan-200">
          ARDI SEC / 404
        </p>
        <h1 className="mt-3 text-3xl font-bold">Page not found</h1>
        <p className="mt-4 text-base leading-7 text-indigo-100/70">
          This route does not exist or is no longer available.
        </p>
        <Link
          href={routes.home}
          className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Return to ARDI SEC
        </Link>
      </section>
    </main>
  );
}

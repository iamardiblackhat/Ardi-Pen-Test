import { securityCapabilities } from "@/features/onboarding/onboarding-content";

export function SecurityCapabilityGrid() {
  return (
    <div
      className="mt-7 grid gap-3 sm:grid-cols-2"
      aria-label="ARDI Security capabilities"
    >
      {securityCapabilities.map((capability) => {
        const Icon = capability.icon;

        return (
          <article
            key={capability.name}
            className="rounded-xl border border-violet-300/15 bg-[#0b1230]/70 p-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-white">
              {capability.name}
            </h3>
            <p className="mt-2 text-sm leading-6 text-indigo-100/70">
              {capability.detail}
            </p>
          </article>
        );
      })}
    </div>
  );
}

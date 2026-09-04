import { CheckCircle2 } from "lucide-react";
import { onboardingSteps } from "@/features/onboarding/onboarding-content";

export function OnboardingProgress({ step }: { step: number }) {
  return (
    <ol className="mb-7 grid grid-cols-4 gap-2" aria-label="Setup progress">
      {onboardingSteps.map((label, index) => {
        const number = index + 1;
        const complete = number < step;
        const active = number <= step;

        return (
          <li key={label} className="text-center">
            <span
              className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full border font-mono text-sm font-bold transition-colors ${
                active
                  ? "border-cyan-300/70 bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-[0_0_24px_rgba(93,146,255,0.35)]"
                  : "border-white/10 bg-white/5 text-indigo-200/55"
              }`}
              aria-current={number === step ? "step" : undefined}
            >
              {complete ? (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              ) : (
                number
              )}
            </span>
            <span className="mt-2 block text-[13px] font-medium text-indigo-100/75">
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

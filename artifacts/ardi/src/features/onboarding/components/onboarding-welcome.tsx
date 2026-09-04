import { Button } from "@workspace/ardi-ds/components/ui/button";
import { SecurityCapabilityGrid } from "./security-capability-grid";

export function OnboardingWelcome({
  panelClass,
  primaryButtonClass,
  onContinue,
}: {
  panelClass: string;
  primaryButtonClass: string;
  onContinue: () => void;
}) {
  return (
    <section className={panelClass} aria-labelledby="onboarding-welcome-title">
      <p className="font-mono text-sm uppercase tracking-[0.16em] text-cyan-200">
        ARDI Security workspace
      </p>
      <h2
        id="onboarding-welcome-title"
        className="mt-3 text-2xl font-bold sm:text-3xl"
      >
        Choose the work. ARDI handles the route.
      </h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-indigo-100/75">
        Start from the security outcome you need. The underlying services stay
        inside ARDI; the workspace remains focused on your target, evidence, and
        next action.
      </p>
      <SecurityCapabilityGrid />
      <Button className={`mt-7 ${primaryButtonClass}`} onClick={onContinue}>
        Set authorised scope
      </Button>
    </section>
  );
}

import { CheckCircle2 } from "lucide-react";
import { Button } from "@workspace/ardi-ds/components/ui/button";

export function OnboardingRunning({
  panelClass,
  primaryButtonClass,
  onOpen,
}: {
  panelClass: string;
  primaryButtonClass: string;
  onOpen: () => void;
}) {
  return (
    <section
      className={`${panelClass} text-center`}
      aria-labelledby="onboarding-running-title"
    >
      <CheckCircle2
        className="mx-auto h-14 w-14 text-emerald-300"
        aria-hidden="true"
      />
      <h2
        id="onboarding-running-title"
        className="mt-5 text-2xl font-bold sm:text-3xl"
      >
        Pen Test running
      </h2>
      <p className="mt-3 text-base text-indigo-100/70">
        The security API confirmed that the scanner started.
      </p>
      <Button className={`mt-7 ${primaryButtonClass}`} onClick={onOpen}>
        Open Pen Test
      </Button>
    </section>
  );
}

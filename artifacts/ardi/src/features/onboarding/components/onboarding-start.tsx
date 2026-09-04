import { Loader2, Play } from "lucide-react";
import { Button } from "@workspace/ardi-ds/components/ui/button";

export function OnboardingStart({
  error,
  panelClass,
  pending,
  primaryButtonClass,
  onBack,
  onStart,
}: {
  error: string;
  panelClass: string;
  pending: boolean;
  primaryButtonClass: string;
  onBack: () => void;
  onStart: () => void;
}) {
  return (
    <section className={panelClass} aria-labelledby="onboarding-start-title">
      <Play className="mb-3 h-8 w-8 text-cyan-200" aria-hidden="true" />
      <h2
        id="onboarding-start-title"
        className="text-2xl font-bold sm:text-3xl"
      >
        Confirm and start the Pen Test
      </h2>
      <p className="mt-4 text-base leading-7 text-indigo-100/70">
        The target is now recorded in your approved scope. Start the assessment
        when you are ready.
      </p>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={onStart}
          disabled={pending}
          className={primaryButtonClass}
        >
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {pending ? "Starting scanner…" : "Start Pen Test"}
        </Button>
      </div>
    </section>
  );
}

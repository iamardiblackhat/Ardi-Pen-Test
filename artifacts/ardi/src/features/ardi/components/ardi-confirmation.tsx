import { Check, X } from "lucide-react";
import type { ArdiConfirmation } from "@/features/ardi/ardi-types";

export function ArdiConfirmationCard({
  confirmation,
  confirming,
  error,
  onCancel,
  onConfirm,
}: {
  confirmation: ArdiConfirmation;
  confirming: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const detail =
    confirmation.name === "start_pen_test"
      ? "ARDI has prepared a Pen Test against a target in your approved scope. The backend starts it only after this confirmation."
      : "ARDI has prepared this workspace action from your real account data. The backend completes it only after this confirmation.";

  return (
    <section
      className="rounded-xl border border-cyan-200/35 bg-cyan-200/10 p-4 text-left"
      aria-labelledby="ardi-confirm-title"
    >
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-cyan-200">
        Confirmation required
      </p>
      <h3
        id="ardi-confirm-title"
        className="mt-2 text-base font-bold text-white"
      >
        {confirmation.label}
      </h3>
      <p className="mt-2 text-sm leading-6 text-indigo-100/75">{detail}</p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={confirming}
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-violet-200/20 text-sm font-semibold text-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {confirming ? "Working…" : "Confirm"}
        </button>
      </div>
    </section>
  );
}

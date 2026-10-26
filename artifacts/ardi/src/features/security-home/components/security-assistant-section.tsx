import { ArrowRight } from "lucide-react";
import { ArdiFull } from "@/components/ardi-avatar";
export function SecurityAssistantSection({
  onOpenAssistant,
}: {
  onOpenAssistant: () => void;
}) {
  return (
    <section
      id="assistant"
      className="ardi-v2-assistant"
      aria-labelledby="assistant-title"
    >
      <div className="ardi-v2-shell ardi-liquid-assistant-layout">
        <div className="ardi-liquid-assistant-art">
          <ArdiFull size={260} />
        </div>
        <div className="ardi-v2-assistant-copy">
          <h2 id="assistant-title">
            A little guidance.
            <br />A clearer next step.
          </h2>
          <p>
            Ask ARDI which capability fits your question. In your workspace,
            review your account’s evidence and prepare a test or report. You
            confirm operational actions before they run.
          </p>
          <button
            type="button"
            className="ardi-v2-button ardi-v2-button-primary"
            onClick={onOpenAssistant}
          >
            Talk to ARDI <ArrowRight />
          </button>
        </div>
      </div>
    </section>
  );
}

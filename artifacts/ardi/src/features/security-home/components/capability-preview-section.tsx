import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { publicCapabilities } from "@/features/capabilities/capability-content";
import { routes } from "@/shared/config/routes";

export function CapabilityPreviewSection() {
  return (
    <section
      id="capability-preview"
      className="ardi-v2-operations"
      aria-labelledby="capability-preview-title"
    >
      <div className="ardi-v2-shell">
        <div className="ardi-v2-section-head">
          <div>
            <p className="ardi-v2-kicker">
              <span>02</span> TOOLS YOU CAN USE
            </p>
            <h2 id="capability-preview-title">
              Find the right tool for the job.
            </h2>
          </div>
          <p>
            Research people and companies, check website security, look up
            threats, and create reports. See what each tool does before signing
            up.
          </p>
        </div>
        <div className="ardi-v2-route-board ardi-v2-route-board-tools">
          {publicCapabilities.map((capability) => {
            const Icon = capability.icon;
            return (
              <Link
                key={capability.code}
                href={`${routes.capabilities}#${capability.id}`}
                className={`ardi-v2-route ardi-v2-route-${capability.code} ${capability.code === "01" ? "ardi-v2-route-primary" : ""}`}
              >
                <span className="ardi-v2-route-index">
                  {capability.code} / {capability.label}
                </span>
                <Icon />
                <h3>{capability.title}</h3>
                <p>{capability.summary}</p>
                <b>
                  See how it works <ArrowUpRight />
                </b>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

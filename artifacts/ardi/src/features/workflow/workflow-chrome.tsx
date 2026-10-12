import { Link, useLocation } from "wouter";
import { cn } from "@workspace/ardi-ds/lib/utils";
import {
  sectionForPath,
  stageForPath,
  workflowStages,
} from "@/shared/config/workflow";

export function WorkflowChrome() {
  const [location] = useLocation();
  const path = location.split("?")[0] ?? location;
  const current = stageForPath(path);
  if (!current) return null;

  const section = sectionForPath(path);
  const upcoming = workflowStages.find((stage) => stage.step === current.step + 1);

  return (
    <div className="border-b border-border bg-card/40 px-4 py-4 sm:px-8">
      <ol className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Security workflow">
        {workflowStages.map((stage) => {
          const active = stage.id === current.id;
          return (
            <li key={stage.id}>
              <Link
                href={stage.href}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 text-sm transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs",
                    active ? "bg-primary-foreground/15" : "bg-muted",
                  )}
                >
                  {stage.step}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{stage.label}</span>
                  <span
                    className={cn(
                      "block truncate text-xs",
                      active ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {stage.question}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {current.sections.length > 1 ? (
        <nav className="mt-4 flex flex-wrap gap-2" aria-label={`${current.label} sections`}>
          {current.sections.map((item) => {
            const active = item.id === section?.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm",
                  active
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
      {section ? (
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{section.description}</p>
      ) : null}
      {upcoming ? (
        <p className="mt-2 text-sm">
          <Link href={upcoming.href} className="font-medium text-primary hover:underline">
            Next: {upcoming.step}. {upcoming.label}
          </Link>
          <span className="text-muted-foreground"> — {upcoming.question}</span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          This is the last step. Download a report when the results look right.
        </p>
      )}
    </div>
  );
}

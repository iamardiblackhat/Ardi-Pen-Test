export type SecurityGradeLetter = "A+" | "A" | "B" | "C" | "D" | "F" | "—";

export interface SecurityGrade {
  letter: string;
  score: number | null;
  label: string;
  summary: string;
  colorClass: string;
  badgeClass: string;
}

export function computeSecurityGrade(input: {
  hasCompletedScan: boolean;
  findings: ReadonlyArray<{ severity: string; status: string }>;
}): SecurityGrade {
  if (!input.hasCompletedScan) {
    return {
      letter: "?",
      score: null,
      label: "Not checked yet",
      summary: "Run your first security check to get a grade.",
      colorClass: "text-muted-foreground",
      badgeClass: "border-border bg-muted/50 text-muted-foreground",
    };
  }

  const open = input.findings.filter(
    (f) => f.status === "open" || f.status === "in_progress",
  );
  const critical = open.filter((f) => f.severity === "critical").length;
  const high = open.filter((f) => f.severity === "high").length;
  const medium = open.filter((f) => f.severity === "medium").length;
  const low = open.filter((f) => f.severity === "low").length;

  const rawScore = Math.max(
    0,
    100 - critical * 35 - high * 20 - medium * 10 - low * 4,
  );
  const actionable = critical + high + medium + low;

  if (rawScore >= 95 && critical === 0 && high === 0) {
    return {
      letter: "A+",
      score: rawScore,
      label: "Looking strong",
      summary:
        actionable === 0
          ? "No open security problems found in your latest check."
          : `Only ${actionable} minor ${actionable === 1 ? "item" : "items"} left to tidy up.`,
      colorClass: "text-emerald-400",
      badgeClass: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    };
  }
  if (rawScore >= 88 && critical === 0 && high === 0) {
    return {
      letter: "A",
      score: rawScore,
      label: "Solid security",
      summary: `${actionable} small ${actionable === 1 ? "fix" : "fixes"} left to reach an A+.`,
      colorClass: "text-emerald-400",
      badgeClass: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    };
  }
  if (rawScore >= 75 && critical === 0) {
    return {
      letter: "B",
      score: rawScore,
      label: "Good baseline",
      summary: `Fix ${actionable} open ${actionable === 1 ? "issue" : "issues"} to reach an A.`,
      colorClass: "text-cyan-300",
      badgeClass: "border-cyan-500/40 bg-cyan-500/15 text-cyan-200",
    };
  }
  if (rawScore >= 60) {
    return {
      letter: "C",
      score: rawScore,
      label: "Needs attention",
      summary: `${actionable} open ${actionable === 1 ? "problem" : "problems"} should be fixed soon.`,
      colorClass: "text-yellow-400",
      badgeClass: "border-yellow-500/40 bg-yellow-500/15 text-yellow-300",
    };
  }
  if (rawScore >= 40) {
    return {
      letter: "D",
      score: rawScore,
      label: "At risk",
      summary: "Focus on the high-priority problems first to protect this site.",
      colorClass: "text-orange-400",
      badgeClass: "border-orange-500/40 bg-orange-500/15 text-orange-300",
    };
  }
  return {
    letter: "F",
    score: rawScore,
    label: "Urgent fixes needed",
    summary: "Serious security problems were found. Review and fix the top items right away.",
    colorClass: "text-destructive",
    badgeClass: "border-destructive/40 bg-destructive/15 text-destructive",
  };
}

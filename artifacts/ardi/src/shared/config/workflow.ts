import {
  Compass,
  FileText,
  FlaskConical,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type WorkflowStageId = "research" | "test" | "fix" | "report";

export type WorkflowSection = {
  id: string;
  label: string;
  href: string;
  description: string;
  match: (path: string) => boolean;
};

export type WorkflowStage = {
  id: WorkflowStageId;
  step: number;
  label: string;
  question: string;
  href: string;
  icon: LucideIcon;
  summary: string;
  sections: WorkflowSection[];
};

function isPath(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export const workflowStages: WorkflowStage[] = [
  {
    id: "research",
    step: 1,
    label: "Research",
    question: "What is publicly known?",
    href: "/research",
    icon: Compass,
    summary: "Look up a website, a person or company, or known attackers.",
    sections: [
      {
        id: "website",
        label: "Website",
        href: "/research",
        description:
          "Registration, server addresses, email settings, and certificates from public sources.",
        match: (path) =>
          path === "/research" ||
          isPath(path, "/research/website") ||
          isPath(path, "/osint"),
      },
      {
        id: "subject",
        label: "Name or company",
        href: "/research/subject",
        description:
          "Ask the connected research service about a person, company, or event. If it is not set up, this step says so.",
        match: (path) => isPath(path, "/research/subject"),
      },
      {
        id: "threats",
        label: "Known attackers",
        href: "/research/threats",
        description:
          "Records from a connected threat feed. If the feed is not set up, no attackers are invented.",
        match: (path) =>
          isPath(path, "/research/threats") || isPath(path, "/intelligence"),
      },
    ],
  },
  {
    id: "test",
    step: 2,
    label: "Test",
    question: "What can you check?",
    href: "/test",
    icon: FlaskConical,
    summary: "Add systems you are allowed to test, then run a check.",
    sections: [
      {
        id: "targets",
        label: "Targets",
        href: "/test",
        description: "Systems you own or have permission to test.",
        match: (path) =>
          path === "/test" ||
          isPath(path, "/test/targets") ||
          isPath(path, "/assets"),
      },
      {
        id: "runs",
        label: "Runs",
        href: "/test/runs",
        description: "Security checks against those targets, and how far each one got.",
        match: (path) => isPath(path, "/test/runs") || isPath(path, "/scans"),
      },
    ],
  },
  {
    id: "fix",
    step: 3,
    label: "Fix",
    question: "What should you fix?",
    href: "/fix",
    icon: Wrench,
    summary: "Review the problems a check found, then see what they mean.",
    sections: [
      {
        id: "problems",
        label: "Problems",
        href: "/fix",
        description: "Weaknesses found on targets you authorised.",
        match: (path) =>
          path === "/fix" ||
          isPath(path, "/fix/problems") ||
          isPath(path, "/findings"),
      },
      {
        id: "meaning",
        label: "What it means",
        href: "/fix/meaning",
        description:
          "Known attack methods linked to your real results. This explains a problem. It is not a separate job.",
        match: (path) => isPath(path, "/fix/meaning") || isPath(path, "/mitre"),
      },
    ],
  },
  {
    id: "report",
    step: 4,
    label: "Report",
    question: "What can you share?",
    href: "/report",
    icon: FileText,
    summary: "Turn the results into a file your team can read.",
    sections: [
      {
        id: "reports",
        label: "Reports",
        href: "/report",
        description: "Create and download a report from the targets, checks, and problems already stored.",
        match: (path) => path === "/report" || isPath(path, "/reports"),
      },
    ],
  },
];

export function stageForPath(path: string): WorkflowStage | null {
  return (
    workflowStages.find((stage) =>
      stage.sections.some((section) => section.match(path)),
    ) ?? null
  );
}

export function sectionForPath(path: string) {
  const stage = stageForPath(path);
  return stage?.sections.find((section) => section.match(path)) ?? null;
}

export type NextWorkflowAction = {
  href: string;
  title: string;
  detail: string;
};

export function nextWorkflowAction(input: {
  assets: number;
  scans: number;
  openFindings: number;
  reports: number;
}): NextWorkflowAction {
  if (input.assets === 0) {
    return {
      href: "/test",
      title: "Add a target",
      detail:
        "Name a website, server, or network you are allowed to test. Nothing else can run until that exists.",
    };
  }
  if (input.scans === 0) {
    return {
      href: "/test/runs",
      title: "Run a test",
      detail:
        "You already have a target. Start a check against it, then come back when it finishes.",
    };
  }
  if (input.openFindings > 0) {
    return {
      href: "/fix",
      title: "Review the problems",
      detail: `${input.openFindings} open ${input.openFindings === 1 ? "problem is" : "problems are"} waiting. Read them, then see what each one means.`,
    };
  }
  if (input.reports === 0) {
    return {
      href: "/report",
      title: "Write a report",
      detail:
        "The checks are in. Create a file from those results so someone else can read them.",
    };
  }
  return {
    href: "/research",
    title: "Look something up",
    detail:
      "The test cycle is in place. Research a website, a name, or known attackers before the next check.",
  };
}

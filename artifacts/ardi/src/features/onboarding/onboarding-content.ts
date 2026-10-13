import {
  Compass,
  FileText,
  FlaskConical,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const onboardingSteps = [
  "Welcome",
  "Scope",
  "Authorise",
  "Running",
] as const;

export type SecurityCapability = {
  name: string;
  detail: string;
  icon: LucideIcon;
};

export const securityCapabilities: SecurityCapability[] = [
  {
    name: "1. Research",
    detail:
      "Look up a website, a person or company, or known attackers from public sources.",
    icon: Compass,
  },
  {
    name: "2. Test",
    detail:
      "Add a system you are allowed to test, then run a check and follow it.",
    icon: FlaskConical,
  },
  {
    name: "3. Fix",
    detail:
      "Read the problems the check found and see what each one means.",
    icon: Wrench,
  },
  {
    name: "4. Report",
    detail:
      "Turn those results into a file your team can download.",
    icon: FileText,
  },
];

import { routes } from "@/shared/config/routes";

export const primaryNavigation = [
  { id: "operations", label: "Operations", href: "/#operations" },
  { id: "capabilities", label: "Capabilities", href: routes.capabilities },
  { id: "intelligence", label: "Threat dashboard", href: routes.intelligence },
  { id: "assistant", label: "ARDI", href: "/#assistant" },
] as const;

export const heroScenes = [
  {
    id: "investigate",
    label: "Investigate",
    detail: "Research public information",
    src: "/ardi/media/ardi-security-hero.mp4",
    poster: "/ardi/media/ardi-security-hero-poster.png",
  },
  {
    id: "assessment",
    label: "Test",
    detail: "Check your website’s security",
    src: "/ardi/media/ardi-assessment.mp4",
    poster: "/ardi/media/ardi-security-hero-poster.png",
  },
  {
    id: "evidence",
    label: "Report",
    detail: "Review and share your results",
    src: "/ardi/media/ardi-evidence.mp4",
    poster: "/ardi/media/ardi-security-hero-poster.png",
  },
] as const;

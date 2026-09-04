import { routes } from '@/shared/config/routes';

export const primaryNavigation = [
  { id: 'operations', label: 'Operations', href: '/#operations' },
  { id: 'capabilities', label: 'Capabilities', href: routes.capabilities },
  { id: 'assistant', label: 'ARDI', href: '/#assistant' },
] as const;

export const heroScenes = [
  {
    id: 'investigate',
    label: 'Investigate',
    detail: 'Work current public evidence',
    src: '/ardi/media/ardi-security-hero.mp4',
    poster: '/ardi/media/ardi-security-hero-poster.png',
  },
  {
    id: 'assessment',
    label: 'Test',
    detail: 'Assess an authorised target',
    src: '/ardi/media/ardi-assessment.mp4',
    poster: '/ardi/media/ardi-security-hero-poster.png',
  },
  {
    id: 'evidence',
    label: 'Prove',
    detail: 'Review and report the evidence',
    src: '/ardi/media/ardi-evidence.mp4',
    poster: '/ardi/media/ardi-security-hero-poster.png',
  },
] as const;

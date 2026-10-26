# Design refinement — 25 October 2026

The original cinematic hero, its three video scenes, the violet/cyan palette and original design tokens have been preserved. The broad green restyle from the first local pass was withdrawn. No production deployment or Git push has been performed.

## Reference inspected

- https://www.framer.com/marketplace/components/3d-stack-carousel/
- https://3dstackcarousel.framer.website/ — opened in browser and screenshot inspected. Reference uses perspective-separated cards with actual adjacent content, rather than empty decorative backing layers.
- Cards, backgrounds, effects and template category listings reviewed for selection. Listings are discovery references, not proof of testing individual products.

The capability carousel is an independent React/Framer Motion implementation. No paid component code or marketplace photographs were copied. It uses seven actual capability cards, spring perspective transitions, drag/swipe navigation, arrow controls, direct selectors and keyboard navigation. Abstract diagrams are illustrations, not fabricated security findings. Inactive cards are inert and hidden from assistive technology. Reduced motion removes spring movement.

Glass enhancements are limited to translucent navigation, scene controls, operation surfaces, the deck and chat. The approved transparent ARDI Sec character is retained for the assistant section and shared dock.

## Verification

- Full workspace typecheck passed.
- Full production build passed after final CSS changes.
- Browser: all seven cards fit at 320, 390, 768 and 1440 pixels; no horizontal overflow.
- Browser: next wraps from seventh to first; keyboard ArrowLeft wraps to seventh.
- Browser: drag/swipe changes selected card.
- Browser: reduced-motion navigation works.
- Screenshot of desktop inspected. Initial 320px content clipping was found and corrected, then all 28 card/width combinations passed.
- A subsequent screenshot request timed out; this did not invalidate the separately repeated successful interaction checks.

These are frontend checks against the local preview. They do not establish hosted workers, backend integrations or production deployment readiness.

## Global liquid edge follow-up

Applied green/cyan reflective rims matching the approved ARDI Sec mascot to shared cards, public capability/security surfaces, authentication panels, forms, tabs and overlay primitives. The existing violet/graphite interiors remain. Shared portal components have their own material class because portalled dialogs, selects and menus render outside the app root. Decorative edge masks ignore pointer events.

Workspace sidebar, mobile header/bottom navigation, dashboard actions, raw card surfaces, research inputs and intelligence records use the same material. Legal/FAQ pages receive restrained edge highlights. Severity colours and destructive action semantics remain intact. Reduced-transparency fallback uses opaque surfaces.

Browser verification: 40 public route/viewport combinations at 320, 390, 768 and 1440 pixels passed without horizontal overflow. A tablet header collision discovered on the security page was fixed by switching to compact navigation below 1100 pixels. Fourteen workspace route/viewport combinations were checked with synthetic API fixtures at 390 and 1440 pixels; none overflowed. Screenshots of workspace desktop/mobile and public capabilities were captured; desktop workspace and capabilities screenshots were inspected. Fixture checks do not establish real authentication or backend functionality.

## Visible glass correction

The first global edge pass was too subtle and read as thin coloured outlines. Increased the clear bevel to 3px, added curved white/green/cyan highlights, layered inner reflections and translucent corner lighting. Applied the stronger material through the same shared surfaces, controls and portal hooks. Preserved the cinematic hero.

Inspected desktop and mobile screenshots of the updated deck. Browser checks: 16 public route/viewport combinations without overflow, and all seven cards fit at each of four widths. Production build passed. This is a CSS simulation of the material, not physical optical refraction.

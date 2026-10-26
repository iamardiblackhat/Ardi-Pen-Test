# Botazez / ARDI connection — 26 October 2026

Uses the existing local Botazez checkout at `/Users/aaronaccount/Desktop/Projects/gods-eye-view`. Its origin is `iamardiblackhat/botazez`; the separately checked-out Osiris project is not modified.

## Changes

- Botazez's existing ARDI poster (`src/components/ArdiPanel.tsx`) had an Explore ARDI link pointing back to botazez.com. It now points to the verified existing ARDI deployment at `https://ardi-pen-test-api-server-one.vercel.app/`. The public build variable `NEXT_PUBLIC_ARDI_URL` allows replacement with the future ARDI domain.
- ARDI public and workspace intelligence views now offer a Botazez handoff. The threat-intelligence capability and public footer also link to Botazez.
- Separate tabs preserve each application's current workspace. No credentials, JWTs, user records or investigation targets are passed between sites.

This is a navigation connection. It does not embed Botazez, share accounts, execute its tools from ARDI or synchronise feeds. The existing Botazez ARDI section was reused rather than replaced with a second integration UI inside Botazez. No changes to Botazez intelligence calculations were made.

## Verification

- Botazez public cyber-threat endpoint and the existing ARDI deployment responded HTTP 200 during verification.
- ARDI full typecheck and production build passed before the final capability-link addition; final checks are recorded in the task output.
- ARDI intelligence handoff and footer destinations verified in browser at 320, 390, 768 and 1440 pixels, with no overflow on the new panel.
- Actual Botazez ARDI component independently bundled for browser interaction verification, without starting its full map application or accessing credentials.
- Botazez's whole-project typecheck currently fails in unrelated files: invalid extra exports from Next route modules, Groq/Google client type mismatch in AI routes, missing NewsItem field and missing Bluetooth browser types. The modified ArdiPanel has no reported type error. This is not a whole-project build certification.

All changes are local and uncommitted. No production deployments were performed.

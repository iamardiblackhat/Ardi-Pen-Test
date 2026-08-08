/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#eef4fa",
      "foreground": "#0b1724",
      "border": "#c2d4e4",
      "card": "#ffffff",
      "cardForeground": "#0b1724",
      "popover": "#ffffff",
      "popoverForeground": "#0b1724",
      "primary": "#0284c7",
      "primaryForeground": "#ffffff",
      "secondary": "#dbeaf5",
      "secondaryForeground": "#0b1724",
      "muted": "#e5eef7",
      "mutedForeground": "#5a7896",
      "accent": "#dbeaf5",
      "accentForeground": "#0b1724",
      "destructive": "#dc2626",
      "destructiveForeground": "#ffffff",
      "input": "#c2d4e4",
      "ring": "#0284c7",
      "chart1": "#0ea5e9",
      "chart2": "#10b981",
      "chart3": "#8b5cf6",
      "chart4": "#f59e0b",
      "chart5": "#ef4444",
      "sidebar": "#f0f6fc",
      "sidebarForeground": "#1a3450",
      "sidebarBorder": "#c2d4e4",
      "sidebarPrimary": "#0284c7",
      "sidebarPrimaryForeground": "#ffffff",
      "sidebarAccent": "#dbeaf5",
      "sidebarAccentForeground": "#1a3450",
      "sidebarRing": "#0284c7"
    },
    "dark": {
      "background": "#07101b",
      "foreground": "#dce8f4",
      "border": "#142030",
      "card": "#0d1b2a",
      "cardForeground": "#dce8f4",
      "popover": "#0d1b2a",
      "popoverForeground": "#dce8f4",
      "primary": "#0ea5e9",
      "primaryForeground": "#ffffff",
      "secondary": "#112236",
      "secondaryForeground": "#b8cfe6",
      "muted": "#0f1c2d",
      "mutedForeground": "#6482a0",
      "accent": "#0c2d48",
      "accentForeground": "#7dd3fc",
      "destructive": "#dc2626",
      "destructiveForeground": "#fef2f2",
      "input": "#142030",
      "ring": "#0ea5e9",
      "chart1": "#0ea5e9",
      "chart2": "#10b981",
      "chart3": "#a78bfa",
      "chart4": "#f59e0b",
      "chart5": "#ef4444",
      "sidebar": "#060d16",
      "sidebarForeground": "#b8cfe6",
      "sidebarBorder": "#101e2e",
      "sidebarPrimary": "#0ea5e9",
      "sidebarPrimaryForeground": "#ffffff",
      "sidebarAccent": "#0c2035",
      "sidebarAccentForeground": "#7dd3fc",
      "sidebarRing": "#0ea5e9"
    }
  },
  "fontFamily": {
    "sans": [
      "Inter",
      "ui-sans-serif",
      "sans-serif"
    ],
    "serif": [
      "Lora",
      "Georgia",
      "serif"
    ],
    "mono": [
      "JetBrains Mono",
      "ui-monospace",
      "monospace"
    ]
  },
  "radius": "0.375rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;

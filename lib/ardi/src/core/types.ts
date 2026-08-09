import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";

/**
 * ARDI core — vertical-agnostic.
 *
 * ARDI is a family of assistants (cyber, beauty, property, …). The character,
 * the emotional states, the streaming transport and the agent loop are shared;
 * only the system prompt, the tool set and the colourway differ per vertical.
 * That is what a `VerticalConfig` carries.
 */

/**
 * The emotional states ARDI can be in, matching the character artwork.
 * Bound to real activity — never idle-looped, never decorative.
 */
export type ArdiMood =
  /** Open, waving. Ready for input. */
  | "idle"
  /** Hooded, arms crossed. Thinking, or a tool is running. */
  | "working"
  /** Arms up. A scan came back clean, a finding got resolved. */
  | "celebrating"
  /** Something failed and the user needs to know. */
  | "concerned";

export interface VerticalConfig {
  /** e.g. "cyber". Used for logging and to pick the colourway client-side. */
  readonly id: string;
  /** e.g. "ARDI Cyber". Shown to the user. */
  readonly displayName: string;
  /** The system prompt for this vertical. */
  readonly systemPrompt: string;
  /**
   * Tools ARDI may call. Read tools execute directly; anything that mutates
   * must be declared in `confirmBeforeRunning` so the UI can gate it.
   */
  readonly tools: readonly BetaRunnableTool<any>[];
  /**
   * Names of tools that change state. The API refuses to auto-execute these:
   * ARDI proposes, the user confirms, the API applies. He never mutates
   * unilaterally — a prompt injection buried in a scanned host's banner must
   * not be able to delete a client's findings.
   */
  readonly confirmBeforeRunning: readonly string[];
  /** Conversation starters shown on an empty panel. */
  readonly suggestions: readonly string[];
}

/** Events streamed to the browser over SSE. */
export type ArdiEvent =
  | { type: "mood"; mood: ArdiMood }
  | { type: "text"; text: string }
  | { type: "tool_start"; name: string; label: string }
  | { type: "tool_end"; name: string; ok: boolean }
  | { type: "confirm_required"; name: string; input: unknown; label: string }
  | { type: "done"; stopReason: string | null }
  | { type: "error"; message: string };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Thrown when ARDI is asked to work without being configured. */
export class ArdiNotConfiguredError extends Error {
  constructor(provider: "anthropic" | "openai-compat" = "anthropic") {
    const missing =
      provider === "openai-compat"
        ? "ARDI_BASE_URL is not set (ARDI_PROVIDER=openai-compat expects a local/self-hosted server)"
        : "ANTHROPIC_API_KEY is not set";
    super(
      `ARDI is not configured: ${missing}. Add it to your .env file and ` +
        "restart the API server. ARDI will not answer with invented content " +
        "when unconfigured.",
    );
    this.name = "ArdiNotConfiguredError";
  }
}

import Anthropic from "@anthropic-ai/sdk";
import {
  ArdiNotConfiguredError,
  type ArdiEvent,
  type ChatMessage,
  type VerticalConfig,
} from "./types";
import { runOpenAiCompat } from "./providers/openai-compat";

/**
 * The ARDI agent loop.
 *
 * Uses the SDK's beta tool runner rather than a hand-written loop: it drives
 * request → execute tool → feed result → repeat, and supports streaming. We
 * keep the per-iteration hook so write-tools can be gated before they run.
 */

const MODEL = process.env["ANTHROPIC_MODEL"] ?? "claude-opus-5";
/** Streaming, so a long answer never hits an HTTP timeout mid-sentence. */
const MAX_TOKENS = 64_000;

/**
 * ARDI is provider-agnostic.
 *
 *   ARDI_PROVIDER=openai-compat   any OpenAI-compatible server
 *     ARDI_BASE_URL   e.g. http://localhost:1234/v1  (LM Studio)
 *                          http://localhost:11434/v1 (Ollama)
 *     ARDI_MODEL      the model id that server exposes
 *     ARDI_API_KEY    optional; local servers usually need none
 *
 *   ARDI_PROVIDER=anthropic (default)
 *     ANTHROPIC_API_KEY
 *
 * Running locally means no key, no per-token cost, and no client security data
 * leaving the machine — which for this product is a selling point, not just a
 * saving. The trade-off is capability: a 9B model will call tools less
 * reliably than a frontier one, so `maxIterations` guards against loops.
 */
export type ArdiProvider = "anthropic" | "openai-compat";

export function getProvider(): ArdiProvider {
  const explicit = process.env["ARDI_PROVIDER"];
  if (explicit === "openai-compat" || explicit === "anthropic") return explicit;
  // Infer: a base URL means a local/self-hosted server is intended.
  return process.env["ARDI_BASE_URL"] ? "openai-compat" : "anthropic";
}

export function isConfigured(): boolean {
  return getProvider() === "openai-compat"
    ? Boolean(process.env["ARDI_BASE_URL"])
    : Boolean(process.env["ANTHROPIC_API_KEY"]);
}

export function describeProvider(): { provider: ArdiProvider; model: string; endpoint: string | null } {
  if (getProvider() === "openai-compat") {
    return {
      provider: "openai-compat",
      model: process.env["ARDI_MODEL"] ?? "(unset)",
      endpoint: process.env["ARDI_BASE_URL"] ?? null,
    };
  }
  return { provider: "anthropic", model: MODEL, endpoint: null };
}

export interface RunOptions {
  vertical: VerticalConfig;
  messages: ChatMessage[];
  /** Injected into the conversation, not the system prompt — see below. */
  context?: string;
  signal?: AbortSignal;
}

/**
 * Runs one turn and yields events as they happen.
 *
 * Caller renders these; nothing here writes to the database directly.
 */
export async function* runArdi(options: RunOptions): AsyncGenerator<ArdiEvent> {
  if (!isConfigured()) {
    throw new ArdiNotConfiguredError(getProvider());
  }

  const { vertical, messages, context, signal } = options;

  if (getProvider() === "openai-compat") {
    yield* runOpenAiCompat({
      baseUrl: process.env["ARDI_BASE_URL"]!,
      model: process.env["ARDI_MODEL"] ?? "local-model",
      apiKey: process.env["ARDI_API_KEY"],
      vertical,
      messages,
      context,
      signal,
    });
    return;
  }

  const client = new Anthropic();

  // Per-request context (which org, what the user is looking at) goes in the
  // MESSAGES, never interpolated into the system prompt. The system prompt is
  // the cached prefix — changing it per request means the cache never hits and
  // every message pays full price. See shared/prompt-caching.md.
  const conversation: Anthropic.Beta.BetaMessageParam[] = [];
  if (context) {
    conversation.push({
      role: "user",
      content: `<context>\n${context}\n</context>`,
    });
    conversation.push({ role: "assistant", content: "Understood." });
  }
  for (const m of messages) {
    conversation.push({ role: m.role, content: m.content });
  }

  yield { type: "mood", mood: "working" };

  try {
    const runner = client.beta.messages.toolRunner({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // Adaptive thinking: ARDI decides how hard to think per question.
      // "Is port 22 open?" should not cost the same as "are we SOC 2 ready?".
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      system: [
        {
          type: "text",
          text: vertical.systemPrompt,
          // Stable prefix — cache it. Volatile content is in the messages.
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: vertical.tools as never,
      messages: conversation,
      stream: true,
    });

    let sawText = false;

    for await (const stream of runner) {
      for await (const event of stream) {
        if (signal?.aborted) {
          // The runner has no abort handle; returning ends our iteration and
          // the in-flight request is dropped when the caller closes the SSE
          // connection.
          yield { type: "error", message: "Cancelled." };
          return;
        }

        if (event.type === "content_block_start") {
          const block = event.content_block;
          if (block.type === "tool_use") {
            yield {
              type: "tool_start",
              name: block.name,
              label: humanLabel(block.name),
            };
          }
        }

        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          if (!sawText) {
            sawText = true;
            yield { type: "mood", mood: "idle" };
          }
          yield { type: "text", text: event.delta.text };
        }
      }

      const message = await stream.finalMessage();

      for (const block of message.content) {
        if (block.type === "tool_use") {
          yield { type: "tool_end", name: block.name, ok: true };
        }
      }

      // A refusal is a normal 200 response, not an exception. Check it before
      // treating content as an answer.
      if (message.stop_reason === "refusal") {
        yield {
          type: "error",
          message:
            "ARDI declined to answer that. If this was a legitimate security " +
            "question, rephrase it around your own authorised assets.",
        };
        return;
      }
    }

    yield { type: "mood", mood: "idle" };
    yield { type: "done", stopReason: "end_turn" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield { type: "mood", mood: "concerned" };
    yield { type: "error", message };
  }
}

/** Turns `list_findings` into "Checking your findings" for the UI. */
function humanLabel(toolName: string): string {
  const labels: Record<string, string> = {
    list_findings: "Checking your findings",
    get_finding: "Reading that finding",
    list_assets: "Looking at your systems",
    get_scan_status: "Checking the scan",
    list_scans: "Reviewing recent scans",
    get_security_summary: "Working out your overall posture",
  };
  return labels[toolName] ?? `Running ${toolName.replace(/_/g, " ")}`;
}

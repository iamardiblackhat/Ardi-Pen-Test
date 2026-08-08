import { Router } from "express";
import { runArdi, isConfigured, describeProvider, cyberVertical, ArdiNotConfiguredError } from "@workspace/ardi-agent";
import type { ChatMessage } from "@workspace/ardi-agent";
import { logger } from "../lib/logger";

const router = Router();

/** Cap conversation length: history is resent every turn and costs tokens. */
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 8_000;

// GET /api/ardi/status — lets the UI show ARDI as unavailable rather than
// letting the user type into a box that will fail.
router.get("/ardi/status", (_req, res): void => {
  const provider = describeProvider();
  res.json({
    configured: isConfigured(),
    provider: provider.provider,
    model: provider.model,
    endpoint: provider.endpoint,
    displayName: cyberVertical.displayName,
    vertical: cyberVertical.id,
    suggestions: cyberVertical.suggestions,
  });
});

// POST /api/ardi/chat — Server-Sent Events.
router.post("/ardi/chat", async (req, res): Promise<void> => {
  const body = req.body as { messages?: unknown; context?: unknown };

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    res.status(400).json({ error: "messages must be a non-empty array." });
    return;
  }
  if (body.messages.length > MAX_MESSAGES) {
    res.status(400).json({ error: `Conversation too long (max ${MAX_MESSAGES} messages).` });
    return;
  }

  const messages: ChatMessage[] = [];
  for (const raw of body.messages) {
    const m = raw as { role?: unknown; content?: unknown };
    if ((m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      res.status(400).json({ error: "Each message needs role 'user'|'assistant' and string content." });
      return;
    }
    messages.push({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) });
  }

  if (!isConfigured()) {
    // Explicit, honest failure. ARDI never invents an answer when he has no
    // model behind him.
    res.status(503).json({
      error: "ARDI is not configured.",
      detail: "Set ARDI_BASE_URL + ARDI_MODEL for a local model (LM Studio / Ollama), or ANTHROPIC_API_KEY. Then restart the API server.",
    });
    return;
  }

  // SSE headers. `X-Accel-Buffering` stops nginx-style proxies buffering the
  // stream into one lump, which would defeat token-by-token rendering.
  res.status(200);
  res.setHeader("content-type", "text/event-stream; charset=utf-8");
  res.setHeader("cache-control", "no-cache, no-transform");
  res.setHeader("connection", "keep-alive");
  res.setHeader("x-accel-buffering", "no");
  res.flushHeaders();

  const controller = new AbortController();
  // Listen on the RESPONSE, not the request. `req`'s "close" fires as soon as
  // the request body has been fully read — which for a POST is immediately —
  // so aborting on it kills the stream before the model produces a token.
  res.on("close", () => controller.abort());

  const send = (event: unknown): void => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    for await (const event of runArdi({
      vertical: cyberVertical,
      messages,
      context: typeof body.context === "string" ? body.context.slice(0, 2_000) : undefined,
      signal: controller.signal,
    })) {
      send(event);
    }
  } catch (error) {
    if (error instanceof ArdiNotConfiguredError) {
      send({ type: "error", message: error.message });
    } else {
      logger.error({ err: error }, "ARDI chat failed");
      send({
        type: "error",
        message: error instanceof Error ? error.message : "ARDI hit an unexpected error.",
      });
    }
  } finally {
    res.end();
  }
});

export default router;

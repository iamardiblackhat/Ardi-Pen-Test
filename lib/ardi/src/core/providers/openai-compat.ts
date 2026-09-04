import type { ArdiEvent, ChatMessage, VerticalConfig } from "../types";

/**
 * OpenAI-compatible provider — LM Studio, Ollama, vLLM, llama.cpp, LiteLLM,
 * OpenRouter, or anything else exposing `/v1/chat/completions`.
 *
 * Written against raw fetch rather than the `openai` package: no new
 * dependency, no supply-chain wait, and the surface we need (streaming +
 * tool calls) is small and stable.
 *
 * This is what makes ARDI provider-agnostic. Point `ARDI_BASE_URL` at a local
 * model and he runs entirely on your own machine: no API key, no per-token
 * cost, and no client data leaving the box — which for a security product is
 * a feature you can sell, not just a saving.
 */

interface ToolSpec {
  type: "function";
  function: { name: string; description: string; parameters: unknown };
}

interface OaiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
}

/** Tools carry their JSON schema differently depending on how they were built. */
function toOpenAiTools(vertical: VerticalConfig): ToolSpec[] {
  return vertical.tools.map((t) => {
    const anyTool = t as unknown as {
      name: string;
      description?: string;
      input_schema?: unknown;
      inputSchema?: unknown;
      parameters?: unknown;
    };
    return {
      type: "function" as const,
      function: {
        name: anyTool.name,
        description: anyTool.description ?? "",
        parameters: anyTool.input_schema ??
          anyTool.parameters ?? { type: "object", properties: {} },
      },
    };
  });
}

async function runTool(
  vertical: VerticalConfig,
  name: string,
  rawArgs: string,
): Promise<string> {
  const tool = vertical.tools.find(
    (t) => (t as unknown as { name: string }).name === name,
  ) as unknown as { run?: (input: unknown) => Promise<unknown> } | undefined;

  if (!tool?.run) return JSON.stringify({ error: `Unknown tool: ${name}` });

  let args: unknown = {};
  try {
    // Small local models frequently emit slightly malformed argument JSON.
    // Failing the whole turn over it is worse than telling the model to retry.
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return JSON.stringify({
      error: "Arguments were not valid JSON. Retry with valid JSON.",
    });
  }

  try {
    const result = await tool.run(args);
    return typeof result === "string" ? result : JSON.stringify(result);
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export interface OpenAiCompatOptions {
  baseUrl: string;
  model: string;
  apiKey?: string;
  vertical: VerticalConfig;
  messages: ChatMessage[];
  context?: string;
  signal?: AbortSignal;
  /** Ceiling on tool round-trips, so a confused model cannot loop forever. */
  maxIterations?: number;
}

export async function* runOpenAiCompat(
  options: OpenAiCompatOptions,
): AsyncGenerator<ArdiEvent> {
  const { baseUrl, model, apiKey, vertical, messages, context, signal } =
    options;
  const maxIterations = options.maxIterations ?? 6;

  const convo: OaiMessage[] = [
    { role: "system", content: vertical.systemPrompt },
  ];
  if (context) convo.push({ role: "system", content: `Context: ${context}` });
  for (const m of messages) convo.push({ role: m.role, content: m.content });

  const tools = toOpenAiTools(vertical);
  yield { type: "mood", mood: "working" };

  try {
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const response = await fetch(
        `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            model,
            messages: convo,
            tools,
            stream: true,
            temperature: 0.4,
            // Reasoning models (qwen3, deepseek-r1, …) spend tokens thinking
            // before they answer. Too low a ceiling and the response ends
            // mid-thought with finish_reason "length" and no visible content.
            max_tokens: 4096,
          }),
          signal,
        },
      );

      if (!response.ok || !response.body) {
        const detail = await response.text().catch(() => "");
        yield {
          type: "error",
          message: `Model server returned ${response.status}. ${detail.slice(0, 300)}`,
        };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      let thinking = false;
      const toolCalls: { id: string; name: string; args: string }[] = [];
      let sawText = false;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;

          let chunk: any;
          try {
            chunk = JSON.parse(payload);
          } catch {
            continue;
          }

          const delta = chunk.choices?.[0]?.delta;
          if (!delta) continue;

          // Reasoning models stream their chain of thought in a separate
          // field and only later emit `content`. Surface it as a "thinking"
          // signal, never as the answer — otherwise the user reads the
          // model's scratchpad as if it were advice.
          if (
            typeof delta.reasoning_content === "string" &&
            delta.reasoning_content
          ) {
            if (!thinking) {
              thinking = true;
              yield { type: "tool_start", name: "thinking", label: "Thinking" };
            }
          }

          if (typeof delta.content === "string" && delta.content) {
            if (thinking) {
              thinking = false;
              yield { type: "tool_end", name: "thinking", ok: true };
            }
            if (!sawText) {
              sawText = true;
              yield { type: "mood", mood: "idle" };
            }
            text += delta.content;
            yield { type: "text", text: delta.content };
          }

          // Tool-call deltas arrive fragmented and indexed; accumulate by index.
          for (const tc of delta.tool_calls ?? []) {
            const index: number = tc.index ?? 0;
            toolCalls[index] ??= {
              id: tc.id ?? `call_${index}`,
              name: "",
              args: "",
            };
            if (tc.id) toolCalls[index]!.id = tc.id;
            if (tc.function?.name) toolCalls[index]!.name += tc.function.name;
            if (tc.function?.arguments)
              toolCalls[index]!.args += tc.function.arguments;
          }
        }
      }

      if (thinking) yield { type: "tool_end", name: "thinking", ok: true };

      const calls = toolCalls.filter((c) => c?.name);

      if (calls.length === 0) {
        if (!text.trim()) {
          yield {
            type: "error",
            message:
              "The model finished without producing an answer. Reasoning models " +
              "need headroom — try a larger max_tokens or a model tuned for tool use.",
          };
          return;
        }
        yield { type: "mood", mood: "idle" };
        yield { type: "done", stopReason: "end_turn" };
        return;
      }

      convo.push({
        role: "assistant",
        content: text || null,
        tool_calls: calls.map((c) => ({
          id: c.id,
          type: "function" as const,
          function: { name: c.name, arguments: c.args },
        })),
      });

      for (const call of calls) {
        yield {
          type: "tool_start",
          name: call.name,
          label: humanLabel(call.name),
        };
        const result = await runTool(vertical, call.name, call.args);
        const ok = !result.includes('"error"');
        yield { type: "tool_end", name: call.name, ok };
        convo.push({ role: "tool", tool_call_id: call.id, content: result });
        if (ok && vertical.confirmBeforeRunning.includes(call.name)) {
          yield {
            type: "confirm_required",
            name: call.name,
            input: parseToolInput(call.args),
            label: confirmationLabel(call.name),
          };
          yield { type: "mood", mood: "idle" };
          yield { type: "done", stopReason: "confirmation_required" };
          return;
        }
      }
    }

    // Ran out of iterations with the model still calling tools.
    yield {
      type: "error",
      message: `ARDI kept calling tools without answering (${maxIterations} rounds). Smaller local models sometimes loop — try a more capable model.`,
    };
  } catch (error) {
    if ((error as Error).name === "AbortError") return;
    yield { type: "mood", mood: "concerned" };
    yield {
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function humanLabel(toolName: string): string {
  const labels: Record<string, string> = {
    list_findings: "Checking your findings",
    get_finding: "Reading that finding",
    list_assets: "Looking at your systems",
    list_scans: "Reviewing recent scans",
    get_security_summary: "Working out your overall posture",
    start_pen_test: "Preparing the Pen Test",
    research_domain: "Researching the public domain",
    generate_report: "Preparing the security report",
  };
  return labels[toolName] ?? `Running ${toolName.replace(/_/g, " ")}`;
}

function parseToolInput(rawArgs: string): unknown {
  try {
    return rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return {};
  }
}

function confirmationLabel(toolName: string): string {
  const labels: Record<string, string> = {
    start_pen_test: "Start this Pen Test",
    generate_report: "Generate this security report",
  };
  return labels[toolName] ?? `Confirm ${toolName.replace(/_/g, " ")}`;
}

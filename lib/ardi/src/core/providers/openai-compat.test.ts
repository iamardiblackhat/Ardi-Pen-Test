import test from "node:test";
import assert from "node:assert/strict";
import { runOpenAiCompat } from "./openai-compat";
import type { VerticalConfig, ArdiEvent } from "../types";

function createSseStream(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const ev of events) {
        controller.enqueue(encoder.encode(ev));
      }
      controller.close();
    },
  });
}

test("runOpenAiCompat executes multiple tool calls", async () => {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const toolExecutionTimes: number[] = [];

  const createSlowTool = (name: string, durationMs: number) => ({
    name,
    description: `Slow tool ${name}`,
    input_schema: { type: "object", properties: {} },
    run: async () => {
      const start = Date.now();
      await delay(durationMs);
      toolExecutionTimes.push(Date.now() - start);
      return JSON.stringify({ success: true, tool: name });
    },
  });

  const mockVertical: VerticalConfig = {
    id: "test",
    displayName: "Test",
    systemPrompt: "Test prompt",
    tools: [
      createSlowTool("tool_1", 50),
      createSlowTool("tool_2", 50),
      createSlowTool("tool_3", 50),
    ] as any,
    confirmBeforeRunning: [],
    suggestions: [],
  };

  let fetchCallCount = 0;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
    fetchCallCount++;
    if (fetchCallCount === 1) {
      const sseData = [
        'data: {"choices":[{"delta":{"tool_calls":[' +
          '{"index":0,"id":"c1","function":{"name":"tool_1","arguments":"{}"}},' +
          '{"index":1,"id":"c2","function":{"name":"tool_2","arguments":"{}"}},' +
          '{"index":2,"id":"c3","function":{"name":"tool_3","arguments":"{}"}}' +
          ']}}]}\n\n',
        'data: [DONE]\n\n',
      ];
      return new Response(createSseStream(sseData), {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    } else {
      const sseData = [
        'data: {"choices":[{"delta":{"content":"Finished tools execution."}}]}\n\n',
        'data: [DONE]\n\n',
      ];
      return new Response(createSseStream(sseData), {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    }
  }) as typeof fetch;

  try {
    const start = Date.now();
    const events: ArdiEvent[] = [];
    const generator = runOpenAiCompat({
      baseUrl: "http://localhost:1234/v1",
      model: "test-model",
      vertical: mockVertical,
      messages: [{ role: "user", content: "Run tools" }],
    });

    for await (const event of generator) {
      events.push(event);
    }
    const totalDuration = Date.now() - start;

    console.log(`Total duration for tool execution: ${totalDuration}ms`);
    console.log(`Individual tool run count: ${toolExecutionTimes.length}`);

    // Verify all tool start and end events were yielded
    const toolStartEvents = events.filter((e) => e.type === "tool_start");
    const toolEndEvents = events.filter((e) => e.type === "tool_end");
    assert.equal(toolStartEvents.length, 3);
    assert.equal(toolEndEvents.length, 3);

    // Verify text event
    const textEvents = events.filter((e) => e.type === "text");
    assert.equal(textEvents.length, 1);
    if (textEvents[0].type === "text") {
      assert.equal(textEvents[0].text, "Finished tools execution.");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

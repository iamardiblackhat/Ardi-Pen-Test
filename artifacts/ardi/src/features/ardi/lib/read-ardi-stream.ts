export type ArdiStreamEvent = {
  type: string;
  text?: string;
  name?: string;
  input?: unknown;
  label?: string;
  message?: string;
};

export async function readArdiStream(
  response: Response,
  onEvent: (event: ArdiStreamEvent) => void,
) {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const rawEvent of events) {
      const line = rawEvent.trim();
      if (!line.startsWith("data: ")) continue;
      try {
        onEvent(JSON.parse(line.slice(6)) as ArdiStreamEvent);
      } catch {
        continue;
      }
    }
  }
}

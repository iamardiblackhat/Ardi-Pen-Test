import { useEffect, useRef, useState } from 'react';
import { auth } from '@/lib/auth';
import type { ArdiMessage, ArdiStatus } from '@/features/ardi/ardi-types';

const PUBLIC_SUGGESTIONS = [
  'What does ARDI SEC actually do?',
  'How does the Pen Test workflow work?',
  'What can I research with OSINT?',
  'How do I get started?',
];

const messageId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function useArdiChat({ open, authenticated, context }: { open: boolean; authenticated: boolean; context?: string }) {
  const [status, setStatus] = useState<ArdiStatus | null>(null);
  const [messages, setMessages] = useState<ArdiMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch('/api/ardi/status', {
      signal: controller.signal,
      headers: auth.getToken() ? { authorization: `Bearer ${auth.getToken()}` } : {},
    })
      .then(async (response) => response.ok ? response.json() as Promise<ArdiStatus> : Promise.reject(new Error()))
      .then(setStatus)
      .catch(() => {
        if (!controller.signal.aborted) setStatus({ configured: false, displayName: 'ARDI', suggestions: authenticated ? [] : PUBLIC_SUGGESTIONS });
      });
    return () => controller.abort();
  }, [authenticated, open]);

  useEffect(() => () => requestController.current?.abort(), []);

  const updateAssistant = (id: string, content: string, tools: string[]) => {
    setMessages((current) => current.map((message) => message.id === id ? { ...message, content, tools: [...tools] } : message));
  };

  async function send(text: string) {
    const value = text.trim();
    if (!value || streaming || !status?.configured) return;

    const userMessage: ArdiMessage = { id: messageId(), role: 'user', content: value };
    const assistantMessage: ArdiMessage = { id: messageId(), role: 'assistant', content: '', tools: [] };
    const history = [...messages, userMessage];
    setMessages([...history, assistantMessage]);
    setStreaming(true);
    const controller = new AbortController();
    requestController.current = controller;
    let assistantText = '';
    const tools: string[] = [];

    try {
      const response = await fetch('/api/ardi/chat', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'content-type': 'application/json', ...(auth.getToken() ? { authorization: `Bearer ${auth.getToken()}` } : {}) },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })), context }),
      });
      if (!response.ok || !response.body) {
        const error = await response.json().catch(() => ({ detail: 'ARDI is unavailable.' })) as { detail?: string; error?: string };
        updateAssistant(assistantMessage.id, error.detail ?? error.error ?? 'ARDI is unavailable.', tools);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const rawEvent of events) {
          const line = rawEvent.trim();
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as { type: string; text?: string; label?: string; message?: string };
            if (event.type === 'text') assistantText += event.text ?? '';
            if (event.type === 'tool_start' && event.label) { setActiveTool(event.label); if (!tools.includes(event.label)) tools.push(event.label); }
            if (event.type === 'tool_end') setActiveTool(null);
            if (event.type === 'error') assistantText += `${assistantText ? '\n\n' : ''}${event.message ?? 'ARDI could not finish the request.'}`;
            updateAssistant(assistantMessage.id, assistantText, tools);
          } catch { continue; }
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) updateAssistant(assistantMessage.id, 'Lost connection to ARDI.', tools);
    } finally {
      setStreaming(false);
      setActiveTool(null);
      requestController.current = null;
    }
  }

  return { activeTool, messages, send, status, streaming };
}


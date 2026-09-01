import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Send, X, Sparkles } from 'lucide-react';
import { ArdiAvatar, ArdiFull, type ArdiMood } from './ardi-avatar';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth';

/**
 * ARDI's chat panel. Streams token-by-token over SSE and surfaces the tools he
 * runs as he runs them, so you can see he is reading your real findings rather
 * than making things up.
 */

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  tools?: string[];
}

interface Status {
  configured: boolean;
  displayName: string;
  suggestions: string[];
}

const UNAUTHENTICATED_SUGGESTIONS = [
  'What does Ardi actually do?',
  'How is this different from a manual pentest?',
  'What is MITRE ATT&CK?',
  'How do I get started?',
];

export function ArdiPanel({
  open,
  onClose,
  context,
  authenticated = true,
}: {
  open: boolean;
  onClose: () => void;
  context?: string;
  /** false on the public landing page: no session, so no status fetch or auth header. */
  authenticated?: boolean;
}) {
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<Status | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [mood, setMood] = useState<ArdiMood>('idle');
  const [streaming, setStreaming] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/ardi/status', {
      headers: auth.getToken() ? { authorization: `Bearer ${auth.getToken()}` } : {},
    })
      .then(async (r) => r.ok ? r.json() as Promise<Status> : Promise.reject(new Error('ARDI status unavailable')))
      .then(setStatus)
      .catch(() => setStatus({ configured: false, displayName: 'ARDI', suggestions: authenticated ? [] : UNAUTHENTICATED_SUGGESTIONS }));
  }, [authenticated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [messages, activeTool, reduce]);

  async function send(text: string) {
    if (!text.trim() || streaming || !status?.configured) return;

    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setStreaming(true);
    setMood('working');

    let assistant = '';
    const toolsUsed: string[] = [];
    setMessages([...next, { role: 'assistant', content: '', tools: [] }]);

    try {
      const res = await fetch('/api/ardi/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(auth.getToken() ? { authorization: `Bearer ${auth.getToken()}` } : {}),
        },
        body: JSON.stringify({ messages: next, context }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ detail: 'ARDI is unavailable.' }));
        setMood('concerned');
        setMessages([...next, { role: 'assistant', content: err.detail ?? err.error ?? 'ARDI is unavailable.' }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;
          const evt = JSON.parse(line.slice(6));

          if (evt.type === 'text') {
            assistant += evt.text;
            setMessages([...next, { role: 'assistant', content: assistant, tools: [...toolsUsed] }]);
          } else if (evt.type === 'mood') {
            setMood(evt.mood);
          } else if (evt.type === 'tool_start') {
            setActiveTool(evt.label);
            if (!toolsUsed.includes(evt.label)) toolsUsed.push(evt.label);
          } else if (evt.type === 'tool_end') {
            setActiveTool(null);
          } else if (evt.type === 'error') {
            setMood('concerned');
            assistant += (assistant ? '\n\n' : '') + evt.message;
            setMessages([...next, { role: 'assistant', content: assistant }]);
          }
        }
      }
    } catch {
      setMood('concerned');
      setMessages([...next, { role: 'assistant', content: 'Lost connection to ARDI.' }]);
    } finally {
      setStreaming(false);
      setActiveTool(null);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={reduce ? { opacity: 0 } : { x: '100%', opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { x: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-border bg-ardi-surface text-ardi-surface-foreground shadow-2xl"
          aria-label="ARDI assistant"
        >
          <header className="flex items-center gap-3 border-b border-white/10 p-4">
            <ArdiAvatar mood={mood} size={40} />
            <div className="flex-1">
              <p className="font-semibold leading-tight">{status?.displayName ?? 'ARDI'}</p>
              <p className="text-xs text-ardi-cyan">
                {streaming ? (activeTool ?? 'Thinking…') : status?.configured === false ? 'Not configured' : 'Ready'}
              </p>
            </div>
            <button onClick={onClose} aria-label="Close ARDI" className="rounded p-1.5 hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-3 py-8 text-center"
                >
                  <ArdiFull mood="idle" size={140} />
                  <p className="text-sm text-ardi-surface-foreground/70">
                    {status === null
                      ? 'Checking whether ARDI is connected…'
                      : status.configured === false
                        ? 'ARDI is not connected to a model in this environment yet. The workspace owner needs to enable its approved model connection before chat can start.'
                        : authenticated
                          ? 'Ask me about your systems, scans or findings.'
                          : 'Ask ARDI about Ardi Sec, then sign in to investigate your own workspace data.'}
                  </p>
                </motion.div>
                <div className="space-y-2">
                  {(status?.suggestions ?? []).map((s, i) => (
                    <motion.button
                      key={s}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: reduce ? 0 : 0.05 * i }}
                      onClick={() => void send(s)}
                      disabled={!status?.configured}
                      className="flex w-full items-center gap-2 rounded-lg border border-white/10 p-3 text-left text-sm hover:border-ardi-neon/50 hover:bg-white/5 disabled:opacity-40"
                    >
                      <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-ardi-neon" />
                      {s}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={m.role === 'user' ? 'flex justify-end' : 'flex gap-2'}
              >
                {m.role === 'assistant' && <ArdiAvatar mood={i === messages.length - 1 ? mood : 'idle'} size={26} className="mt-1 flex-shrink-0" />}
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-ardi-neon/15 px-3 py-2 text-sm'
                      : 'max-w-[85%] space-y-2 text-sm leading-relaxed'
                  }
                >
                  {m.tools && m.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.tools.map((t) => (
                        <span key={t} className="rounded-full border border-ardi-cyan/40 px-2 py-0.5 text-[10px] text-ardi-cyan">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </motion.div>
            ))}

            {activeTool && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-ardi-cyan">
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-ardi-neon"
                  animate={reduce ? undefined : { opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                {activeTool}
              </motion.div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex gap-2 border-t border-white/10 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={status?.configured === false ? 'ARDI is not configured' : 'Ask ARDI…'}
              disabled={streaming || !status?.configured}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-ardi-surface-foreground/40 focus:border-ardi-neon/60 disabled:opacity-50"
            />
            <Button type="submit" size="icon" aria-label="Send message" disabled={streaming || !input.trim() || !status?.configured}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/** The always-present launcher. ARDI is everywhere, so this is on every page. */
export function ArdiLauncher({ onClick, mood = 'idle' }: { onClick: () => void; mood?: ArdiMood }) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      onClick={onClick}
      aria-label="Open ARDI"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={reduce ? undefined : { scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ardi-surface shadow-lg ring-1 ring-ardi-neon/40"
    >
      <ArdiAvatar mood={mood} size={36} />
    </motion.button>
  );
}

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Send, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@workspace/ardi-ds/components/ui/button";
import { ArdiAvatar, ArdiFull } from "@/components/ardi-avatar";
import { ArdiConfirmationCard } from "@/features/ardi/components/ardi-confirmation";
import { useArdiChat } from "@/features/ardi/hooks/use-ardi-chat";

export function ArdiChatView({
  open,
  authenticated,
  context,
}: {
  open: boolean;
  authenticated: boolean;
  context?: string;
}) {
  const [input, setInput] = useState("");
  const [, navigate] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const chat = useArdiChat({ open, authenticated, context });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat.activeTool, chat.messages]);
  const submit = (text: string) => {
    setInput("");
    void chat.send(text);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-5"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {chat.messages.length === 0 ? (
          <div className="space-y-5 text-center">
            <ArdiFull mood="idle" size={132} />
            <p className="mx-auto max-w-sm text-sm leading-6 text-indigo-100/75">
              {chat.status === null
                ? "Connecting ARDI…"
                : chat.status.configured
                  ? authenticated
                    ? "Ask ARDI to investigate public sources or work with the real assets, scans, findings, and reports in your workspace."
                    : "Ask ARDI which investigation or security operation fits your question. You can review every capability before creating a workspace."
                  : "ARDI is not connected to an approved model in this environment."}
            </p>
            <div className="grid gap-2">
              {(chat.status?.suggestions ?? []).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => submit(suggestion)}
                  disabled={!chat.status?.configured}
                  className="flex min-h-12 items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/5 px-4 text-left text-sm text-indigo-50 transition hover:border-cyan-200/60 hover:bg-violet-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:opacity-40"
                >
                  <Sparkles className="h-4 w-4 flex-none text-cyan-200" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {chat.messages.map((message) => (
          <article
            key={message.id}
            className={
              message.role === "user" ? "flex justify-end" : "flex gap-2"
            }
          >
            {message.role === "assistant" ? (
              <ArdiAvatar
                mood={chat.streaming ? "working" : "idle"}
                size={28}
                className="mt-1 flex-none"
              />
            ) : null}
            <div
              className={
                message.role === "user"
                  ? "max-w-[86%] rounded-2xl rounded-br-sm bg-violet-500/25 px-4 py-3 text-sm text-white"
                  : "max-w-[86%] space-y-2 text-sm leading-6 text-indigo-50"
              }
            >
              {message.tools?.length ? (
                <div className="flex flex-wrap gap-1">
                  {message.tools.map((tool) => (
                    <span
                      key={tool}
                      className="rounded-full border border-cyan-200/40 px-2 py-0.5 text-[11px] text-cyan-100"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="whitespace-pre-wrap">{message.content || "…"}</p>
            </div>
          </article>
        ))}
        {chat.activeTool ? (
          <p className="text-xs font-medium text-cyan-200">
            Using {chat.activeTool}…
          </p>
        ) : null}
        {chat.pendingConfirmation ? (
          <ArdiConfirmationCard
            confirmation={chat.pendingConfirmation}
            confirming={chat.confirming}
            error={chat.confirmationError}
            onCancel={chat.cancelPending}
            onConfirm={() => void chat.confirmPending()}
          />
        ) : null}
        {chat.completedAction ? (
          <button
            type="button"
            onClick={() => navigate(chat.completedAction!.href)}
            className="flex min-h-12 w-full items-center justify-between rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 text-left text-sm font-semibold text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            <span>{chat.completedAction.linkLabel}</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
        className="flex gap-2 border-t border-violet-200/15 bg-[#100c2a]/90 p-3"
      >
        <label className="sr-only" htmlFor="ardi-message">
          Message ARDI
        </label>
        <input
          id="ardi-message"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={
            chat.status?.configured === false
              ? "ARDI is not configured"
              : authenticated
                ? "Ask ARDI to investigate, assess, or report…"
                : "Ask which security operation fits…"
          }
          disabled={
            chat.streaming ||
            chat.pendingConfirmation !== null ||
            !chat.status?.configured
          }
          className="min-w-0 flex-1 rounded-xl border border-violet-200/20 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-indigo-200/45 focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/20 disabled:opacity-50"
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Send message"
          disabled={
            chat.streaming ||
            chat.pendingConfirmation !== null ||
            !input.trim() ||
            !chat.status?.configured
          }
          className="h-12 w-12 bg-gradient-to-br from-blue-500 to-violet-500 text-white hover:from-blue-400 hover:to-violet-400"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

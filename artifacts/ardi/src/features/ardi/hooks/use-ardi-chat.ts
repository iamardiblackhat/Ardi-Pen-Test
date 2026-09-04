import { useEffect, useRef, useState } from "react";
import { auth } from "@/lib/auth";
import type {
  ArdiCompletedAction,
  ArdiConfirmation,
  ArdiMessage,
  ArdiStatus,
} from "@/features/ardi/ardi-types";
import { readArdiStream } from "@/features/ardi/lib/read-ardi-stream";

const PUBLIC_SUGGESTIONS = [
  "What does ARDI SEC actually do?",
  "How does the Pen Test workflow work?",
  "What can I research with OSINT?",
  "How do I get started?",
];

const messageId = () =>
  crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function useArdiChat({
  open,
  authenticated,
  context,
}: {
  open: boolean;
  authenticated: boolean;
  context?: string;
}) {
  const [status, setStatus] = useState<ArdiStatus | null>(null);
  const [messages, setMessages] = useState<ArdiMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<ArdiConfirmation | null>(null);
  const [completedAction, setCompletedAction] =
    useState<ArdiCompletedAction | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmationError, setConfirmationError] = useState("");
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch("/api/ardi/status", {
      signal: controller.signal,
      headers: auth.getToken()
        ? { authorization: `Bearer ${auth.getToken()}` }
        : {},
    })
      .then(async (response) =>
        response.ok
          ? (response.json() as Promise<ArdiStatus>)
          : Promise.reject(new Error()),
      )
      .then(setStatus)
      .catch(() => {
        if (!controller.signal.aborted)
          setStatus({
            configured: false,
            displayName: "ARDI",
            suggestions: authenticated ? [] : PUBLIC_SUGGESTIONS,
          });
      });
    return () => controller.abort();
  }, [authenticated, open]);

  useEffect(() => () => requestController.current?.abort(), []);

  const updateAssistant = (id: string, content: string, tools: string[]) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === id
          ? { ...message, content, tools: [...tools] }
          : message,
      ),
    );
  };

  async function send(text: string) {
    const value = text.trim();
    if (!value || streaming || !status?.configured) return;

    const userMessage: ArdiMessage = {
      id: messageId(),
      role: "user",
      content: value,
    };
    const assistantMessage: ArdiMessage = {
      id: messageId(),
      role: "assistant",
      content: "",
      tools: [],
    };
    const history = [...messages, userMessage];
    setMessages([...history, assistantMessage]);
    setStreaming(true);
    const controller = new AbortController();
    requestController.current = controller;
    let assistantText = "";
    const tools: string[] = [];

    try {
      const response = await fetch("/api/ardi/chat", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          ...(auth.getToken()
            ? { authorization: `Bearer ${auth.getToken()}` }
            : {}),
        },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          context,
        }),
      });
      if (!response.ok || !response.body) {
        const error = (await response
          .json()
          .catch(() => ({ detail: "ARDI is unavailable." }))) as {
          detail?: string;
          error?: string;
        };
        updateAssistant(
          assistantMessage.id,
          error.detail ?? error.error ?? "ARDI is unavailable.",
          tools,
        );
        return;
      }

      await readArdiStream(response, (event) => {
        if (event.type === "text") assistantText += event.text ?? "";
        if (event.type === "tool_start" && event.label) {
          setActiveTool(event.label);
          if (!tools.includes(event.label)) tools.push(event.label);
        }
        if (event.type === "tool_end") setActiveTool(null);
        if (event.type === "confirm_required" && event.name && event.label) {
          setPendingConfirmation({
            name: event.name,
            label: event.label,
            input: event.input,
          });
          setConfirmationError("");
        }
        if (event.type === "error")
          assistantText += `${assistantText ? "\n\n" : ""}${event.message ?? "ARDI could not finish the request."}`;
        updateAssistant(assistantMessage.id, assistantText, tools);
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        updateAssistant(assistantMessage.id, "Lost connection to ARDI.", tools);
    } finally {
      setStreaming(false);
      setActiveTool(null);
      requestController.current = null;
    }
  }

  async function confirmPending() {
    if (!pendingConfirmation || confirming) return;
    setConfirming(true);
    setConfirmationError("");
    try {
      const response = await fetch("/api/ardi/actions/confirm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(auth.getToken()
            ? { authorization: `Bearer ${auth.getToken()}` }
            : {}),
        },
        body: JSON.stringify({
          name: pendingConfirmation.name,
          input: pendingConfirmation.input,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        href?: string;
        linkLabel?: string;
      };
      if (!response.ok || !body.message || !body.href || !body.linkLabel) {
        throw new Error(body.error ?? "ARDI could not execute that action.");
      }
      const actionMessage = body.message;
      const actionHref = body.href;
      const actionLinkLabel = body.linkLabel;
      setCompletedAction({
        message: actionMessage,
        href: actionHref,
        linkLabel: actionLinkLabel,
      });
      setPendingConfirmation(null);
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          content: actionMessage,
          tools: ["Action completed"],
        },
      ]);
    } catch (error) {
      setConfirmationError(
        error instanceof Error
          ? error.message
          : "ARDI could not execute that action.",
      );
    } finally {
      setConfirming(false);
    }
  }

  function cancelPending() {
    setPendingConfirmation(null);
    setConfirmationError("");
    setMessages((current) => [
      ...current,
      {
        id: messageId(),
        role: "assistant",
        content: "Cancelled. Nothing was started.",
      },
    ]);
  }

  return {
    activeTool,
    cancelPending,
    completedAction,
    confirmationError,
    confirming,
    confirmPending,
    messages,
    pendingConfirmation,
    send,
    status,
    streaming,
  };
}

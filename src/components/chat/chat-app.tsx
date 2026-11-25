"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND } from "@/lib/brand";
import { GREETING, STARTER_PROMPTS } from "@/lib/prompts";
import type { ChatAction, ChatMessage, Draft, Slot, TurnResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PartView } from "@/components/chat/cards";
import { Markdown } from "@/components/chat/markdown";

const STORAGE_KEY = "northwind-chat-v1";

function greeting(): ChatMessage {
  return {
    id: "greeting",
    role: "assistant",
    text: GREETING,
    parts: [],
    createdAt: "greeting",
    engine: "guided",
  };
}

export function ChatApp({ embedded = false }: { embedded?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([greeting()]);
  const [draft, setDraft] = useState<Draft>({});
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [engine, setEngine] = useState<"guided" | "model">("guided");
  const [error, setError] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
        const saved = JSON.parse(raw) as { messages: ChatMessage[]; draft: Draft; conversationId?: string };
        if (saved.messages?.length) {
          setMessages(saved.messages);
          setDraft(saved.draft ?? {});
          setConversationId(saved.conversationId);
        }
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      hydrated.current = true;
    }, 0);
    fetch("/api/health")
      .then((response) => response.json())
      .then((body: { model?: boolean }) => setModelReady(Boolean(body.model)))
      .catch(() => setModelReady(false));
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, draft, conversationId }));
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, draft, conversationId]);

  async function send(nextText: string, action?: ChatAction) {
    const trimmed = nextText.trim();
    if (busy || (!trimmed && !action)) return;
    setError("");
    const userMessage: ChatMessage | null = trimmed
      ? {
          id: crypto.randomUUID(),
          role: "user",
          text: trimmed,
          parts: [],
          createdAt: new Date().toISOString(),
        }
      : null;
    const history = [...messages, ...(userMessage ? [userMessage] : [])];
    if (userMessage) setMessages(history);
    setText("");
    setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          action,
          draft,
          conversationId,
          engine: action ? "guided" : engine,
          history: history
            .filter((message) => message.id !== "greeting")
            .slice(-8)
            .map((message) => ({ role: message.role, text: message.text })),
        }),
      });
      if (!response.ok || !response.body) {
        const failed = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(failed?.error || "The desk couldn't answer.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamed = "";
      const pendingId = crypto.randomUUID();
      setMessages((current) => [
        ...current,
        { id: pendingId, role: "assistant", text: "", parts: [], createdAt: new Date().toISOString() },
      ]);
      let done = false;
      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        buffer += decoder.decode(chunk.value, { stream: !chunk.done });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const line = event.split("\n").find((item) => item.startsWith("data: "));
          if (!line) continue;
          const payload = JSON.parse(line.slice(6)) as {
            type: string;
            delta?: string;
            message?: TurnResult["message"];
            draft?: Draft;
            conversationId?: string;
          };
          if (payload.type === "text" && payload.delta) {
            streamed += payload.delta;
            const snapshot = streamed;
            setMessages((current) => current.map((message) => (
              message.id === pendingId ? { ...message, text: snapshot } : message
            )));
          }
          if (payload.type === "done" && payload.message) {
            setDraft(payload.draft ?? {});
            setConversationId(payload.conversationId);
            setMessages((current) => current.map((message) => (
              message.id === pendingId ? payload.message! : message
            )));
          }
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The desk couldn't answer.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([greeting()]);
    setDraft({});
    setConversationId(undefined);
    setError("");
    setText("");
  }

  return (
    <div className={embedded ? "grid h-dvh" : "mx-auto grid w-full max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-6"}>
      <section className={embedded
        ? "flex h-dvh flex-col overflow-hidden bg-card"
        : "flex h-[calc(100dvh-6.25rem)] min-h-[34rem] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[0_20px_50px_-28px_rgba(60,30,10,0.45)]"}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="font-heading text-lg leading-none">Dispatch chat</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {engine === "model" ? "Live model choosing the tools" : "Guided desk, same tools, no API key required"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {modelReady ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setEngine(engine === "model" ? "guided" : "model")}>
                {engine === "model" ? "Use guided" : "Use model"}
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              New chat
            </Button>
          </div>
        </div>
        <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" data-testid="message-list">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              disabled={busy}
              onSelectSlot={(slot) => void send(`I'll take ${slot.label}.`, { type: "select_slot", slotId: slot.id })}
              onBook={(input) => void send(`Book it for ${input.name}, ${input.phone}, ${input.address}.`, { type: "book", ...input })}
              onCancel={(code) => void send(`Cancel ${code}.`, { type: "cancel", confirmationCode: code })}
              onReschedule={(code) => void send(`Move ${code} to another window.`, { type: "start_reschedule", confirmationCode: code })}
              onSuggest={(suggestion) => void send(suggestion)}
            />
          ))}
          {busy ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <span className="inline-flex gap-1" aria-hidden>
                <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-primary" />
              </span>
              Checking the guides and the board…
            </p>
          ) : null}
          {error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <p className="sr-only" aria-live="polite">
            {messages.at(-1)?.role === "assistant" ? messages.at(-1)?.text : ""}
          </p>
        </div>
        <div className="border-t border-border px-4 py-3">
          {messages.length < 3 ? (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {STARTER_PROMPTS.map((prompt) => (
                <Button
                  key={prompt.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={busy}
                  data-testid={`starter-${prompt.id}`}
                  onClick={() => void send(prompt.text)}
                >
                  {prompt.label}
                </Button>
              ))}
            </div>
          ) : null}
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send(text);
            }}
          >
            <label className="sr-only" htmlFor="chat-text">
              Message the dispatcher
            </label>
            <Textarea
              id="chat-text"
              data-testid="chat-input"
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(text);
                }
              }}
              placeholder="Describe the system, the ZIP, or a confirmation code"
              rows={2}
              className="min-h-11 flex-1 resize-none"
            />
            <Button type="submit" data-testid="send" disabled={busy || text.trim().length === 0} className="h-11">
              Send
            </Button>
          </form>
        </div>
      </section>
      {embedded ? null : (
      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-3xl border border-border bg-card p-4">
          <h2 className="font-heading text-lg">On the truck today</h2>
          <p className="mt-2 text-sm text-destructive">Gas smell or a CO alarm: leave the house and call 911. Then tell the chat.</p>
          <p className="mt-3 text-sm">
            <a className="font-medium underline-offset-2 hover:underline" href={`tel:${BRAND.phoneTel}`}>{BRAND.phoneDisplay}</a>
            <span className="mt-1 block text-muted-foreground">{BRAND.address}</span>
          </p>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {BRAND.hours.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-border bg-card p-4">
          <h2 className="font-heading text-lg">What this desk can do</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
            <li>Hear the problem and show a safe check.</li>
            <li>Price a sample range from the guide.</li>
            <li>Offer real windows on the demo board.</li>
            <li>Confirm the visit, or hand off a gas or CO call.</li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            Fictional company. Estimates are not bids. Host label {BRAND.subdomain}.
          </p>
        </div>
      </aside>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  disabled,
  onSelectSlot,
  onBook,
  onCancel,
  onReschedule,
  onSuggest,
}: {
  message: ChatMessage;
  disabled: boolean;
  onSelectSlot: (slot: Slot) => void;
  onBook: (input: { slotId: string; name: string; phone: string; address: string; issue?: string }) => void;
  onCancel: (code: string) => void;
  onReschedule: (code: string) => void;
  onSuggest: (text: string) => void;
}) {
  const mine = message.role === "user";
  return (
    <div className={mine ? "ml-8 flex justify-end" : "mr-4"} data-testid={mine ? "user-message" : "assistant-message"}>
      <div className={mine ? "max-w-[40rem] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground" : "max-w-[44rem] space-y-3"}>
        {mine ? <p>{message.text}</p> : <div className="text-sm leading-6" data-testid="assistant-text"><Markdown text={message.text} /></div>}
        {message.parts.map((part, index) => (
          <PartView
            key={`${message.id}-${part.type}-${index}`}
            part={part}
            disabled={disabled}
            onSelectSlot={onSelectSlot}
            onBook={onBook}
            onCancel={onCancel}
            onReschedule={onReschedule}
          />
        ))}
        {message.tools && message.tools.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {message.tools.map((tool, index) => (
              <li key={`${tool.name}-${index}`} className="rounded-full border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground" title={tool.summary}>
                {tool.name}
              </li>
            ))}
          </ul>
        ) : null}
        {message.suggestions && message.suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {message.suggestions.map((suggestion) => (
              <Button key={suggestion} type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onSuggest(suggestion)}>
                {suggestion}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

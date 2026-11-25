"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  FileText,
  Flame,
  Headphones,
  Mic,
  MoreHorizontal,
  Paperclip,
  RefreshCw,
  Snowflake,
  Square,
  Thermometer,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BrandMark } from "@/components/brand-mark";
import { LeadCard, PartView } from "@/components/chat/cards";
import { Markdown } from "@/components/chat/markdown";
import { DESK, DISCLAIMER } from "@/lib/brand";
import { COMPOSER_PLACEHOLDER, GREETING, STARTER_PROMPTS } from "@/lib/prompts";
import type { ChatAction, ChatMessage, Draft, Slot, TurnResult } from "@/lib/types";
import { cn } from "cn";

const ICONS = {
  snowflake: Snowflake,
  thermometer: Thermometer,
  flame: Flame,
  headphones: Headphones,
} as const;

type Attachment = { id: string; name: string; kind: "image" | "pdf"; url?: string };

type UiMessage = ChatMessage & {
  speaker?: "assistant" | "human";
  stopped?: boolean;
  attachments?: Attachment[];
  streaming?: boolean;
};

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_BYTES = 5 * 1024 * 1024;

export function ChatApp({
  variant = "page",
  onClose,
  storageKey = "northwind-chat-v1",
  autoFocus = false,
}: {
  variant?: "page" | "embed" | "hero" | "overlay";
  onClose?: () => void;
  storageKey?: string;
  autoFocus?: boolean;
}) {
  const [messages, setMessages] = useState<UiMessage[]>([greeting()]);
  const [draft, setDraft] = useState<Draft>({});
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [engine, setEngine] = useState<"guided" | "model">("guided");
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const [stick, setStick] = useState(true);
  const [status, setStatus] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [fileCount, setFileCount] = useState(0);
  const [listening, setListening] = useState(false);
  const [toast, setToast] = useState("");
  const [joined, setJoined] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});
  const [copied, setCopied] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const joinedIds = useRef(new Set<string>());
  const recognition = useRef<{ stop: () => void } | null>(null);
  const reduced = useReducedMotion();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const humanHandoff = [...messages].reverse().find((message) => message.parts.some((part) => part.type === "handoff" && part.tone === "human"));
  const safetyHandoff = [...messages].reverse().find((message) => message.parts.some((part) => part.type === "handoff" && part.tone === "safety"));
  const hasUser = messages.some((message) => message.role === "user");
  const shell = variant === "page"
    ? "chat-widget-shell relative mx-auto flex h-[min(680px,calc(100dvh-8.5rem))] w-full max-w-[400px] flex-col"
    : variant === "hero"
      ? "chat-widget-shell relative flex h-[min(640px,70dvh)] min-h-[520px] w-full flex-col"
      : "relative flex h-full min-h-0 w-full flex-col bg-transparent";

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          const saved = JSON.parse(raw) as { messages: UiMessage[]; draft: Draft; conversationId?: string };
          if (saved.messages?.length) {
            setMessages(saved.messages);
            setDraft(saved.draft ?? {});
            setConversationId(saved.conversationId);
          }
        } catch {
          localStorage.removeItem(storageKey);
        }
      }
      hydrated.current = true;
    }, 0);
    fetch("/api/health")
      .then((response) => response.json())
      .then((body: { model?: boolean }) => setModelReady(Boolean(body.model)))
      .catch(() => setModelReady(false));
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(storageKey, JSON.stringify({ messages, draft, conversationId }));
  }, [messages, draft, conversationId, storageKey]);

  useEffect(() => {
    if (!stick) return;
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [messages, phase, stick, reduced]);

  useEffect(() => {
    if (!autoFocus) return;
    if (window.matchMedia("(max-width: 639px)").matches) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [autoFocus]);

  useEffect(() => {
    function onTheme(event: MessageEvent) {
      if (event.data?.type === "northwind-theme" && (event.data.theme === "light" || event.data.theme === "dark" || event.data.theme === "system")) {
        setTheme(event.data.theme);
      }
      if (event.data?.type === "northwind-ask" && typeof event.data.text === "string") {
        window.dispatchEvent(new CustomEvent("northwind-ask", { detail: { text: event.data.text, target: event.data.target || "embed" } }));
      }
    }
    window.addEventListener("message", onTheme);
    return () => window.removeEventListener("message", onTheme);
  }, [setTheme]);

  useEffect(() => {
    function syncResume() {
      if (localStorage.getItem("northwind-bot-paused") === "false") setJoined("");
    }
    window.addEventListener("storage", syncResume);
    window.addEventListener("focus", syncResume);
    return () => {
      window.removeEventListener("storage", syncResume);
      window.removeEventListener("focus", syncResume);
    };
  }, []);

  useEffect(() => {
    const safety = [...messages].reverse().find((message) => message.parts.some((part) => part.type === "handoff" && part.tone === "safety"));
    const human = [...messages].reverse().find((message) => message.parts.some((part) => part.type === "handoff" && part.tone === "human"));
    const safetyPart = safety?.parts.find((part) => part.type === "handoff");
    const humanPart = human?.parts.find((part) => part.type === "handoff");
    if (safetyPart?.type === "handoff" && !sessionStorage.getItem(`ops-${safetyPart.handoff.reference}`)) {
      sessionStorage.setItem(`ops-${safetyPart.handoff.reference}`, "1");
      window.dispatchEvent(new CustomEvent("northwind-ops", { detail: { kind: "urgent", text: "URGENT SMS sent to on-call tech" } }));
    }
    if (humanPart?.type === "handoff" && !sessionStorage.getItem(`staff-${humanPart.handoff.reference}`)) {
      sessionStorage.setItem(`staff-${humanPart.handoff.reference}`, "1");
      localStorage.setItem("northwind-bot-paused", "true");
      window.dispatchEvent(new CustomEvent("northwind-ops", {
        detail: { kind: "staff", text: `New human support request · ${humanPart.handoff.reference}` },
      }));
    }
  }, [messages]);

  useEffect(() => {
    function onAsk(event: Event) {
      const prompt = (event as CustomEvent<{ text?: string; target?: string }>).detail;
      if (!prompt?.text) return;
      if (prompt.target === "hero" && variant !== "hero") return;
      if (prompt.target === "widget" && variant !== "overlay" && variant !== "embed") return;
      void send(prompt.text);
    }
    window.addEventListener("northwind-ask", onAsk);
    return () => window.removeEventListener("northwind-ask", onAsk);
  });

  useEffect(() => {
    const part = humanHandoff?.parts.find((item) => item.type === "handoff" && item.tone === "human");
    if (!part || part.type !== "handoff") return;
    const reference = part.handoff.reference;
    if (joinedIds.current.has(reference)) return;
    const timer = window.setTimeout(() => {
      joinedIds.current.add(reference);
      setJoined(reference);
      setMessages((current) => [
        ...current,
        {
          id: `human-${reference}`,
          role: "assistant",
          speaker: "human",
          text: "I have the ticket. Tell me anything the tech should know before the truck rolls.",
          parts: [],
          createdAt: new Date().toISOString(),
        },
      ]);
    }, reduced ? 0 : 900);
    return () => window.clearTimeout(timer);
  }, [humanHandoff, reduced]);

  function resumeBot() {
    localStorage.setItem("northwind-bot-paused", "false");
    setJoined("");
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "I'm back on the desk. Ask about a visit, a quote, or the guides.",
        parts: [],
        createdAt: new Date().toISOString(),
        engine: "guided",
      },
    ]);
  }

  function reset() {
    if (humanHandoff && !confirmReset) {
      setConfirmReset(true);
      return;
    }
    localStorage.removeItem(storageKey);
    joinedIds.current.clear();
    setJoined("");
    setMessages([greeting()]);
    setDraft({});
    setConversationId(undefined);
    setError("");
    setText("");
    setFiles([]);
    setConfirmReset(false);
    setPhase("");
    setStreaming(false);
  }

  function closeWidget() {
    if (onClose) onClose();
    else if (window.parent !== window) window.parent.postMessage({ type: "northwind-close" }, "*");
  }

  function addFiles(list: FileList | File[]) {
    const next: Attachment[] = [];
    let blocked = "";
    for (const file of Array.from(list)) {
      if (files.length + next.length >= 3) {
        blocked = "Three files per message is the limit.";
        break;
      }
      if (fileCount + next.length >= 10) {
        blocked = "Ten files per conversation is the limit.";
        break;
      }
      if (file.size > MAX_BYTES) {
        blocked = `${file.name} is over 5 MB.`;
        continue;
      }
      const kind = file.type === "application/pdf" ? "pdf" : file.type.startsWith("image/") ? "image" : null;
      if (!kind) {
        blocked = "Use a JPEG, PNG, WebP, or PDF.";
        continue;
      }
      next.push({
        id: crypto.randomUUID(),
        name: file.name,
        kind,
        url: kind === "image" ? URL.createObjectURL(file) : undefined,
      });
    }
    if (blocked) {
      setToast(blocked);
      window.setTimeout(() => setToast(""), 4000);
    }
    if (next.length) setFiles((current) => [...current, ...next]);
  }

  function toggleMic() {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const Speech = (window as unknown as {
      SpeechRecognition?: new () => SpeechSession;
      webkitSpeechRecognition?: new () => SpeechSession;
    }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => SpeechSession }).webkitSpeechRecognition;
    if (!Speech) {
      setToast("Voice input isn't available in this browser. Type instead.");
      window.setTimeout(() => setToast(""), 4000);
      return;
    }
    const session = new Speech();
    session.lang = "en-US";
    session.interimResults = true;
    session.continuous = false;
    session.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ");
      setText(transcript);
    };
    session.onerror = () => {
      setListening(false);
      setToast("Voice input isn't available in this browser. Type instead.");
      window.setTimeout(() => setToast(""), 4000);
    };
    session.onend = () => setListening(false);
    recognition.current = session;
    try {
      session.start();
      setListening(true);
    } catch {
      setToast("Voice input isn't available in this browser. Type instead.");
      window.setTimeout(() => setToast(""), 4000);
    }
  }

  async function send(nextText: string, action?: ChatAction) {
    const trimmed = nextText.trim();
    const attachmentNote = files.length
      ? ` Attached ${files.map((file) => file.name).join(", ")}.`
      : "";
    const outbound = `${trimmed}${attachmentNote}`.trim();
    if (busy || (!outbound && !action)) return;
    setError("");
    const sentFiles = files;
    const userMessage: UiMessage | null = outbound
      ? {
          id: crypto.randomUUID(),
          role: "user",
          text: outbound,
          parts: [],
          createdAt: new Date().toISOString(),
          attachments: sentFiles,
        }
      : null;
    const history = [...messages, ...(userMessage ? [userMessage] : [])];
    if (userMessage) setMessages(history);
    setText("");
    setFiles([]);
    setFileCount((count) => count + sentFiles.length);
    setBusy(true);
    setStreaming(true);
    setPhase("Looking in the guides…");
    setStatus("Assistant is replying");
    setStick(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const pendingId = crypto.randomUUID();
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          text: outbound,
          action,
          draft,
          conversationId,
          engine: action ? "guided" : engine,
          history: history
            .filter((message) => message.id !== "greeting" && !message.id.startsWith("human-"))
            .slice(-8)
            .map((message) => ({ role: message.role, text: message.text })),
        }),
      });
      if (!response.ok || !response.body) {
        const failed = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(failed?.error || "The desk couldn't answer.");
      }
      setMessages((current) => [
        ...current,
        { id: pendingId, role: "assistant", text: "", parts: [], createdAt: new Date().toISOString(), streaming: true },
      ]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamed = "";
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
            label?: string;
            delta?: string;
            message?: TurnResult["message"];
            draft?: Draft;
            conversationId?: string;
          };
          if (payload.type === "phase" && payload.label) setPhase(payload.label);
          if (payload.type === "text" && payload.delta) {
            streamed += payload.delta;
            const snapshot = streamed;
            setMessages((current) => current.map((message) => (
              message.id === pendingId ? { ...message, text: snapshot, streaming: true } : message
            )));
          }
          if (payload.type === "done" && payload.message) {
            const message = payload.message;
            const named = sentFiles.length && !message.text.includes(sentFiles[0].name)
              ? `Got ${sentFiles.map((file) => file.name).join(", ")}. I can still book a tech; this demo doesn't run diagnostics on images.\n\n${message.text}`
              : message.text;
            setDraft(payload.draft ?? {});
            setConversationId(payload.conversationId);
            setMessages((current) => current.map((item) => (
              item.id === pendingId ? { ...message, id: pendingId, text: named, streaming: false } : item
            )));
          }
        }
      }
      setStatus("Assistant replied");
    } catch (caught) {
      if (controller.signal.aborted) {
        setMessages((current) => current.map((message) => (
          message.id === pendingId ? { ...message, stopped: true, streaming: false } : message
        )));
        setStatus("Stopped");
      } else {
        setText(trimmed);
        setFiles(sentFiles);
        setError(caught instanceof Error ? caught.message : "The desk couldn't answer.");
        setMessages((current) => current.filter((message) => message.id !== pendingId));
      }
    } finally {
      setBusy(false);
      setStreaming(false);
      setPhase("");
      abortRef.current = null;
      if (!window.matchMedia("(max-width: 639px)").matches) inputRef.current?.focus();
    }
  }

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStick(distance < 80);
  }

  const showClose = variant === "embed" || variant === "overlay" || Boolean(onClose);
  const placeholder = joined ? `Message ${DESK.humanName}…` : listening ? "Listening…" : COMPOSER_PLACEHOLDER;
  const live = messages.some((message) => message.engine === "model");
  const title = joined ? DESK.humanName : `${DESK.botName} · ${DESK.brand}`;
  const subtitle = joined
    ? DESK.humanRole
    : humanHandoff
      ? "Connecting you to a team member…"
      : "Online 24/7";

  return (
    <section
      className={shell}
      data-testid={variant === "overlay" || variant === "embed" ? "chat-widget" : undefined}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
      }}
    >
      <header data-testid="chat-header" className="relative flex h-16 shrink-0 items-center gap-2 border-b border-border px-3">
        <span className="absolute inset-x-0 top-0 h-0.5 bg-accent" aria-hidden />
        <span className="relative grid size-7 place-items-center rounded-full bg-accent-soft text-foreground">
          {joined ? <span className="text-[11px] font-semibold">RC</span> : <BrandMark className="size-4" />}
          <span className={cn("absolute right-0 bottom-0 size-2 rounded-full ring-2 ring-surface", joined ? "bg-info" : "bg-success")} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] leading-5 font-semibold tracking-tight">{title}</span>
          <span className="flex items-center gap-2 truncate text-[12px] leading-4 text-muted-foreground">
            <span>{subtitle}</span>
            <span data-testid="mode-pill" className="rounded-full border border-border bg-surface px-1.5 py-0.5 text-[11px] text-foreground">
              {live ? "Live AI" : "Demo mode"}
            </span>
          </span>
        </span>
        <IconButton label="Menu" onClick={() => setMenu((value) => !value)}>
          <MoreHorizontal className="size-4" strokeWidth={1.75} />
        </IconButton>
        {showClose ? (
          <IconButton label="Close chat" onClick={closeWidget}>
            <X className="size-4" strokeWidth={1.75} />
          </IconButton>
        ) : null}
        {menu ? (
          <div className="absolute top-14 right-3 z-10 w-44 rounded-xl border border-border bg-surface p-1 shadow-[var(--shadow-card)]">
            <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-muted" onClick={() => { setMenu(false); reset(); }}>New chat</button>
            <button type="button" data-testid="theme-toggle" className="block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-muted" onClick={() => { setTheme(resolvedTheme === "dark" ? "light" : "dark"); setMenu(false); }}>
              {mounted && resolvedTheme === "dark" ? "Light" : "Dark"}
            </button>
            <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-muted" onClick={() => { setMenu(false); void send("Talk to a person at dispatch."); }}>Talk to a human</button>
            {joined ? (
              <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-muted" onClick={() => { setMenu(false); resumeBot(); }}>Resume bot</button>
            ) : null}
            {modelReady ? (
              <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-muted" onClick={() => { setEngine(engine === "model" ? "guided" : "model"); setMenu(false); }}>
                {engine === "model" ? "Use guided desk" : "Use model"}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>
      <AnimatePresence>
        {(joined || humanHandoff || safetyHandoff) ? (
          <motion.div
            data-testid="handoff-banner"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-info/30 bg-info/10 text-[12px] text-foreground"
          >
            <p className="px-3 py-2">
              {safetyHandoff && !humanHandoff
                ? "Leave the house and call 911. Then tell the desk."
                : joined
                  ? `${DESK.humanName} joined`
                  : "Connecting you to a team member…"}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {safetyHandoff ? (
        <p data-testid="urgent-banner" role="alert" className="bg-danger px-3 py-2 text-[13px] text-white">
          Urgent: leave the house and call 911. The on-call tech is flagged in this demo.
        </p>
      ) : null}
      {confirmReset ? (
        <div className="flex items-center justify-between gap-2 border-b border-border bg-accent-soft px-3 py-2 text-[13px]">
          <span>A handoff is open. Start a new chat?</span>
          <button type="button" className="font-medium underline" onClick={reset}>Start over</button>
          <button type="button" onClick={() => setConfirmReset(false)}>Keep</button>
        </div>
      ) : null}
      <div
        ref={scroller}
        data-testid="chat-messages"
        role="log"
        aria-live="off"
        aria-relevant="additions"
        onScroll={onScroll}
        className="chat-scroll relative flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {!hasUser ? <EmptyState disabled={busy} onSend={(value) => void send(value)} /> : null}
        {messages.filter((message) => message.id !== "greeting").map((message, _index, list) => (
          <MessageTurn
            key={message.id}
            message={message}
            seen={Boolean(joined) && message.role === "user" && !list.slice(_index + 1).some((item) => item.role === "user")}
            disabled={busy || message.id !== [...messages].reverse().find((item) => item.role === "assistant")?.id}
            feedback={feedback[message.id]}
            copied={copied === message.id}
            onSelectSlot={(slot) => void send(`I'll take ${slot.label}.`, { type: "select_slot", slotId: slot.id })}
            onBook={(input) => void send(`Book it for ${input.name}, ${input.phone}, ${input.address}.`, { type: "book", ...input })}
            onCancel={(code) => void send(`Cancel ${code}.`, { type: "cancel", confirmationCode: code })}
            onReschedule={(code) => void send(`Move ${code} to another window.`, { type: "start_reschedule", confirmationCode: code })}
            onSuggest={(suggestion) => void send(suggestion)}
            onCopy={() => {
              const value = message.text;
              void navigator.clipboard.writeText(value);
              setCopied(message.id);
              window.setTimeout(() => setCopied(""), 2000);
            }}
            onFeedback={(value) => setFeedback((current) => ({ ...current, [message.id]: value }))}
            onRetry={() => {
              const previous = [...messages].reverse().find((item) => item.role === "user");
              if (previous) void send(previous.text);
            }}
          />
        ))}
        {streaming && phase ? (
          <p data-testid="phase-indicator" className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <span className="inline-flex gap-1" aria-hidden>
              <span className="phase-dot size-1.5 rounded-full bg-accent" />
              <span className="phase-dot size-1.5 rounded-full bg-accent" />
              <span className="phase-dot size-1.5 rounded-full bg-accent" />
            </span>
            {reduced ? "Working" : phase}
          </p>
        ) : null}
        {streaming && (phase.includes("Pricing") || phase.includes("calendar") || phase.includes("board")) ? <CardSkeleton /> : null}
        {error ? (
          <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm" role="alert">
            {error} <button type="button" className="underline" onClick={() => void send(text)}>Retry send</button>
          </p>
        ) : null}
      </div>
      {!stick ? (
        <button
          type="button"
          data-testid="jump-to-latest"
          className="absolute bottom-28 left-1/2 z-10 grid size-9 -translate-x-1/2 place-items-center rounded-full border border-border bg-surface shadow-[var(--shadow-card)]"
          onClick={() => {
            setStick(true);
            scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
          }}
        >
          <ArrowDown className="size-4" strokeWidth={1.75} />
          <span className="sr-only">Jump to latest</span>
        </button>
      ) : null}
      {dragOver ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center border-2 border-dashed border-accent bg-surface/80 text-sm">
          Drop to attach
        </div>
      ) : null}
      <div data-testid="composer" className="shrink-0 px-3 pt-1 pb-2">
        <div className="mb-1 flex justify-between gap-2">
          <button type="button" className="text-[12px] font-medium text-accent underline-offset-2 hover:underline" onClick={() => setLeadOpen((value) => !value)}>
            Leave contact details for the team
          </button>
          {joined ? (
            <button type="button" data-testid="resume-bot" className="text-[12px] font-medium underline-offset-2 hover:underline" onClick={resumeBot}>
              Resume bot
            </button>
          ) : null}
        </div>
        {leadOpen ? (
          <div className="mb-2">
            <LeadCard
              disabled={busy}
              onSubmit={(input) => {
                setLeadOpen(false);
                void send(`Call me back. My name is ${input.name}. My phone is ${input.phone}. Email ${input.email}.`, {
                  type: "save_lead",
                  name: input.name,
                  phone: input.phone,
                });
              }}
            />
          </div>
        ) : null}
        {files.length > 0 ? (
          <ul className="mb-2 flex flex-wrap gap-2">
            {files.map((file) => (
              <li key={file.id} className="flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1 text-[11.5px]">
                {file.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.url} alt="" className="size-12 rounded-lg object-cover" />
                ) : (
                  <FileText className="size-4" />
                )}
                <span className="max-w-24 truncate">{file.name}</span>
                <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))}>
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex items-end gap-1 rounded-2xl border border-border bg-surface-2 p-2 pl-3">
          <button type="button" data-testid="composer-attach" aria-label="Attach a file" className="grid size-8 place-items-center rounded-full text-foreground hover:bg-muted" onClick={() => fileRef.current?.click()}>
            <Paperclip className="size-5" strokeWidth={1.75} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            aria-label="Attach a file"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <label className="sr-only" htmlFor={`${storageKey}-input`}>Message the desk</label>
          <textarea
            id={`${storageKey}-input`}
            ref={inputRef}
            data-testid="composer-input"
            value={text}
            rows={1}
            placeholder={placeholder}
            className="chat-scroll max-h-36 min-h-16 flex-1 resize-none bg-transparent py-1.5 text-[14.5px] leading-[22px] outline-none"
            onChange={(event) => {
              setText(event.target.value);
              event.target.style.height = "auto";
              event.target.style.height = `${Math.min(event.target.scrollHeight, 144)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(text);
              }
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void send(text);
              }
            }}
          />
          <button
            type="button"
            data-testid="composer-mic"
            aria-label={listening ? "Stop dictation" : "Start dictation"}
            className={cn("grid size-8 place-items-center rounded-full", listening && "ring-2 ring-accent")}
            onClick={toggleMic}
          >
            <Mic className="size-5" strokeWidth={1.75} />
          </button>
          <button
            type={streaming ? "button" : "submit"}
            data-testid={streaming ? "composer-stop" : "composer-send"}
            aria-label={streaming ? "Stop generating" : "Send"}
            aria-disabled={!streaming && text.trim().length === 0 && files.length === 0}
            disabled={!streaming && text.trim().length === 0 && files.length === 0}
            className="grid size-11 place-items-center rounded-full bg-accent text-accent-foreground disabled:opacity-40 sm:size-9"
            onClick={() => {
              if (streaming) abortRef.current?.abort();
              else void send(text);
            }}
          >
            {streaming ? <Square className="size-2.5 fill-current" /> : <ArrowUp className="size-4" strokeWidth={1.75} />}
          </button>
        </div>
        {listening && !reduced ? (
          <span className="mt-1 flex h-4 items-end gap-0.5" aria-hidden>
            <span className="phase-dot h-2 w-0.5 bg-accent" />
            <span className="phase-dot h-3 w-0.5 bg-accent" />
            <span className="phase-dot h-2 w-0.5 bg-accent" />
          </span>
        ) : null}
        <p className="mt-1.5 text-[11.5px] leading-4 text-muted-foreground">
          AI assistant · Portfolio demo ·{" "}
          <a href="#privacy" className="underline underline-offset-2">Privacy</a>
          {" · "}
          <button type="button" className="underline underline-offset-2" onClick={() => void send("Talk to a person at dispatch.")}>
            Talk to a person
          </button>
        </p>
        <p id="privacy" className="text-[11px] leading-4 text-muted-foreground">{DISCLAIMER}</p>
      </div>
      <div className="sr-only" role="status" aria-live="polite">{status}</div>
      {toast ? <p role="alert" className="absolute bottom-24 left-3 right-3 rounded-xl bg-foreground px-3 py-2 text-[13px] text-background">{toast}</p> : null}
    </section>
  );
}

function greeting(): UiMessage {
  return {
    id: "greeting",
    role: "assistant",
    text: GREETING,
    parts: [],
    createdAt: "greeting",
    engine: "guided",
  };
}

function EmptyState({ disabled, onSend }: { disabled: boolean; onSend: (text: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-[14.5px] leading-[22px]">{GREETING}</p>
      <div className="flex flex-wrap gap-2">
        {STARTER_PROMPTS.map((prompt) => {
          const Icon = ICONS[prompt.icon];
          return (
            <button
              key={prompt.id}
              type="button"
              data-testid={`starter-${prompt.id}`}
              disabled={disabled}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-left text-[13px] font-medium hover:bg-accent-soft disabled:opacity-40"
              onClick={() => onSend(prompt.text)}
            >
              <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
              <span>{prompt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function followUps(message: UiMessage): string[] {
  if (message.suggestions?.length) return message.suggestions.slice(0, 3);
  const types = new Set(message.parts.map((part) => part.type));
  if (types.has("handoff")) return ["I left the house", "Call me back", "Talk to a person"];
  if (types.has("booking")) return ["Look up my visit", "Move this visit", "That's everything"];
  if (types.has("slots")) return ["Book the earliest window", "What is the diagnostic fee?", "Talk to a person"];
  if (types.has("quote")) return ["Show open times", "Do you offer financing?", "Talk to a person"];
  if (types.has("citations")) return ["Price a repair", "Check a ZIP", "Talk to a person"];
  return ["Price a repair", "Book a tech", "Talk to a person"];
}

function MessageTurn({
  message,
  seen,
  disabled,
  feedback,
  copied,
  onSelectSlot,
  onBook,
  onCancel,
  onReschedule,
  onSuggest,
  onCopy,
  onFeedback,
  onRetry,
}: {
  message: UiMessage;
  seen: boolean;
  disabled: boolean;
  feedback?: "up" | "down";
  copied: boolean;
  onSelectSlot: (slot: Slot) => void;
  onBook: (input: { slotId: string; name: string; phone: string; address: string; issue?: string }) => void;
  onCancel: (code: string) => void;
  onReschedule: (code: string) => void;
  onSuggest: (text: string) => void;
  onCopy: () => void;
  onFeedback: (value: "up" | "down") => void;
  onRetry: () => void;
}) {
  const mine = message.role === "user";
  const human = message.speaker === "human";
  const time = message.createdAt === "greeting" ? "" : formatClock(message.createdAt);
  const label = mine ? `You, ${time}` : `${human ? DESK.humanName : DESK.botName}, ${time}`;
  const short = !mine && message.text.length > 0 && message.text.length < 80 && message.parts.length === 0;
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      data-testid={mine ? "message-user" : "message-assistant"}
      aria-label={label}
      aria-busy={message.streaming ? true : undefined}
      className={mine ? "ml-auto flex max-w-[82%] flex-col items-end" : "mr-1 max-w-full"}
    >
      {mine ? (
        <div>
          {message.attachments?.map((file) => (
            file.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={file.id} src={file.url} alt={file.name} className="mb-1 h-16 rounded-xl object-cover" />
            ) : <span key={file.id} className="mb-1 block text-[11px]">{file.name}</span>
          ))}
          <p className="rounded-[18px] rounded-br-[4px] bg-accent px-3 py-2 text-[14.5px] leading-[22px] text-accent-foreground">{message.text}</p>
        </div>
      ) : (
        <div className={cn("space-y-3", human || short ? "max-w-[90%] rounded-[18px] rounded-bl-[4px] bg-surface-2 px-3 py-2" : "")}>
          <div
            className="text-[14.5px] leading-[22px]"
            data-testid="assistant-text"
            data-streaming={message.streaming ? "true" : undefined}
          >
            {message.text ? <Markdown text={message.text} /> : null}
          </div>
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
        </div>
      )}
      {message.stopped ? <p className="mt-1 text-[11.5px] text-muted-foreground">Stopped</p> : null}
      {seen ? (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className="grid size-3.5 place-items-center rounded-full bg-muted text-[8px]">RC</span>
          Seen
        </p>
      ) : null}
      <time dateTime={message.createdAt} className="sr-only">{time}</time>
      {message.tools && message.tools.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {message.tools.map((tool, index) => (
            <li key={`${tool.name}-${index}`} className="flex items-center justify-between rounded-xl border border-border px-2 py-1.5 text-[12px]">
              <span>{tool.name}</span>
              <span className="rounded-full bg-success/15 px-2 text-[11px] text-success">Done</span>
            </li>
          ))}
        </ul>
      ) : null}
      {!mine && !message.streaming && message.text ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {followUps(message).map((suggestion) => (
            <button key={suggestion} type="button" data-testid="follow-up" disabled={disabled} title={suggestion} className="min-h-8 rounded-full border border-border bg-surface px-3 text-[13px] font-medium disabled:opacity-40" onClick={() => onSuggest(suggestion)}>
              {suggestion.length > 28 ? `${suggestion.slice(0, 28)}…` : suggestion}
            </button>
          ))}
        </div>
      ) : null}
      {!mine && !message.streaming && message.id !== "greeting" ? (
        <div className="mt-1 flex flex-wrap gap-1">
          <LabeledAction label={copied ? "Copied" : "Copy"} onClick={onCopy}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" strokeWidth={1.75} />}</LabeledAction>
          <LabeledAction label="Regenerate" onClick={onRetry}><RefreshCw className="size-3.5" strokeWidth={1.75} /></LabeledAction>
          <LabeledAction label="Good" pressed={feedback === "up"} onClick={() => onFeedback("up")}><ThumbsUp className="size-3.5" strokeWidth={1.75} /></LabeledAction>
          <LabeledAction label="Bad" pressed={feedback === "down"} onClick={() => onFeedback("down")}><ThumbsDown className="size-3.5" strokeWidth={1.75} /></LabeledAction>
          {message.parts.some((part) => part.type === "citations") ? (
            <LabeledAction
              label="Sources"
              onClick={(event) => {
                const chip = (event.currentTarget.closest("article") as HTMLElement | null)?.querySelector<HTMLButtonElement>("[data-testid=citation-chip]");
                chip?.focus();
              }}
            >
              <span className="text-[11px] font-semibold">Src</span>
            </LabeledAction>
          ) : null}
        </div>
      ) : null}
    </motion.article>
  );
}

function CardSkeleton() {
  return (
    <div className="h-40 rounded-[var(--radius-card)] border border-border p-3" aria-hidden>
      <div className="skeleton-bar h-3 w-1/3 rounded" />
      <div className="skeleton-bar mt-3 h-3 w-full rounded" />
      <div className="skeleton-bar mt-2 h-3 w-4/5 rounded" />
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 7 }, (_, index) => <div key={index} className="skeleton-bar size-10 rounded-full" />)}
      </div>
    </div>
  );
}

function LabeledAction({
  label,
  onClick,
  children,
  pressed,
}: {
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-[11.5px] text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function IconButton({
  label,
  onClick,
  children,
  testid,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  testid?: string;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      data-testid={testid}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full text-foreground hover:bg-muted"
    >
      {children}
    </button>
  );
}

function formatClock(iso: string): string {
  const frozen = typeof document !== "undefined" && document.documentElement.dataset.visualTest === "true";
  const date = frozen ? new Date("2026-11-25T18:00:00.000Z") : new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

type SpeechSession = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

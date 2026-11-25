"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { ChatApp } from "@/components/chat/chat-app";
import { EquipmentCarousel, QuoteCard } from "@/components/chat/cards";
import { BRAND, DISCLAIMER, METRICS } from "@/lib/brand";
import { getQuote } from "@/lib/quote";
import { STARTER_PROMPTS } from "@/lib/prompts";

const quote = getQuote({ serviceType: "ac_repair", homeSqft: 2200, systemAge: 12, urgency: "soon" });

const DOES = [
  "Answers after hours, with the guides cited",
  "Prices a sample visit range from the board",
  "Offers only the open arrival windows",
  "Books the visit onto the dispatch board",
  "Hands gas and CO calls to a person",
];

const WONT = [
  "Invent a price that is not in the guide",
  "Give medical, legal, or financial advice",
  "Pretend to be a human technician",
  "Promise an arrival time that is not on the board",
];

export function LandingView() {
  const [frame, setFrame] = useState<"desktop" | "phone">("desktop");
  const [toast, setToast] = useState<{ kind: string; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const snippet = `<script src="https://${BRAND.subdomain}.quvantic.com/widget.js" data-title="Chat with Northwind" async></script>`;

  useEffect(() => {
    function onOps(event: Event) {
      const detail = (event as CustomEvent<{ kind: string; text: string }>).detail;
      if (!detail?.text) return;
      setToast(detail);
      window.setTimeout(() => setToast(null), 6000);
    }
    window.addEventListener("northwind-ops", onOps);
    return () => window.removeEventListener("northwind-ops", onOps);
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      {toast ? (
        <div data-testid="ops-toast" role="status" className="fixed top-20 right-4 z-40 max-w-sm rounded-2xl border border-border bg-surface p-3 text-sm shadow-[var(--shadow-widget)]">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{toast.kind === "urgent" ? "Text to the on-call phone" : "Desk alert"}</p>
          <p className="mt-1 font-medium">{toast.text}</p>
        </div>
      ) : null}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <p className="text-sm tracking-wide text-accent uppercase">Austin heating and air</p>
          <h1 className="font-display mt-3 max-w-xl text-5xl leading-[1.05] font-medium tracking-tight sm:text-6xl">
            A desk that can <em className="italic">quote</em> the visit and put it on the board.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-7 text-muted-foreground">
            Northwind Comfort is a fictional shop. The chat retrieves the guides, calls the same tools a live model would, and shows the booking on a dispatch board. With no API key it still runs, on purpose.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="inline-flex h-11 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground" onClick={() => window.dispatchEvent(new CustomEvent("northwind-open"))}>
              Chat now
            </button>
            <Link href="/embed-demo" className="inline-flex h-11 items-center rounded-full border border-border px-4 text-sm font-medium">See the embed</Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Fictional Austin shop · estimates are not bids · {BRAND.phoneDisplay}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="text-[12px] text-muted-foreground">Try asking</span>
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                data-testid="try-asking"
                className="min-h-9 rounded-full border border-border bg-surface px-3 text-[13px] font-medium"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("northwind-open"));
                  window.setTimeout(() => {
                    window.dispatchEvent(new CustomEvent("northwind-ask", { detail: { text: prompt.text, target: "widget" } }));
                  }, 80);
                }}
              >
                {prompt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 flex justify-end gap-1">
            <button type="button" aria-pressed={frame === "desktop"} className="rounded-full border border-border px-3 py-1 text-[12px]" onClick={() => setFrame("desktop")}>Desktop</button>
            <button type="button" aria-pressed={frame === "phone"} className="rounded-full border border-border px-3 py-1 text-[12px]" onClick={() => setFrame("phone")}>Phone</button>
          </div>
          <div data-testid="landing-hero-chat" className={frame === "phone" ? "mx-auto w-[320px] rounded-[28px] border border-border p-2" : ""}>
            <ChatApp variant="hero" storageKey="northwind-hero" />
          </div>
        </div>
      </div>

      <section data-testid="metrics-strip" className="mt-12 grid grid-cols-2 gap-4 border-y border-border py-6 sm:grid-cols-4">
        {METRICS.map((item) => (
          <div key={item.label}>
            <p className="text-[12px] text-muted-foreground">{item.label}</p>
            <p className="text-[28px] font-semibold tracking-tight">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">What it does</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {DOES.map((item) => (
                <li key={item} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={1.75} />{item}</li>
              ))}
            </ul>
          </article>
          <article className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">What it won&apos;t do</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {WONT.map((item) => (
                <li key={item} className="flex items-start justify-between gap-3">
                  <span className="flex gap-2"><X className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={1.75} />{item}</span>
                  <span className="text-[11px] text-muted-foreground">Never</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
        <QuoteCard quote={quote} frozen />
      </section>

      <section id="how" className="mt-12" aria-label="Architecture diagram">
        <h2 className="font-display text-3xl font-medium tracking-tight">How it works</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["Channel", "Web chat, widget, WhatsApp, Messenger"],
            ["Retrieve", "25 markdown guides, BM25 plus a local hash embedding"],
            ["Tools", "Quote, slots, book, lookup, and emergency dispatch"],
            ["Desk", "Bookings, leads, and handoff tickets"],
          ].map(([title, body], index) => (
            <article key={title} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
              <p className="text-[12px] text-muted-foreground">0{index + 1}</p>
              <h3 className="mt-1 text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-3xl font-medium">The cards</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">The same components the chat renders, frozen here so you can see them without starting a visit.</p>
        <div className="mt-4">
          <EquipmentCarousel />
        </div>
      </section>

      <section className="mt-12 rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold">Embed snippet</h2>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-muted p-3 font-mono text-xs">{snippet}</pre>
        <button
          type="button"
          className="mt-3 text-sm font-medium underline"
          onClick={() => {
            void navigator.clipboard.writeText(snippet);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <p className="mt-3 text-xs text-muted-foreground">{DISCLAIMER}</p>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BrandMark } from "@/components/brand-mark";
import { ChatApp } from "@/components/chat/chat-app";
import { NUDGE_PROMPTS } from "@/lib/prompts";
import { TEASER } from "@/lib/brand";

const NUDGE_KEY = "northwind-nudges-dismissed";
const TEASER_KEY = "northwind-teaser-dismissed";

export function SiteLauncher() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [pills, setPills] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hide = pathname === "/chat" || pathname === "/embed-demo" || pathname === "/widget";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
      if (sessionStorage.getItem(NUDGE_KEY) !== "1") setPills(pathname === "/" || pathname === "/embed-demo");
    }, 0);
    const pillsTimer = window.setTimeout(() => {
      if (sessionStorage.getItem(NUDGE_KEY) !== "1") setPills(true);
    }, pathname === "/" ? 0 : 1200);
    const teaserTimer = window.setTimeout(() => {
      const visual = document.documentElement.dataset.visualTest === "true";
      if (localStorage.getItem(TEASER_KEY) !== "1" && (pathname === "/" || visual)) setTeaser(true);
    }, reduced ? 0 : 4000);
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("northwind-open", onOpen);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(pillsTimer);
      window.clearTimeout(teaserTimer);
      window.removeEventListener("northwind-open", onOpen);
    };
  }, [pathname, reduced]);

  if (hide || !mounted) return null;

  function ask(text: string) {
    setOpen(true);
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("northwind-ask", { detail: { text, target: "widget" } }));
    }, 350);
  }

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label="Northwind chat"
            initial={reduced ? false : { opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            id="northwind-overlay-chat"
            className="chat-widget-shell fixed z-[2147483000] max-sm:inset-0 max-sm:h-dvh max-sm:w-dvw max-sm:rounded-none max-sm:shadow-none sm:right-6 sm:bottom-[100px] sm:h-[min(680px,calc(100dvh-124px))] sm:w-[400px]"
            style={{ transformOrigin: "bottom right" }}
          >
            <ChatApp variant="overlay" autoFocus storageKey="northwind-overlay" onClose={() => setOpen(false)} />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className={open ? "max-sm:hidden" : ""}>
        {pills && !open ? (
          <div className="fixed right-4 bottom-[88px] z-[2147483000] flex flex-col items-end gap-3 sm:right-6 sm:bottom-[100px]">
            <button
              type="button"
              aria-label="Dismiss suggestions"
              className="grid size-6 place-items-center rounded-full border border-border bg-surface text-foreground"
              onClick={() => {
                sessionStorage.setItem(NUDGE_KEY, "1");
                setPills(false);
              }}
            >
              <X className="size-3.5" />
            </button>
            {NUDGE_PROMPTS.map((prompt, index) => (
              <motion.button
                key={prompt.id}
                type="button"
                data-testid="launcher-nudge"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : index * 0.07, duration: reduced ? 0 : 0.22 }}
                className="nudge-pill h-9 px-3.5 text-[13px] font-medium"
                onClick={() => ask(prompt.text)}
              >
                {prompt.label}
              </motion.button>
            ))}
          </div>
        ) : null}
        {teaser && !open ? (
          <div data-testid="launcher-teaser" className="fixed right-[88px] bottom-6 z-[2147483000] hidden max-w-[240px] items-start gap-2 rounded-2xl border border-border bg-surface px-3 py-2 text-[13px] shadow-[var(--shadow-card)] sm:flex">
            <button type="button" className="text-left" onClick={() => ask("The furnace is not heating. The house is 1,800 sq ft in 78704 and the system is 14 years old.")}>
              {TEASER}
            </button>
            <button
              type="button"
              aria-label="Dismiss teaser"
              onClick={() => {
                localStorage.setItem(TEASER_KEY, "1");
                setTeaser(false);
              }}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}
        <button
          type="button"
          data-testid="chat-launcher"
          aria-label={open ? "Close chat" : "Open chat with Ava"}
          aria-expanded={open}
          aria-controls="northwind-overlay-chat"
          className="fixed right-4 bottom-4 z-[2147483000] grid size-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-[var(--shadow-launcher)] ring-offset-2 hover:scale-105 focus-visible:ring-3 active:scale-95 sm:right-6 sm:bottom-6 sm:size-[60px]"
          style={{ boxShadow: "var(--shadow-launcher), inset 0 1px 0 rgba(255,255,255,0.25)" }}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-[22px]" strokeWidth={2} /> : <BrandMark className="size-[22px]" strokeWidth={2} />}
        </button>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { BrandMark } from "@/components/brand-mark";
import { BRAND } from "@/lib/brand";
import { cn } from "cn";

export function SiteHeader() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header className={cn("sticky top-0 z-30 h-16 border-b border-transparent", scrolled && "border-border bg-background/80 backdrop-blur-md")}>
      <div className="mx-auto flex h-full max-w-6xl items-center gap-3 px-4 lg:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 place-items-center rounded-full bg-accent text-accent-foreground">
            <BrandMark className="size-5" strokeWidth={2} />
          </span>
          <span className="truncate text-sm font-semibold tracking-tight">Northwind Comfort</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Nav href="/#how" current={false}>How it works</Nav>
          <Nav href="/chat" current={pathname === "/chat"}>Live chat</Nav>
          <Nav href="/admin" current={pathname.startsWith("/admin")}>Admin</Nav>
          <Nav href="/embed-demo" current={pathname === "/embed-demo"}>Embed</Nav>
          <button
            type="button"
            aria-label="Theme"
            data-testid="theme-toggle"
            className="grid size-9 place-items-center rounded-full hover:bg-muted"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {mounted && resolvedTheme === "dark" ? <Sun className="size-4" strokeWidth={1.75} /> : <Moon className="size-4" strokeWidth={1.75} />}
          </button>
          <button
            type="button"
            className="hidden h-9 items-center rounded-full bg-accent px-3 text-[13px] font-medium text-accent-foreground sm:inline-flex"
            onClick={() => window.dispatchEvent(new CustomEvent("northwind-open"))}
          >
            Open the desk
          </button>
          <a href={`tel:${BRAND.phoneTel}`} className="hidden text-xs text-muted-foreground lg:inline">{BRAND.phoneDisplay}</a>
        </nav>
      </div>
    </header>
  );
}

function Nav({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={current ? "page" : undefined} className={cn("hidden rounded-full px-3 py-1.5 sm:inline", current ? "bg-accent-soft" : "hover:bg-muted")}>
      {children}
    </Link>
  );
}

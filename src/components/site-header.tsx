"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@/lib/brand";
import { cn } from "cn";

export function SiteHeader() {
  const pathname = usePathname();
  const chat = pathname === "/chat" || pathname === "/widget";
  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 lg:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground" aria-hidden>
            <Mark />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-heading text-lg leading-none tracking-tight">Northwind Comfort</span>
            <span className="mt-1 block text-xs text-muted-foreground">Heating &amp; Air · Austin</span>
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/" className={cn("rounded-full px-3 py-1.5", pathname === "/" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted")} aria-current={pathname === "/" ? "page" : undefined}>
            Home
          </Link>
          <Link href="/chat" className={cn("rounded-full px-3 py-1.5", chat ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted")} aria-current={chat ? "page" : undefined}>
            Chat
          </Link>
          <Link href="/embed-demo" className={cn("hidden rounded-full px-3 py-1.5 sm:inline", pathname === "/embed-demo" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted")}>
            Widget
          </Link>
          <Link href="/admin" className={cn("rounded-full px-3 py-1.5", pathname.startsWith("/admin") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted")} aria-current={pathname.startsWith("/admin") ? "page" : undefined}>
            Board
          </Link>
          <a href={`tel:${BRAND.phoneTel}`} className="hidden rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted sm:inline">
            {BRAND.phoneDisplay}
          </a>
        </nav>
      </div>
    </header>
  );
}

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="size-6" fill="none">
      <path d="M5 22c4.2-7 6.2-7 11 0s6.8 7 11 0" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="11" r="3.2" fill="#e7a27a" />
    </svg>
  );
}

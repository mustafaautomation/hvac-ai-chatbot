import type { Metadata } from "next";
import Script from "next/script";
import { DISCLAIMER } from "@/lib/brand";

export const metadata: Metadata = { title: "Widget on a sample site" };

export default function EmbedDemoPage() {
  return (
    <div>
      <div className="border-b border-accent/40 bg-accent-soft px-4 py-2 text-center text-[13px]">
        This is how the embed looks on a real site. The banner is the demo chrome, not the host page. {DISCLAIMER}
      </div>
      <article className="mx-auto w-full max-w-3xl px-4 py-10">
        <p className="text-sm text-muted-foreground">Barton Hills notes · a host page</p>
        <h1 className="font-display mt-2 text-4xl leading-tight font-medium tracking-tight">The porch, before the heat arrives</h1>
        <p className="mt-4 text-muted-foreground">
          Shade, limestone, and a ceiling fan. This article is filler for someone else’s website. The copper launcher in the corner is Northwind, loaded from one script tag.
        </p>
        <p className="mt-4 text-muted-foreground">
          Open it and ask what the Comfort Club includes. You should see a cited answer and follow-up chips. On a phone the panel fills the screen.
        </p>
      </article>
      <Script src="/widget.js" data-title="Chat with Northwind" strategy="afterInteractive" />
    </div>
  );
}

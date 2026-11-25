import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = { title: "Widget on a sample site" };

export default function EmbedDemoPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="text-sm text-muted-foreground">Sample host site · not Northwind</p>
      <h1 className="mt-2 font-heading text-4xl tracking-tight">The Barton Hills porch, before the heat arrives</h1>
      <p className="mt-4 text-muted-foreground">
        This page is a stand-in for someone else’s website. The copper bubble in the corner is the Northwind widget, loaded from a single script tag. It opens an iframe of the same desk as the full chat.
      </p>
      <p className="mt-4 text-muted-foreground">
        The article itself is filler about shade, limestone, and a ceiling fan. The widget is the product. Open it, ask what the Comfort Club includes, and you should see a cited answer. On a phone the panel fills the screen.
      </p>
      <Script src="/widget.js" data-title="Chat with Northwind" strategy="afterInteractive" />
    </div>
  );
}

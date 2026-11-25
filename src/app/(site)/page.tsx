import Link from "next/link";
import { BRAND, DISCLAIMER } from "@/lib/brand";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-6">
      <p className="text-sm tracking-wide text-primary uppercase">Austin heating and air · {BRAND.subdomain}</p>
      <h1 className="mt-2 max-w-3xl font-heading text-4xl tracking-tight sm:text-6xl">
        A desk that can quote the visit and put it on the board.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Northwind Comfort is a fictional shop. The chat retrieves the guides, calls the same tools a live model would, and shows the booking on a dispatch board. With no API key it still runs, on purpose.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/chat">Open the chat</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/embed-demo">See the website widget</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/admin">Dispatch board</Link>
        </Button>
      </div>

      <section className="mt-12 grid gap-4 lg:grid-cols-3">
        {[
          ["Describe the problem", "No cooling, a frozen coil, or a heat-pump price. The desk stays inside heating and air."],
          ["See the range and a window", "Quotes are itemized sample ranges. Slots are real rows on the demo calendar."],
          ["Hand off the dangerous calls", "Gas and carbon monoxide skip the troubleshooting and open a ticket. So does “I don’t know.”"],
        ].map(([title, body]) => (
          <article key={title} className="rounded-3xl border border-border bg-card p-5">
            <h2 className="font-heading text-2xl">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="font-heading text-3xl">What’s under the hood</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          One core agent. The website, the widget iframe, WhatsApp, and Messenger all call it. Groq is first when a free key is set. Gemini is the fallback. Neither key is required.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-4" aria-label="Architecture diagram">
          {[
            ["Channels", "Web chat, widget iframe, WhatsApp, Messenger"],
            ["Agent", "Guardrails, then Groq or Gemini, else the guided desk"],
            ["Knowledge", "24 markdown guides, BM25 plus a local hash embedding"],
            ["Board", "Bookings, leads, conversations, and handoff tickets"],
          ].map(([title, body], index) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">0{index + 1}</p>
              <h3 className="mt-1 font-heading text-xl">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-3xl border border-border bg-card p-5">
        <h2 className="font-heading text-2xl">Embed snippet</h2>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-muted p-3 text-xs">{`<script src="https://${BRAND.subdomain}.quvantic.com/widget.js" data-title="Chat with Northwind" async></script>`}</pre>
        <p className="mt-3 text-xs text-muted-foreground">{DISCLAIMER}</p>
      </section>
    </div>
  );
}

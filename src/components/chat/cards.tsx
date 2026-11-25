"use client";

import { useState } from "react";
import { SAMPLE_CUSTOMER } from "@/lib/brand";
import { formatPhone, moneyRange } from "@/lib/format";
import { SERVICE_LABELS, type ChatPart, type Slot } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PartView({
  part,
  disabled,
  onSelectSlot,
  onBook,
  onCancel,
  onReschedule,
}: {
  part: ChatPart;
  disabled?: boolean;
  onSelectSlot: (slot: Slot) => void;
  onBook: (input: { slotId: string; name: string; phone: string; address: string; issue?: string }) => void;
  onCancel: (code: string) => void;
  onReschedule: (code: string) => void;
}) {
  if (part.type === "troubleshooting") {
    return (
      <article className="rounded-2xl border border-border bg-accent/40 p-4">
        <h3 className="font-heading text-lg leading-tight">{part.guide.title}</h3>
        <ol className="mt-3 space-y-3">
          {part.guide.steps.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[1.5rem_1fr] gap-2 text-sm">
              <span className="font-heading text-primary">{index + 1}</span>
              <span>
                <span className="font-medium">{step.title}</span>
                <span className="mt-0.5 block text-muted-foreground">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-destructive">{part.guide.stopIf}</p>
      </article>
    );
  }

  if (part.type === "quote") {
    const quote = part.quote;
    return (
      <article className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-heading text-lg leading-tight">{quote.serviceLabel}</h3>
            <p className="text-sm text-muted-foreground">
              {quote.homeSqft.toLocaleString()} sq ft · {quote.systemAge} years · {quote.urgency}
            </p>
          </div>
          <p className="font-heading text-2xl tracking-tight">{moneyRange(quote.totalLow, quote.totalHigh)}</p>
        </div>
        <ul className="mt-3 divide-y divide-border text-sm">
          {quote.items.map((item) => (
            <li key={item.label} className="grid gap-1 py-2 sm:grid-cols-[1fr_auto] sm:gap-3">
              <span>
                <span className="font-medium">{item.label}</span>
                {item.note ? <span className="mt-0.5 block text-muted-foreground">{item.note}</span> : null}
              </span>
              <span className="tabular-nums sm:text-right">{moneyRange(item.low, item.high)}</span>
            </li>
          ))}
        </ul>
        {quote.financingNote ? <p className="mt-2 text-sm text-muted-foreground">{quote.financingNote}</p> : null}
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {quote.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">Range good for {quote.validForDays} days in this demo.</p>
      </article>
    );
  }

  if (part.type === "slots") {
    return (
      <article className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-heading text-lg">Arrival windows</h3>
        <p className="text-sm text-muted-foreground">
          {SERVICE_LABELS[part.serviceType]} · America/Chicago
          {part.note ? ` · ${part.note}` : ""}
        </p>
        {part.slots.length === 0 ? (
          <p className="mt-3 text-sm">No open windows in the next stretch. Ask for a callback and the board will show the lead.</p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {part.slots.map((slot) => (
              <Button
                key={slot.id}
                type="button"
                variant={slot.window === "priority" ? "default" : "outline"}
                className="h-auto justify-start px-3 py-2 text-left whitespace-normal"
                disabled={disabled}
                onClick={() => onSelectSlot(slot)}
              >
                {slot.label}
              </Button>
            ))}
          </div>
        )}
      </article>
    );
  }

  if (part.type === "booking_form") {
    return (
      <BookingForm
        slot={part.slot}
        issue={part.issue}
        defaults={part.defaults}
        disabled={disabled}
        onBook={onBook}
      />
    );
  }

  if (part.type === "booking") {
    const booking = part.booking;
    return (
      <article className="rounded-2xl border border-secondary/30 bg-secondary p-4 text-secondary-foreground">
        <p className="text-xs tracking-wide uppercase opacity-80">On the board</p>
        <h3 className="mt-1 font-heading text-3xl tracking-tight">{booking.confirmationCode}</h3>
        <p className="mt-2 text-sm">{booking.slotLabel}</p>
        <p className="text-sm opacity-90">{booking.address}</p>
        <p className="mt-1 text-sm opacity-90">
          {booking.name} · {booking.phone}
        </p>
        <p className="mt-2 text-sm">{booking.issue}</p>
        {booking.tripFee > 0 ? <p className="mt-2 text-sm">Trip fee ${booking.tripFee} for {booking.zip}.</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" className="bg-card text-foreground hover:bg-card/80" disabled={disabled} onClick={() => onReschedule(booking.confirmationCode)}>
            Move this visit
          </Button>
          <Button type="button" variant="outline" className="border-secondary-foreground/30 bg-transparent text-secondary-foreground hover:bg-secondary-foreground/10" disabled={disabled} onClick={() => onCancel(booking.confirmationCode)}>
            Cancel visit
          </Button>
        </div>
      </article>
    );
  }

  if (part.type === "appointments") {
    return (
      <article className="space-y-2">
        {part.bookings.map((booking) => (
          <div key={booking.id} className="rounded-2xl border border-border bg-card p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-heading text-lg">{booking.confirmationCode}</span>
              <Badge variant="outline">{booking.status}</Badge>
            </div>
            <p className="mt-1">{booking.name} · {SERVICE_LABELS[booking.serviceType]}</p>
            <p className="text-muted-foreground">{booking.slotLabel}</p>
            <p className="text-muted-foreground">{booking.address}</p>
          </div>
        ))}
      </article>
    );
  }

  if (part.type === "service_area") {
    const area = part.result;
    return (
      <article className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-lg">{area.zip}</h3>
          <Badge variant={area.inArea ? "secondary" : "destructive"}>{area.zone}</Badge>
        </div>
        <p className="mt-1 text-sm">{area.neighborhood}</p>
        <p className="mt-2 text-sm text-muted-foreground">{area.message}</p>
      </article>
    );
  }

  if (part.type === "citations") {
    return (
      <aside className="rounded-2xl border border-dashed border-border p-3">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">From the guides</p>
        <ul className="mt-2 space-y-2">
          {part.sources.map((source) => (
            <li key={source.id} className="text-sm">
              <span className="font-medium">{source.title}</span>
              <span className="text-muted-foreground"> · {source.section}</span>
              <span className="mt-0.5 block text-muted-foreground">{source.excerpt}</span>
            </li>
          ))}
        </ul>
      </aside>
    );
  }

  if (part.type === "handoff") {
    const safety = part.tone === "safety";
    return (
      <article
        role={safety ? "alert" : "status"}
        className={safety ? "rounded-2xl border border-destructive/40 bg-destructive p-4 text-white" : "rounded-2xl border border-border bg-card p-4"}
      >
        <p className="text-xs tracking-wide uppercase opacity-80">{safety ? "Immediate handoff" : "Coordinator"}</p>
        <h3 className="mt-1 font-heading text-2xl">{part.handoff.reference}</h3>
        <p className="mt-2 text-sm">{part.handoff.safetyMessage || part.handoff.summary}</p>
        {safety ? (
          <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm">
            <li>Get everyone outside, including pets.</li>
            <li>Do not look for the problem or reset equipment.</li>
            <li>Call 911 from outside.</li>
          </ol>
        ) : null}
      </article>
    );
  }

  if (part.type === "notice") {
    return (
      <article className={part.tone === "warn" ? "rounded-2xl border border-destructive/30 bg-destructive/10 p-4" : "rounded-2xl border border-border bg-muted/60 p-4"}>
        <h3 className="font-medium">{part.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{part.body}</p>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm" role="alert">
      {part.text}
    </article>
  );
}

function BookingForm({
  slot,
  issue,
  defaults,
  disabled,
  onBook,
}: {
  slot: Slot;
  issue: string;
  defaults: { name?: string; phone?: string; address?: string };
  disabled?: boolean;
  onBook: (input: { slotId: string; name: string; phone: string; address: string; issue?: string }) => void;
}) {
  const [name, setName] = useState(defaults.name ?? "");
  const [phone, setPhone] = useState(defaults.phone ?? "");
  const [address, setAddress] = useState(defaults.address ?? "");
  const [error, setError] = useState("");

  return (
    <form
      className="rounded-2xl border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim().length < 2 || phone.trim().length < 7 || address.trim().length < 8) {
          setError("Add a name, a phone number, and a street address with ZIP.");
          return;
        }
        setError("");
        onBook({ slotId: slot.id, name: name.trim(), phone: phone.trim(), address: address.trim(), issue });
      }}
    >
      <h3 className="font-heading text-lg">Hold {slot.label}</h3>
      <p className="text-sm text-muted-foreground">{issue}</p>
      <div className="mt-3 grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`name-${slot.id}`}>Name</Label>
          <Input id={`name-${slot.id}`} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="h-10" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`phone-${slot.id}`}>Mobile</Label>
          <Input id={`phone-${slot.id}`} value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" inputMode="tel" className="h-10" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`address-${slot.id}`}>Address and ZIP</Label>
          <Input id={`address-${slot.id}`} value={address} onChange={(event) => setAddress(event.target.value)} autoComplete="street-address" className="h-10" />
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="submit" disabled={disabled}>Confirm visit</Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => {
            setName(SAMPLE_CUSTOMER.name);
            setPhone(formatPhone(SAMPLE_CUSTOMER.phone));
            setAddress(SAMPLE_CUSTOMER.address);
            setError("");
          }}
        >
          Use sample customer
        </Button>
      </div>
    </form>
  );
}

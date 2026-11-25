"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Snowflake,
  Thermometer,
  Wind,
} from "lucide-react";
import { SAMPLE_CUSTOMER } from "@/lib/brand";
import { formatPhone, moneyRange } from "@/lib/format";
import { SERVICE_LABELS, type Booking, type ChatPart, type Citation, type Quote, type Slot } from "@/lib/types";
import { cn } from "cn";

const EQUIPMENT = [
  { id: "furnace", title: "Furnace", meta: "Cold-snap heat", badge: "Winter", icon: Thermometer },
  { id: "heat-pump", title: "Heat pump", meta: "Heat and cool, one system", badge: "Recommended", icon: Wind },
  { id: "ac", title: "Central AC", meta: "Austin cooling season", badge: "On the truck", icon: Snowflake },
] as const;

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
    return <CheckListCard title={part.guide.title} steps={part.guide.steps} stopIf={part.guide.stopIf} />;
  }

  if (part.type === "quote") {
    return (
      <div className="space-y-3">
        <QuoteCard quote={part.quote} />
        {part.quote.serviceType === "heat_pump" || part.quote.serviceType === "furnace_install" || part.quote.serviceType === "ac_install" ? (
          <EquipmentCarousel />
        ) : null}
      </div>
    );
  }

  if (part.type === "slots") {
    return (
      <SlotPicker
        slots={part.slots}
        serviceLabel={SERVICE_LABELS[part.serviceType]}
        note={part.note}
        disabled={disabled}
        onSelectSlot={onSelectSlot}
      />
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
    return <ConfirmCard booking={part.booking} disabled={disabled} onCancel={onCancel} onReschedule={onReschedule} />;
  }

  if (part.type === "appointments") {
    return <AppointmentTimeline bookings={part.bookings} />;
  }

  if (part.type === "service_area") {
    const area = part.result;
    return (
      <article className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">{area.zip}</h3>
          <span className="rounded-full border border-border px-2 py-0.5 text-[11.5px] text-muted-foreground">{area.zone}</span>
        </div>
        <p className="mt-1 text-[14.5px]">{area.neighborhood}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">{area.message}</p>
      </article>
    );
  }

  if (part.type === "citations") {
    return <CitationRow sources={part.sources} />;
  }

  if (part.type === "handoff") {
    const safety = part.tone === "safety";
    return (
      <article
        role={safety ? "alert" : "status"}
        data-testid={safety ? "card-handoff-safety" : "card-handoff"}
        className={safety
          ? "rounded-[var(--radius-card)] border border-danger bg-danger/10 p-3 text-foreground"
          : "rounded-[var(--radius-card)] border border-info/40 bg-surface p-3 shadow-[var(--shadow-card)]"}
      >
        <p className="text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase">
          {safety ? "Safety handoff" : "Dispatch desk"}
        </p>
        <h3 className="mt-1 font-mono text-[13px]">{part.handoff.reference}</h3>
        <p className="mt-2 text-[14.5px] leading-[22px]">
          {safety
            ? part.handoff.safetyMessage
            : "I'm connecting you with the Northwind desk. In this demo, the ticket appears in /admin. A specialist usually replies in a few minutes."}
        </p>
        {safety ? (
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-[13px]">
            <li>Get everyone outside, including pets.</li>
            <li>Do not look for the problem or reset equipment.</li>
            <li>Call 911 from outside.</li>
          </ol>
        ) : (
          <p className="mt-2 text-[13px] text-muted-foreground">Ticket {part.handoff.reference} is on the board.</p>
        )}
      </article>
    );
  }

  if (part.type === "notice") {
    return (
      <article className={part.tone === "warn" ? "rounded-[var(--radius-card)] border border-danger/40 bg-danger/10 p-3" : "rounded-[var(--radius-card)] border border-border bg-muted p-3"}>
        <h3 className="text-sm font-semibold">{part.title}</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">{part.body}</p>
      </article>
    );
  }

  return (
    <article className="rounded-[var(--radius-card)] border border-danger/40 bg-danger/10 p-3 text-sm" role="alert">
      {part.text}
    </article>
  );
}

export function QuoteCard({ quote, frozen = false }: { quote: Quote; frozen?: boolean }) {
  return (
    <article data-testid="card-quote" className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]">
      <header>
        <h3 className="text-sm font-semibold leading-5">{quote.serviceLabel}</h3>
        <p className="text-[11.5px] text-muted-foreground">
          {quote.homeSqft.toLocaleString()} sq ft · {quote.systemAge} years · {quote.urgency}
        </p>
      </header>
      <ul className="mt-2 text-[13px]">
        {quote.items.map((item) => (
          <li key={item.label} className="flex items-baseline justify-between gap-3 border-b border-border py-1.5 last:border-0">
            <span>
              {item.label}
              {item.note ? <span className="mt-0.5 block text-[11.5px] text-muted-foreground">{item.note}</span> : null}
            </span>
            <span className="font-mono text-[13px] tabular-nums">{moneyRange(item.low, item.high)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-border pt-2">
        <span className="text-[13px] text-muted-foreground">Range</span>
        <span className="text-lg font-semibold tracking-tight">{moneyRange(quote.totalLow, quote.totalHigh)}</span>
      </div>
      <p className="mt-2 text-[11.5px] text-muted-foreground">Sample range for this demo, not a bill.</p>
      {quote.financingNote ? <p className="mt-1 text-[11.5px] text-muted-foreground">{quote.financingNote}</p> : null}
      {frozen ? null : (
        <a href="#card-booking" className="mt-3 inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-accent px-3 text-[13px] font-medium text-accent-foreground">
          Book this visit
        </a>
      )}
    </article>
  );
}

export function EquipmentCarousel() {
  const scroller = useRef<HTMLDivElement>(null);
  return (
    <div data-testid="card-carousel" className="relative">
      <div ref={scroller} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
        {EQUIPMENT.map((item) => (
          <article key={item.id} className="w-[220px] shrink-0 snap-start rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)] dark:border-white/15">
            <div className="flex aspect-[16/10] items-center justify-center rounded-xl bg-accent-soft text-accent">
              <item.icon strokeWidth={1.75} className="size-8" />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-semibold">{item.title}</h3>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-foreground">{item.badge}</span>
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">{item.meta}</p>
            <button type="button" className="mt-2 min-h-11 text-[13px] font-medium text-accent underline-offset-2 hover:underline">
              View
            </button>
          </article>
        ))}
        <div className="w-4 shrink-0" aria-hidden />
      </div>
      <button
        type="button"
        aria-label="Previous equipment"
        className="absolute top-10 left-1 hidden size-7 items-center justify-center rounded-full border border-border bg-surface/90 sm:flex"
        onClick={() => scroller.current?.scrollBy({ left: -232, behavior: "smooth" })}
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        aria-label="Next equipment"
        className="absolute top-10 right-1 hidden size-7 items-center justify-center rounded-full border border-border bg-surface/90 sm:flex"
        onClick={() => scroller.current?.scrollBy({ left: 232, behavior: "smooth" })}
      >
        <ChevronRight className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function SlotPicker({
  slots,
  serviceLabel,
  note,
  disabled,
  onSelectSlot,
}: {
  slots: Slot[];
  serviceLabel: string;
  note?: string;
  disabled?: boolean;
  onSelectSlot: (slot: Slot) => void;
}) {
  const [selected, setSelected] = useState("");
  const groups = groupSlots(slots);
  const chosen = slots.find((slot) => slot.id === selected);
  return (
    <article id="card-booking" data-testid="card-booking" className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]">
      <h3 className="text-sm font-semibold">Open times</h3>
      <p className="text-[11.5px] text-muted-foreground">
        {serviceLabel} · America/Chicago{note ? ` · ${note}` : ""}
      </p>
      <p className="mt-1 text-[12px] font-medium text-success">Only times the booking system returned</p>
      {slots.length === 0 ? (
        <p className="mt-3 text-sm">No open windows in the next stretch. Ask for a callback and the board will show the lead.</p>
      ) : (
        <>
          {groups.map((group) => (
            <div key={group.label} className="mt-3">
              <p className="text-[12px] text-muted-foreground">Open times · {group.label}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.slots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    data-testid="slot-chip"
                    disabled={disabled}
                    aria-pressed={selected === slot.id}
                    aria-label={slot.label}
                    onClick={() => setSelected(slot.id)}
                    className={cn(
                      "min-h-11 rounded-xl border bg-surface px-3 text-[13px] font-medium",
                      selected === slot.id ? "border-foreground" : "border-border",
                    )}
                  >
                    {shortTime(slot)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            className="mt-3 inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-accent px-3 text-[13px] font-medium text-accent-foreground disabled:opacity-40"
            disabled={disabled || !chosen}
            onClick={() => chosen && onSelectSlot(chosen)}
          >
            {chosen ? `Book ${shortTime(chosen)}` : "Book a time"}
          </button>
        </>
      )}
    </article>
  );
}

function CheckListCard({
  title,
  steps,
  stopIf,
}: {
  title: string;
  steps: { title: string; detail: string }[];
  stopIf: string;
}) {
  const [done, setDone] = useState<boolean[]>(() => steps.map(() => false));
  return (
    <article data-testid="card-checklist" className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]">
      <h3 className="text-sm font-semibold leading-5">{title}</h3>
      <ul className="mt-2 space-y-2">
        {steps.map((step, index) => (
          <li key={step.title}>
            <label className="flex items-start gap-2 text-[14.5px] leading-[22px]">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[var(--accent)]"
                checked={done[index]}
                onChange={() => setDone((current) => current.map((value, item) => (item === index ? !value : value)))}
              />
              <span className={done[index] ? "text-muted-foreground line-through" : ""}>
                <span className="font-medium">{step.title}</span>
                <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground no-underline">{step.detail}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[13px] text-danger">{stopIf}</p>
    </article>
  );
}

export function LeadCard({
  disabled,
  onSubmit,
}: {
  disabled?: boolean;
  onSubmit: (input: { name: string; phone: string; email: string }) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      data-testid="card-lead"
      className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim().length < 2 || phone.trim().length < 7 || !email.includes("@")) {
          setError("Add a name, a phone number, and an email.");
          return;
        }
        if (!consent) {
          setError("Check the box so the desk can use these details.");
          return;
        }
        setError("");
        onSubmit({ name: name.trim(), phone: phone.trim(), email: email.trim() });
      }}
    >
      <h3 className="text-sm font-semibold">Leave your details</h3>
      <p className="text-[12px] text-muted-foreground">The team uses this to call you back. This demo does not dial anyone.</p>
      <div className="mt-3 grid gap-3">
        <Field id="lead-name" label="Name" value={name} onChange={setName} autoComplete="name" disabled={disabled} />
        <Field id="lead-phone" label="Phone" value={phone} onChange={setPhone} autoComplete="tel" disabled={disabled} />
        <Field id="lead-email" label="Email" value={email} onChange={setEmail} autoComplete="email" disabled={disabled} />
      </div>
      <label className="mt-3 flex items-start gap-2 text-[13px]">
        <input type="checkbox" className="mt-1 size-4" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>Northwind Comfort may use this name, phone, and email to follow up on this demo request.</span>
      </label>
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
      <button type="submit" disabled={disabled} className="mt-3 inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-accent px-3 text-[13px] font-medium text-accent-foreground disabled:opacity-40">
        Send to the team
      </button>
    </form>
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
      data-testid="card-form"
      className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]"
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
      <h3 className="text-sm font-semibold">Hold {slot.label}</h3>
      <p className="text-[13px] text-muted-foreground">{issue}</p>
      <div className="mt-3 grid gap-3">
        <Field id={`name-${slot.id}`} label="Name" value={name} onChange={setName} autoComplete="name" disabled={disabled} />
        <Field id={`phone-${slot.id}`} label="Mobile" value={phone} onChange={setPhone} autoComplete="tel" disabled={disabled} />
        <Field id={`address-${slot.id}`} label="Address and ZIP" value={address} onChange={setAddress} autoComplete="street-address" disabled={disabled} />
      </div>
      {error ? (
        <p className="mt-2 flex items-center gap-1 text-sm text-danger" role="alert">
          <span aria-hidden>!</span> {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" disabled={disabled} className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-accent px-3 text-[13px] font-medium text-accent-foreground disabled:opacity-40">
          Confirm visit
        </button>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border px-3 text-[13px] font-medium disabled:opacity-40"
          onClick={() => {
            setName(SAMPLE_CUSTOMER.name);
            setPhone(formatPhone(SAMPLE_CUSTOMER.phone));
            setAddress(SAMPLE_CUSTOMER.address);
            setError("");
          }}
        >
          Use sample customer
        </button>
      </div>
    </form>
  );
}

export function ConfirmCard({
  booking,
  disabled,
  onCancel,
  onReschedule,
}: {
  booking: Booking;
  disabled?: boolean;
  onCancel?: (code: string) => void;
  onReschedule?: (code: string) => void;
}) {
  return (
    <article data-testid="card-confirm" className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]">
      <div className="grid size-8 place-items-center rounded-full bg-success/15 text-success">
        <Check className="size-4" strokeWidth={1.75} />
      </div>
      <h3 className="mt-2 text-sm font-semibold">You&apos;re booked</h3>
      <dl className="mt-2 space-y-1 text-[13px]">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Code</dt>
          <dd className="flex items-center gap-1 font-mono text-[13px]">
            {booking.confirmationCode}
            <CopyButton value={booking.confirmationCode} label="Copy confirmation code" />
          </dd>
        </div>
        <Row label="When" value={booking.slotLabel} />
        <Row label="Where" value={booking.address} />
        <Row label="Who" value={`${booking.name} · ${booking.phone}`} />
      </dl>
      {booking.tripFee > 0 ? <p className="mt-2 text-[11.5px] text-muted-foreground">Trip fee ${booking.tripFee} for {booking.zip}.</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border px-3 text-[13px] font-medium" onClick={() => downloadIcs(booking)}>
          Add to calendar
        </button>
        {onReschedule ? (
          <button type="button" disabled={disabled} className="inline-flex min-h-11 items-center px-2 text-[13px] font-medium underline-offset-2 hover:underline disabled:opacity-40" onClick={() => onReschedule(booking.confirmationCode)}>
            Move this visit
          </button>
        ) : null}
        {onCancel ? (
          <button type="button" disabled={disabled} className="inline-flex min-h-11 items-center px-2 text-[13px] font-medium underline-offset-2 hover:underline disabled:opacity-40" onClick={() => onCancel(booking.confirmationCode)}>
            Cancel visit
          </button>
        ) : null}
      </div>
    </article>
  );
}

function AppointmentTimeline({ bookings }: { bookings: Booking[] }) {
  return (
    <article data-testid="card-timeline" className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Visit status</h3>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11.5px]">{bookings[0]?.status ?? "Open"}</span>
      </div>
      <ol className="mt-3 space-y-3 border-l-2 border-muted pl-3">
        {bookings.map((booking) => (
          <li key={booking.id} className="relative">
            <span className={cn("absolute -left-[17px] top-1 size-3 rounded-full", booking.status === "cancelled" ? "border border-muted-foreground bg-surface" : "bg-success")} />
            <p className="text-sm font-semibold">{booking.confirmationCode}</p>
            <p className="text-[13px] text-muted-foreground">{booking.slotLabel}</p>
            <p className="text-[13px]">{booking.name} · {SERVICE_LABELS[booking.serviceType]}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}

export function CitationRow({ sources }: { sources: Citation[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11.5px] text-muted-foreground">Sources</span>
      {sources.slice(0, 3).map((source) => (
        <CitationChip key={source.id} source={source} />
      ))}
    </div>
  );
}

function CitationChip({ source }: { source: Citation }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const previewId = useId();
  const articleId = source.id.split(":")[0];

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      ref={root}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        type="button"
        data-testid="citation-chip"
        className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface px-2.5 text-[11.5px] font-medium"
        aria-expanded={open}
        aria-controls={previewId}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen((value) => !value)}
      >
        {source.title} · {source.section}
      </button>
      {open ? (
        <div
          id={previewId}
          data-testid="citation-preview"
          role="dialog"
          aria-label={source.title}
          className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-card)]"
        >
          <p className="text-sm font-semibold">{source.title}</p>
          <p className="mt-1 line-clamp-3 text-[13px]">{source.excerpt}</p>
          <a className="mt-2 inline-flex text-[13px] font-medium text-accent underline-offset-2 hover:underline" href={`/kb/${articleId}`} target="_blank" rel="noreferrer">
            Open source<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  autoComplete,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-[12px] font-medium">{label}</label>
      <input
        id={id}
        value={value}
        disabled={disabled}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-60"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-7 place-items-center rounded-full hover:bg-muted"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" strokeWidth={1.75} />}
    </button>
  );
}

function downloadIcs(booking: Booking) {
  const stamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Northwind Comfort//Demo//EN",
    "BEGIN:VEVENT",
    `UID:${booking.id}@hvac-chat.quvantic.com`,
    `DTSTART:${stamp(booking.slotStart)}`,
    `DTEND:${stamp(booking.slotEnd)}`,
    `SUMMARY:Northwind visit ${booking.confirmationCode}`,
    `LOCATION:${booking.address}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${booking.confirmationCode}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

function shortTime(slot: Slot): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(slot.start));
}

function groupSlots(slots: Slot[]): { label: string; slots: Slot[] }[] {
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const groups: { label: string; slots: Slot[] }[] = [];
  for (const slot of slots) {
    const label = format.format(new Date(slot.start));
    const last = groups.at(-1);
    if (last?.label === label) last.slots.push(slot);
    else groups.push({ label, slots: [slot] });
  }
  return groups;
}

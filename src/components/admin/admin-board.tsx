"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, dateKey, startOfWeek, zonedParts, type Ymd } from "@/lib/time";
import { formatWhen } from "@/lib/time";
import { SERVICE_LABELS, type Booking, type Conversation, type Handoff, type Lead, type LeadStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Board = {
  bookings: Booking[];
  leads: Lead[];
  handoffs: Handoff[];
  conversations?: Conversation[];
};

export function AdminBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [clock, setClock] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin", { cache: "no-store" });
      if (!response.ok) throw new Error("The board didn't load.");
      setBoard((await response.json()) as Board);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The board didn't load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setClock(new Date());
      void load();
    }, 0);
    const interval = window.setInterval(() => {
      void load();
    }, 15000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [load]);

  async function act(body: Record<string, string>) {
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      setError("That update didn't save.");
      return;
    }
    setBoard((await response.json()) as Board);
    setSelected(null);
  }

  const today = clock ? zonedParts(clock) : null;
  const weekStart = today ? addDays(startOfWeek(today), weekOffset * 7) : null;
  const days = weekStart ? Array.from({ length: 6 }, (_, index) => addDays(weekStart, index)) : [];
  const active = board?.bookings.filter((booking) => booking.status !== "cancelled") ?? [];
  const openHandoffs = board?.handoffs.filter((handoff) => handoff.status === "open") ?? [];
  const newLeads = board?.leads.filter((lead) => lead.status === "new" || lead.status === "emergency") ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl tracking-tight">Dispatch board</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Visits, callback leads, and safety handoffs from the chat. This is demo data for a fictional shop.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()}>Refresh</Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Open visits" value={loading ? "…" : String(active.length)} />
        <Stat label="Leads waiting" value={loading ? "…" : String(newLeads.length)} />
        <Stat label="Open handoffs" value={loading ? "…" : String(openHandoffs.length)} />
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm" role="alert">
          {error}{" "}
          <button type="button" className="underline" onClick={() => void load()}>Try again</button>
        </p>
      ) : null}

      <Tabs defaultValue="calendar" className="mt-6">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="handoffs">Handoffs</TabsTrigger>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => setWeekOffset((value) => value - 1)}>Previous week</Button>
            <p className="text-sm text-muted-foreground">
              {days.length === 6 ? `${labelDay(days[0])} – ${labelDay(days[5])}` : "Loading the week…"}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setWeekOffset((value) => value + 1)}>Next week</Button>
          </div>
          {loading && !board ? <p className="text-sm text-muted-foreground">Loading the week…</p> : null}
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {days.map((day) => (
              <DayColumn key={dateKey(day)} day={day} bookings={board?.bookings ?? []} onOpen={setSelected} />
            ))}
          </div>
          {board && board.bookings.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No visits yet. A booking in the chat shows up here.</p>
          ) : null}
        </TabsContent>
        <TabsContent value="leads" className="mt-4">
          <Leads leads={board?.leads ?? []} loading={loading} onStatus={(id, status) => void act({ action: "set_lead_status", id, status })} />
        </TabsContent>
        <TabsContent value="inbox" className="mt-4">
          <Inbox conversations={board?.conversations ?? []} loading={loading} />
        </TabsContent>
        <TabsContent value="handoffs" className="mt-4">
          <Handoffs
            handoffs={board?.handoffs ?? []}
            loading={loading}
            onAcknowledge={(id) => void act({ action: "acknowledge", id })}
            onClose={(id) => void act({ action: "close_handoff", id })}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.confirmationCode}</DialogTitle>
                <DialogDescription>{selected.slotLabel}</DialogDescription>
              </DialogHeader>
              <dl className="grid gap-2 text-sm">
                <Row label="Customer" value={`${selected.name} · ${selected.phone}`} />
                <Row label="Address" value={selected.address} />
                <Row label="Job" value={SERVICE_LABELS[selected.serviceType]} />
                <Row label="Issue" value={selected.issue} />
                <Row label="Status" value={selected.status} />
                {selected.tripFee > 0 ? <Row label="Trip fee" value={`$${selected.tripFee}`} /> : null}
              </dl>
              {selected.status !== "cancelled" ? (
                <Button type="button" variant="destructive" onClick={() => void act({ action: "cancel_booking", id: selected.id })}>
                  Cancel this visit
                </Button>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-heading text-3xl">{value}</p>
    </div>
  );
}

function DayColumn({
  day,
  bookings,
  onOpen,
}: {
  day: Ymd;
  bookings: Booking[];
  onOpen: (booking: Booking) => void;
}) {
  const key = dateKey(day);
  const mine = bookings.filter((booking) => dayKey(booking.slotStart) === key);
  return (
    <section className="rounded-2xl border border-border bg-card p-2">
      <h2 className="px-1 text-sm font-medium">{labelDay(day)}</h2>
      <div className="mt-2 space-y-2">
        {mine.length === 0 ? <p className="px-1 text-xs text-muted-foreground">No visits</p> : null}
        {mine.map((booking) => (
          <button
            key={booking.id}
            type="button"
            onClick={() => onOpen(booking)}
            className="w-full rounded-xl border border-border bg-background px-2 py-2 text-left text-xs hover:border-primary"
          >
            <span className="block font-medium">{booking.confirmationCode}</span>
            <span className="mt-0.5 block text-muted-foreground">{timeOnly(booking.slotStart)}</span>
            <span className="block">{booking.name}</span>
            <span className="block text-muted-foreground">{SERVICE_LABELS[booking.serviceType]}</span>
            {booking.status === "cancelled" ? <Badge variant="outline" className="mt-1">Cancelled</Badge> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function Leads({
  leads,
  loading,
  onStatus,
}: {
  leads: Lead[];
  loading: boolean;
  onStatus: (id: string, status: LeadStatus) => void;
}) {
  if (loading && leads.length === 0) return <p className="text-sm text-muted-foreground">Loading leads…</p>;
  if (leads.length === 0) return <p className="text-sm text-muted-foreground">No leads yet. A booking or a callback in the chat lands here.</p>;
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
      {leads.map((lead) => (
        <li key={lead.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="font-medium">{lead.name} · {lead.phone}</p>
            <p className="text-sm text-muted-foreground">{lead.issue}</p>
            <p className="text-xs text-muted-foreground">{formatWhen(lead.createdAt)}{lead.serviceType ? ` · ${SERVICE_LABELS[lead.serviceType]}` : ""}</p>
          </div>
          <label className="text-xs text-muted-foreground">
            Status
            <select
              className="mt-1 block h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
              value={lead.status}
              onChange={(event) => onStatus(lead.id, event.target.value as LeadStatus)}
            >
              <option value="new">New</option>
              <option value="booked">Booked</option>
              <option value="emergency">Emergency</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </li>
      ))}
    </ul>
  );
}

function Handoffs({
  handoffs,
  loading,
  onAcknowledge,
  onClose,
}: {
  handoffs: Handoff[];
  loading: boolean;
  onAcknowledge: (id: string) => void;
  onClose: (id: string) => void;
}) {
  const ordered = useMemo(
    () => [...handoffs].sort((a, b) => Number(a.status !== "open") - Number(b.status !== "open")),
    [handoffs],
  );
  if (loading && handoffs.length === 0) return <p className="text-sm text-muted-foreground">Loading handoffs…</p>;
  if (handoffs.length === 0) {
    return <p className="text-sm text-muted-foreground">No handoffs. A gas smell, a CO alarm, or a request for a person shows up here.</p>;
  }
  return (
    <ul className="space-y-3">
      {ordered.map((handoff) => (
        <li key={handoff.id} className={handoff.reason === "human" ? "rounded-2xl border border-border bg-card p-4" : "rounded-2xl border border-destructive/40 bg-card p-4"}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-xl">{handoff.reference}</h2>
            <Badge variant={handoff.reason === "human" ? "outline" : "destructive"}>{handoff.reason.replaceAll("_", " ")}</Badge>
            <Badge variant="secondary">{handoff.status}</Badge>
          </div>
          <p className="mt-2 text-sm">{handoff.summary}</p>
          {handoff.safetyMessage ? <p className="mt-2 text-sm text-muted-foreground">{handoff.safetyMessage}</p> : null}
          <p className="mt-2 text-xs text-muted-foreground">
            {handoff.customerName || "Name not given"} · {handoff.phone || "No phone"} · {formatWhen(handoff.createdAt)}
          </p>
          <div className="mt-3 flex gap-2">
            {handoff.status === "open" ? (
              <Button type="button" size="sm" onClick={() => onAcknowledge(handoff.id)}>Acknowledge</Button>
            ) : null}
            {handoff.status !== "closed" ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onClose(handoff.id)}>Close</Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Inbox({ conversations, loading }: { conversations: Conversation[]; loading: boolean }) {
  if (loading && conversations.length === 0) return <p className="text-sm text-muted-foreground">Loading conversations…</p>;
  if (conversations.length === 0) return <p className="text-sm text-muted-foreground">No conversations yet. A chat, a widget message, or a webhook shows up here with its tool calls.</p>;
  return (
    <ul className="space-y-3">
      {conversations.map((conversation) => (
        <li key={conversation.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">{conversation.summary}</h2>
            <Badge variant="outline">{conversation.channel}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{conversation.externalUser || conversation.id} · {formatWhen(conversation.updatedAt)}</p>
          <ol className="mt-3 space-y-2 text-sm">
            {conversation.messages.map((message, index) => (
              <li key={`${conversation.id}-${index}`}>
                <span className="font-medium">{message.role === "user" ? "Caller" : "Desk"}: </span>
                {message.text}
                {message.tools && message.tools.length > 0 ? (
                  <span className="mt-1 block text-xs text-muted-foreground">{message.tools.map((tool) => tool.name).join(" · ")}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ul>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function labelDay(day: Ymd): string {
  const date = new Date(Date.UTC(day.year, day.month - 1, day.day, 18));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function dayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function timeOnly(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

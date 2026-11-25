import {
  DEFAULT_AGE,
  DEFAULT_SQFT,
  DIAGNOSTIC_FEE,
  FINANCING_NOTE,
  FINANCING_THRESHOLD,
  QUOTE_VALID_DAYS,
} from "@/lib/pricing";
import {
  SERVICE_LABELS,
  type LineItem,
  type Quote,
  type ServiceType,
  type Urgency,
} from "@/lib/types";

type Band = { low: number; high: number };

function roundBand(band: Band): Band {
  return { low: Math.round(band.low), high: Math.round(band.high) };
}

function scale(band: Band, sqft: number, per400: number, pivot = DEFAULT_SQFT): Band {
  const factor = Math.max(0.7, 1 + ((sqft - pivot) / 400) * per400);
  return roundBand({ low: band.low * factor, high: band.high * factor });
}

function urgencyLabor(band: Band, urgency: Urgency): Band {
  if (urgency === "emergency") return roundBand({ low: band.low * 1.25, high: band.high * 1.25 });
  if (urgency === "flexible") return roundBand({ low: band.low * 0.95, high: band.high * 0.95 });
  return roundBand(band);
}

function partsForAge(age: number): Band {
  if (age < 5) return { low: 140, high: 320 };
  if (age < 12) return { low: 220, high: 640 };
  return { low: 320, high: 980 };
}

function item(label: string, band: Band, note?: string): LineItem {
  const rounded = roundBand(band);
  return { label, low: rounded.low, high: rounded.high, note };
}

function totals(items: LineItem[]): { totalLow: number; totalHigh: number } {
  return items.reduce(
    (sum, line) => ({
      totalLow: sum.totalLow + line.low,
      totalHigh: sum.totalHigh + line.high,
    }),
    { totalLow: 0, totalHigh: 0 },
  );
}

export function getQuote(input: {
  serviceType: ServiceType;
  homeSqft: number;
  systemAge: number;
  urgency: Urgency;
  sqftAssumed?: boolean;
  ageAssumed?: boolean;
}): Quote {
  const sqft = Math.max(600, Math.min(8000, Math.round(input.homeSqft)));
  const age = Math.max(0, Math.min(40, Math.round(input.systemAge)));
  const urgency = input.urgency;
  const items = lineItems(input.serviceType, sqft, age, urgency);
  const { totalLow, totalHigh } = totals(items);
  const assumptions = [
    input.sqftAssumed
      ? `Square footage was not given, so this uses ${DEFAULT_SQFT.toLocaleString()} sq ft.`
      : `Sized for ${sqft.toLocaleString()} sq ft.`,
    input.ageAssumed
      ? `System age was not given, so this uses ${DEFAULT_AGE} years.`
      : `System age entered as ${age} years.`,
    urgency === "emergency"
      ? "Timing treated as same-day, which adds the priority premium on labor."
      : urgency === "flexible"
        ? "Timing treated as flexible, which takes a small amount off labor."
        : "Timing treated as soon, within a few days.",
    "A technician can change this after seeing the equipment.",
    "Not a binding bid. Northwind Comfort is a fictional company.",
  ];

  return {
    serviceType: input.serviceType,
    serviceLabel: SERVICE_LABELS[input.serviceType],
    homeSqft: sqft,
    systemAge: age,
    urgency,
    items,
    totalLow,
    totalHigh,
    assumptions,
    financingNote: totalHigh >= FINANCING_THRESHOLD ? FINANCING_NOTE : undefined,
    validForDays: QUOTE_VALID_DAYS,
  };
}

function lineItems(
  serviceType: ServiceType,
  sqft: number,
  age: number,
  urgency: Urgency,
): LineItem[] {
  if (serviceType === "duct_cleaning") {
    const steps = Math.max(0, Math.ceil((sqft - 1500) / 500));
    const items = [
      item(
        "Duct cleaning",
        { low: 299 + steps * 70, high: 399 + steps * 90 },
        "Supply and return trunks, registers, and the blower compartment.",
      ),
    ];
    if (age >= 15) {
      items.push(
        item(
          "Sanitizing treatment",
          { low: 79, high: 129 },
          "Common on older duct runs. Skipped on site if the ducts are already clean.",
        ),
      );
    }
    if (urgency === "emergency") {
      items.push(item("Same-day routing", { low: 40, high: 80 }));
    }
    return items;
  }

  if (serviceType === "maintenance_plan") {
    const items = [
      item(
        "Comfort Club, one year",
        { low: 189, high: 228 },
        "Two seasonal tune-ups, no diagnostic fee, 15% off repairs, and priority scheduling.",
      ),
    ];
    if (sqft > 3000) {
      items.push(
        item(
          "Second system",
          { low: 189, high: 228 },
          "The plan price is for one system. A second system is the same price again.",
        ),
      );
    }
    return items;
  }

  if (serviceType === "furnace_install") {
    const items = [
      item(
        "Furnace equipment",
        scale({ low: 2800, high: 4600 }, sqft, 0.08),
        "80% to 96% AFUE gas furnace, sized to the home.",
      ),
      item("Installation labor", urgencyLabor(scale({ low: 1600, high: 2400 }, sqft, 0.04), urgency)),
      item("Permit, flue, and pad", { low: 450, high: 900 }),
      item("Thermostat", { low: 189, high: 349 }, "Installed and connected to the new furnace."),
    ];
    if (age >= 15) {
      items.splice(
        3,
        0,
        item(
          "Duct transitions",
          { low: 250, high: 600 },
          "Older equipment often needs a new plenum or transitions.",
        ),
      );
    }
    return items;
  }

  if (serviceType === "heat_pump") {
    const items = [
      item(
        "Heat pump equipment",
        scale({ low: 6400, high: 9800 }, sqft, 0.1),
        "Heating and cooling in one system. Austin's mild winters suit this.",
      ),
      item("Installation labor", urgencyLabor(scale({ low: 2200, high: 3600 }, sqft, 0.04), urgency)),
      item("Electrical, disconnect, and permit", { low: 700, high: 1500 }),
    ];
    if (age >= 15) {
      items.push(
        item(
          "Line set or duct adaptation",
          { low: 400, high: 1100 },
          "Replacing a system this old often means new refrigerant lines.",
        ),
      );
    }
    return items;
  }

  if (serviceType === "ac_install") {
    return [
      item("Air conditioner equipment", scale({ low: 4200, high: 7600 }, sqft, 0.09)),
      item("Installation labor", urgencyLabor(scale({ low: 1800, high: 3000 }, sqft, 0.04), urgency)),
      item("Electrical and permit", { low: 500, high: 1200 }),
      item("Thermostat", { low: 189, high: 349 }),
    ];
  }

  if (serviceType === "thermostat") {
    const items = [
      item(
        "Diagnostic visit",
        DIAGNOSTIC_FEE,
        "Waived when you approve the new thermostat.",
      ),
      item("Thermostat", { low: 160, high: 420 }),
      item("Labor", urgencyLabor({ low: 120, high: 240 }, urgency)),
    ];
    return items;
  }

  const repairLabel = serviceType === "furnace_repair" ? "Likely heat parts" : "Likely cooling parts";
  const repairNote =
    serviceType === "furnace_repair"
      ? "Igniter, flame sensor, inducer, or blower. A heat exchanger is a replacement conversation, not a small part."
      : age >= 12
        ? "Capacitor, contactor, fan motor, or refrigerant. A compressor can reach the top of this range."
        : "Capacitor, contactor, or a small electrical part. Refrigerant is extra if we find a leak.";

  const items = [
    item(
      "Diagnostic visit",
      DIAGNOSTIC_FEE,
      "Waived when you approve the repair, and waived for Comfort Club members.",
    ),
    item("Labor", urgencyLabor(scale({ low: 240, high: 480 }, sqft, 0.05), urgency)),
    item(repairLabel, partsForAge(age), repairNote),
  ];
  if (urgency === "emergency") {
    items.push(item("Priority dispatch", { low: 89, high: 149 }, "Same-day routing ahead of flexible work."));
  }
  return items;
}

export { DEFAULT_AGE, DEFAULT_SQFT };

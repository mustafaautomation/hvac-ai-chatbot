export const BRAND = {
  name: "Northwind Comfort Heating & Air",
  short: "Northwind Comfort",
  city: "Austin, TX",
  phoneDisplay: "(512) 555-0198",
  phoneTel: "+15125550198",
  address: "1840 E 6th Street, Austin, TX 78702",
  hours: [
    "Monday–Friday, 7:30 a.m.–6:00 p.m.",
    "Saturday, 8:00 a.m.–2:00 p.m.",
    "Sunday closed, except visits already on the board",
  ],
  subdomain: "hvac-chat",
  timezone: "America/Chicago",
} as const;

export const DISCLAIMER =
  "Portfolio demo by Quvantic - fictional brand, not a real business / not client work";

export const DESK = {
  botName: "Ava",
  brand: "Northwind Comfort",
  role: "AI agent",
  humanName: "Riley Cho",
  humanRole: "human specialist",
} as const;

export const TEASER = "Furnace acting up? I can book a tech today.";

export const METRICS = [
  { value: "25", label: "KB guides" },
  { value: "24", label: "evals in CI" },
  { value: "10", label: "tools" },
  { value: "Seconds", label: "Reply time" },
] as const;

export const SAMPLE_CUSTOMER = {
  name: "Alex Rivera",
  phone: "512-555-0142",
  address: "1408 S Congress Ave, Austin, TX 78704",
} as const;

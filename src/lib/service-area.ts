import type { ServiceAreaResult } from "@/lib/types";

type Zone = {
  zip: string;
  neighborhood: string;
  zone: "core" | "extended";
  tripFee: number;
};

const ZONES: Zone[] = [
  ["78701", "Downtown"],
  ["78702", "East Cesar Chavez"],
  ["78703", "Tarrytown"],
  ["78704", "South Congress"],
  ["78705", "University of Texas"],
  ["78721", "Govalle"],
  ["78722", "Central East Austin"],
  ["78723", "Mueller"],
  ["78731", "Northwest Hills"],
  ["78741", "Riverside"],
  ["78745", "South Manchaca"],
  ["78746", "West Lake Hills"],
  ["78748", "Circle C"],
  ["78749", "Oak Hill"],
  ["78750", "Anderson Mill"],
  ["78751", "Hyde Park"],
  ["78752", "North Loop"],
  ["78753", "Dessau"],
  ["78756", "Allandale"],
  ["78757", "Crestview"],
  ["78758", "North Burnet"],
  ["78759", "Great Hills"],
].map(([zip, neighborhood]) => ({
  zip,
  neighborhood,
  zone: "core" as const,
  tripFee: 0,
}));

const EXTENDED: Zone[] = [
  ["78613", "Cedar Park", 49],
  ["78641", "Leander", 49],
  ["78660", "Pflugerville", 49],
  ["78664", "Round Rock", 49],
  ["78665", "Round Rock", 49],
  ["78681", "Round Rock", 49],
  ["78717", "Wells Branch", 49],
  ["78732", "Steiner Ranch", 49],
  ["78734", "Lakeway", 49],
  ["78738", "Bee Cave", 49],
  ["78620", "Dripping Springs", 49],
  ["78626", "Georgetown", 79],
  ["78628", "Georgetown", 79],
  ["78633", "Georgetown", 79],
  ["78602", "Bastrop", 79],
].map(([zip, neighborhood, tripFee]) => ({
  zip: String(zip),
  neighborhood: String(neighborhood),
  zone: "extended" as const,
  tripFee: Number(tripFee),
}));

const BY_ZIP = new Map<string, Zone>([...ZONES, ...EXTENDED].map((zone) => [zone.zip, zone]));

export function checkServiceArea(zip: string): ServiceAreaResult | { error: string } {
  const cleaned = zip.trim();
  if (!/^\d{5}$/.test(cleaned)) {
    return { error: "Use a 5-digit ZIP, like 78704." };
  }
  const zone = BY_ZIP.get(cleaned);
  if (!zone) {
    return {
      zip: cleaned,
      inArea: false,
      zone: "outside",
      neighborhood: "Outside the Austin board",
      tripFee: 0,
      message: `We don't run trucks to ${cleaned}. Northwind Comfort covers Austin and the close-in suburbs: Round Rock, Cedar Park, Pflugerville, Leander, Lakeway, Bee Cave, Dripping Springs, Georgetown, and Bastrop.`,
    };
  }
  if (zone.zone === "core") {
    return {
      zip: cleaned,
      inArea: true,
      zone: "core",
      neighborhood: zone.neighborhood,
      tripFee: 0,
      message: `${cleaned} is ${zone.neighborhood}, inside our core Austin area. No trip fee.`,
    };
  }
  return {
    zip: cleaned,
    inArea: true,
    zone: "extended",
    neighborhood: zone.neighborhood,
    tripFee: zone.tripFee,
    message: `${cleaned} is ${zone.neighborhood}. We serve it with a $${zone.tripFee} trip fee added to the visit.`,
  };
}

export function zipFromText(text: string): string | undefined {
  const match = text.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match?.[1];
}

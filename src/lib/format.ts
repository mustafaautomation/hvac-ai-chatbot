export function money(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function moneyRange(low: number, high: number): string {
  if (low === high) return money(low);
  return `${money(low)}–${money(high)}`;
}

export function digits(phone: string): string {
  const raw = phone.replace(/\D/g, "");
  if (raw.length === 11 && raw.startsWith("1")) return raw.slice(1);
  return raw;
}

export function formatPhone(phone: string): string {
  const value = digits(phone);
  if (value.length !== 10) return phone.trim();
  return `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
}

export function titleCaseName(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function excerpt(text: string, max = 220): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trimEnd()}…`;
}

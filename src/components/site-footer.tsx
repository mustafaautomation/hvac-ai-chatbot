import { BRAND, DISCLAIMER } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
      <p>{BRAND.address}</p>
      <p className="mt-1">
        <a className="underline-offset-2 hover:underline" href="https://github.com/mustafaautomation/hvac-ai-chatbot">GitHub</a>
        {" · "}
        <a className="underline-offset-2 hover:underline" href={`tel:${BRAND.phoneTel}`}>{BRAND.phoneDisplay}</a>
      </p>
      <p className="mt-2">{DISCLAIMER}</p>
    </footer>
  );
}

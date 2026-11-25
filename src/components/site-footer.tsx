import { DISCLAIMER } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
      {DISCLAIMER}
    </footer>
  );
}

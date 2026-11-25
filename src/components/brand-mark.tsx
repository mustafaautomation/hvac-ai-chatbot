export function BrandMark({ className, strokeWidth = 1.75 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M3.5 8.25c2.6 0 3.5 2.35 8.5 2.35s5.9-2.35 8.5-2.35" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M5.25 12.75c2.2 0 3 2.1 6.75 2.1s4.55-2.1 6.75-2.1" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M8 17.25h8" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

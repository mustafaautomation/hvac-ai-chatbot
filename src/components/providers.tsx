"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <MotionConfig transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} reducedMotion="user">
        {children}
      </MotionConfig>
    </ThemeProvider>
  );
}

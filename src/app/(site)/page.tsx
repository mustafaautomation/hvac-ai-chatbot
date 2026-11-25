import type { Metadata } from "next";
import { LandingView } from "@/components/landing-view";

export const metadata: Metadata = { title: "Northwind Comfort" };

export default function LandingPage() {
  return <LandingView />;
}

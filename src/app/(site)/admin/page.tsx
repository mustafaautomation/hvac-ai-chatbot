import type { Metadata } from "next";
import { AdminBoard } from "@/components/admin/admin-board";

export const metadata: Metadata = {
  title: "Dispatch board",
};

export default function AdminPage() {
  return <AdminBoard />;
}

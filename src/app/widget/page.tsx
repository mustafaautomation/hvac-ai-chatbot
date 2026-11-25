import type { Metadata } from "next";
import { ChatApp } from "@/components/chat/chat-app";

export const metadata: Metadata = { title: "Chat widget" };

export default function WidgetPage() {
  return <ChatApp embedded />;
}

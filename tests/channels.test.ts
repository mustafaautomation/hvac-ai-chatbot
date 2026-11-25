import { describe, expect, it } from "vitest";
import { handleMessenger, verifyMessenger } from "@/lib/channels/messenger";
import { handleWhatsApp, verifyWhatsApp } from "@/lib/channels/whatsapp";
import { maskPii } from "@/lib/guardrails";
import { articleCount } from "@/lib/kb/retrieve";
import { DemoStore } from "@/lib/store";

describe("channels", () => {
  it("verifies WhatsApp and Messenger subscriptions", () => {
    const ok = new URLSearchParams("hub.mode=subscribe&hub.verify_token=northwind-demo&hub.challenge=abc123");
    expect(verifyWhatsApp(ok)).toEqual({ status: 200, body: "abc123" });
    expect(verifyMessenger(ok)).toEqual({ status: 200, body: "abc123" });
    const bad = new URLSearchParams("hub.mode=subscribe&hub.verify_token=nope&hub.challenge=abc");
    expect(verifyWhatsApp(bad).status).toBe(403);
  });

  it("maps a WhatsApp text message onto the same desk", async () => {
    const store = DemoStore.empty();
    const result = await handleWhatsApp(store, {
      entry: [{ changes: [{ value: { messages: [{ from: "15555550100", id: "wamid.1", type: "text", text: { body: "What does the Comfort Club include?" } }] } }] }],
    });
    expect(result.replies[0].to).toBe("15555550100");
    expect(result.replies[0].text.toLowerCase()).toMatch(/tune-up|15%/);
    expect(store.data.conversations[0].channel).toBe("whatsapp");
    expect(store.data.conversations[0].messages.some((message) => message.tools?.some((tool) => tool.name === "search_knowledge"))).toBe(true);
  });

  it("maps a Messenger message onto the same desk", async () => {
    const store = DemoStore.empty();
    const result = await handleMessenger(store, {
      entry: [{ messaging: [{ sender: { id: "user-9" }, message: { text: "I smell gas by the furnace." } }] }],
    });
    expect(result.replies[0].text).toMatch(/911/);
    expect(store.data.handoffs[0].reason).toBe("gas");
    expect(store.data.conversations[0].channel).toBe("messenger");
  });
});

describe("guardrail logs", () => {
  it("masks phone, email, and SSN", () => {
    const masked = maskPii("Email ada@example.com, phone 512-555-0142, ssn 123-45-6789");
    expect(masked).not.toContain("ada@example.com");
    expect(masked).not.toContain("512-555-0142");
    expect(masked).not.toContain("123-45-6789");
    expect(masked).toContain("[email]");
    expect(masked).toContain("[phone]");
    expect(masked).toContain("[ssn]");
  });

  it("loads at least 15 markdown guides", () => {
    expect(articleCount()).toBeGreaterThanOrEqual(15);
    expect(articleCount()).toBeLessThanOrEqual(30);
  });
});

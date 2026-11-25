import { detectEmergency } from "@/lib/emergency";
import {
  detectFrustration,
  detectInjection,
  detectSensitivePii,
  maskPii,
} from "@/lib/guardrails";
import { llmConfigured, runLive } from "@/lib/llm/live";
import { runGuided } from "@/lib/orchestrator";
import type { DemoStore } from "@/lib/store";
import type { Channel, ChatAction, Draft, TurnResult } from "@/lib/types";

export async function runAgent(input: {
  store: DemoStore;
  channel: Channel;
  text?: string;
  action?: ChatAction;
  draft?: Draft;
  history?: { role: "user" | "assistant"; text: string }[];
  conversationId?: string;
  externalUser?: string;
  engine?: "guided" | "model";
  now?: Date;
  fetchImpl?: typeof fetch;
}): Promise<TurnResult> {
  const text = input.text?.trim() ?? "";
  const forceDemo = Boolean(input.action) || !text || detectEmergency(text) || detectInjection(text) || detectSensitivePii(text) || detectFrustration(text);
  let result: TurnResult;
  if (!forceDemo && input.engine === "model" && llmConfigured()) {
    const live = await runLive({
      store: input.store,
      draft: input.draft ?? {},
      text,
      history: input.history,
      now: input.now,
      fetchImpl: input.fetchImpl,
    });
    result = live ?? runGuided({ store: input.store, draft: input.draft, text, now: input.now });
    if (!live) {
      result.message.text = `${result.message.text}\n\nThe live model did not answer, so this reply came from the guided desk.`;
      result.engine = "guided";
      result.message.engine = "guided";
    }
  } else {
    result = runGuided({
      store: input.store,
      draft: input.draft,
      text,
      action: input.action,
      now: input.now,
    });
  }

  const conversationId = input.store.recordTurn({
    conversationId: input.conversationId,
    channel: input.channel,
    externalUser: input.externalUser,
    userText: text || (input.action ? input.action.type : undefined),
    assistantText: result.message.text,
    tools: result.tools,
  });
  result.conversationId = conversationId;
  return result;
}

export function logTurn(channel: Channel, text: string, tools: string[]): void {
  console.info(maskPii(`[${channel}] tools=${tools.join(",") || "none"} text=${text.slice(0, 180)}`));
}

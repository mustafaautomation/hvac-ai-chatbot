import fs from "node:fs";
import path from "node:path";
import { runGuided } from "@/lib/orchestrator";
import { DemoStore } from "@/lib/store";
import type { ChatPart, Draft, ToolTrace } from "@/lib/types";

export type Expectation = {
  textIncludes?: string[];
  citationIncludes?: string;
  toolsInclude?: string[];
  noTools?: string[];
  toolArgs?: Record<string, Record<string, unknown>>;
  partsInclude?: string[];
  noHandoff?: boolean;
  noTroubleshooting?: boolean;
  noSlots?: boolean;
  handoff?: boolean;
  summaryExcludes?: string[];
};

export type EvalCase = {
  id: string;
  text?: string;
  steps?: string[];
  seed?: boolean;
  expect: Expectation;
};

export type EvalResult = {
  id: string;
  pass: boolean;
  failures: string[];
};

const NOW = new Date("2026-11-25T15:00:00.000Z");

export function loadCases(): EvalCase[] {
  const file = path.join(process.cwd(), "evals", "cases.json");
  return JSON.parse(fs.readFileSync(file, "utf8")) as EvalCase[];
}

export function runCase(testCase: EvalCase): EvalResult {
  const store = testCase.seed ? DemoStore.seeded(NOW) : DemoStore.empty();
  const steps = testCase.steps ?? [testCase.text ?? ""];
  let draft: Draft = {};
  let tools: ToolTrace[] = [];
  let parts: ChatPart[] = [];
  let text = "";
  for (const step of steps) {
    const turn = runGuided({ store, draft, text: step, now: NOW });
    draft = turn.draft;
    tools = tools.concat(turn.tools);
    parts = turn.message.parts;
    text = turn.message.text;
  }
  const failures: string[] = [];
  const expect = testCase.expect;
  const blob = `${text}\n${JSON.stringify(parts)}`.toLowerCase();
  for (const needle of expect.textIncludes ?? []) {
    if (!blob.includes(needle.toLowerCase())) failures.push(`text missing “${needle}”`);
  }
  for (const name of expect.toolsInclude ?? []) {
    if (!tools.some((tool) => tool.name === name)) failures.push(`missing tool ${name}`);
  }
  for (const name of expect.noTools ?? []) {
    if (tools.some((tool) => tool.name === name)) failures.push(`unexpected tool ${name}`);
  }
  if (expect.citationIncludes) {
    const citations = parts.find((part) => part.type === "citations");
    const blob = citations && citations.type === "citations"
      ? citations.sources.map((source) => `${source.title} ${source.section} ${source.excerpt}`).join(" ")
      : "";
    if (!blob.toLowerCase().includes(expect.citationIncludes.toLowerCase())) {
      failures.push(`citation missing “${expect.citationIncludes}”`);
    }
  }
  for (const partType of expect.partsInclude ?? []) {
    if (!parts.some((part) => part.type === partType)) failures.push(`missing part ${partType}`);
  }
  if (expect.noSlots && parts.some((part) => part.type === "slots")) failures.push("unexpected slots");
  if (expect.noTroubleshooting && parts.some((part) => part.type === "troubleshooting")) failures.push("unexpected troubleshooting");
  const handoff = parts.find((part) => part.type === "handoff");
  if (expect.handoff && !handoff) failures.push("expected a handoff");
  if (expect.noHandoff && handoff) failures.push("unexpected handoff");
  if (expect.summaryExcludes && handoff && handoff.type === "handoff") {
    for (const secret of expect.summaryExcludes) {
      if (handoff.handoff.summary.includes(secret)) failures.push(`summary leaked ${secret}`);
    }
  }
  if (expect.toolArgs) {
    for (const [name, args] of Object.entries(expect.toolArgs)) {
      const call = tools.find((tool) => tool.name === name);
      const input = (call?.input ?? {}) as Record<string, unknown>;
      for (const [key, value] of Object.entries(args)) {
        if (input[key] !== value) failures.push(`${name}.${key} expected ${JSON.stringify(value)} got ${JSON.stringify(input[key])}`);
      }
    }
  }
  return { id: testCase.id, pass: failures.length === 0, failures };
}

export function runSuite(): { results: EvalResult[]; passed: number; failed: number } {
  const results = loadCases().map(runCase);
  return {
    results,
    passed: results.filter((result) => result.pass).length,
    failed: results.filter((result) => !result.pass).length,
  };
}

export function writeReport(suite: ReturnType<typeof runSuite>): void {
  const jsonPath = path.join(process.cwd(), "docs", "eval-results.json");
  const mdPath = path.join(process.cwd(), "docs", "eval-report.md");
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(suite, null, 2));
  const lines = [
    "# Eval report",
    "",
    `Offline demo engine. ${suite.passed} passed, ${suite.failed} failed, ${suite.results.length} cases.`,
    "",
    "| Case | Result | Notes |",
    "| --- | --- | --- |",
    ...suite.results.map((result) => `| ${result.id} | ${result.pass ? "pass" : "fail"} | ${result.failures.join("; ") || ""} |`),
    "",
  ];
  fs.writeFileSync(mdPath, lines.join("\n"));
}

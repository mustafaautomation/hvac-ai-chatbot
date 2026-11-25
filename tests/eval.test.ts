import { expect, it } from "vitest";
import { loadCases, runSuite, writeReport } from "@/lib/eval/suite";

it("runs the offline eval suite", async () => {
  const cases = loadCases();
  expect(cases.length).toBeGreaterThanOrEqual(20);
  const suite = await runSuite();
  writeReport(suite);
  if (suite.failed > 0) {
    const details = suite.results.filter((result) => !result.pass).map((result) => `${result.id}: ${result.failures.join("; ")}`).join("\n");
    expect.fail(details);
  }
  expect(suite.failed).toBe(0);
});

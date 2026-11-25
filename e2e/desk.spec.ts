import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    document.documentElement.dataset.visualTest = "true";
  });
});

test("landing shows the live desk, metrics, and disclaimer", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /quote the visit/i })).toBeVisible();
  await expect(page.getByTestId("landing-hero-chat").getByTestId("composer-input")).toBeVisible();
  await expect(page.getByTestId("metrics-strip")).toContainText("24");
  await expect(page.getByRole("contentinfo")).toContainText("Portfolio demo by Quvantic - fictional brand, not a real business / not client work");
  await expect(page.getByLabel("Architecture diagram")).toBeVisible();
  await expect(page.getByText("What it won't do")).toBeVisible();
  await expect(page.getByTestId("chat-launcher")).toBeVisible();
  await expect(page.getByTestId("launcher-nudge")).toHaveCount(2);
  await expect(page.getByTestId("launcher-teaser")).toContainText("Furnace acting up");
  await page.screenshot({ path: "docs/screenshots/landing.png", fullPage: true });
  await page.screenshot({ path: "docs/screenshots/visual/launcher-closed.png" });
});

test("widget empty state, stream, citation, and follow-ups", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.getByTestId("chat-launcher").click();
  const widget = page.getByTestId("chat-widget");
  await expect(widget.getByTestId("chat-header")).toBeVisible();
  await expect(widget.getByText(/safe check/i)).toBeVisible();
  await expect(widget.getByTestId("starter-ac")).toBeVisible();
  await expect(widget.getByTestId("mode-pill")).toHaveText("Demo mode");
  await expect(widget.getByTestId("composer-input")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/visual/widget-open-empty.png" });

  await widget.getByTestId("composer-input").fill("What does the Comfort Club include?");
  await widget.getByTestId("composer-send").click();
  await expect(widget.getByTestId("phase-indicator")).toBeVisible();
  await expect(widget.getByTestId("composer-stop")).toBeVisible();
  await expect(widget.getByTestId("assistant-text").last()).toContainText("15%");
  await expect(widget.getByTestId("citation-chip").first()).toBeVisible();
  await expect(widget.getByTestId("follow-up").first()).toBeVisible();
  await widget.getByTestId("citation-chip").first().focus();
  await expect(widget.getByTestId("citation-preview")).toBeVisible();
  await expect(widget.getByRole("button", { name: "Copy" }).last()).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/citation.png" });
});

test("quote, slot chips, booking, and gas handoff", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/chat");
  await expect(page.getByTestId("mode-pill")).toHaveText("Demo mode");
  await page.getByTestId("starter-ac").click();
  await expect(page.getByTestId("card-checklist")).toBeVisible();
  await expect(page.getByTestId("card-quote")).toBeVisible();
  await expect(page.getByText("Only times the booking system returned")).toBeVisible();
  await expect(page.getByTestId("slot-chip").first()).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/quote.png" });
  await page.screenshot({ path: "docs/screenshots/visual/rich-card.png" });
  await page.getByTestId("slot-chip").first().click();
  await page.getByRole("button", { name: /^Book \d/ }).click();
  await page.getByRole("button", { name: "Use sample customer" }).click();
  await page.getByRole("button", { name: "Confirm visit" }).click();
  await expect(page.getByTestId("card-confirm")).toBeVisible();
  await expect(page.getByText(/NW-\d{4}/).last()).toBeVisible();
  await expect(page.getByLabel("Name")).toBeDisabled();
  await page.screenshot({ path: "docs/screenshots/booking.png" });

  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: "New chat" }).click();
  await page.getByTestId("starter-gas").click();
  await expect(page.getByTestId("urgent-banner")).toContainText("911");
  await expect(page.getByTestId("card-handoff-safety")).toContainText("911");
  await expect(page.getByText("Check the filter")).toHaveCount(0);
  await page.screenshot({ path: "docs/screenshots/handoff.png" });
});

test("talk to a person, then resume the bot from admin", async ({ page }) => {
  await page.goto("/chat");
  await page.getByTestId("starter-human").click();
  await expect(page.getByTestId("handoff-banner")).toContainText(/team member|Riley Cho/i);
  await expect(page.getByTestId("chat-header")).toContainText(/Riley Cho|team member/i);
  await page.getByTestId("resume-bot").click();
  await expect(page.getByText("I'm back on the desk")).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dispatch board" })).toBeVisible();
  await page.getByRole("tab", { name: "Handoffs" }).click();
  await expect(page.getByText(/HW-\d{4}|human/i).first()).toBeVisible();
  await page.getByRole("tab", { name: "Inbox" }).click();
  await expect(page.getByTestId("resume-bot")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/admin.png" });
});

test("lead card opens from the composer", async ({ page }) => {
  await page.goto("/chat");
  await page.getByRole("button", { name: "Leave contact details for the team" }).click();
  await expect(page.getByTestId("card-lead")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
});

test("widget script on the sample host", async ({ page }) => {
  await page.goto("/embed-demo");
  await expect(page.getByText("This is how the embed looks on a real site")).toBeVisible();
  await expect(page.getByTestId("chat-launcher")).toBeVisible();
  await expect(page.getByTestId("launcher-nudge").first()).toBeVisible();
  await page.getByTestId("chat-launcher").click();
  const frame = page.frameLocator("iframe");
  await expect(frame.getByTestId("composer-input")).toBeVisible();
  await expect(frame.getByTestId("mode-pill")).toHaveText("Demo mode");
  await frame.getByTestId("composer-input").fill("What does the Comfort Club include?");
  await frame.getByTestId("composer-send").click();
  await expect(frame.getByTestId("assistant-text").last()).toContainText("15%");
  await page.screenshot({ path: "docs/screenshots/widget.png" });
});

test("mobile widget is fullscreen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByTestId("chat-launcher").click();
  const widget = page.getByTestId("chat-widget");
  await expect(widget).toBeVisible();
  const box = await widget.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(340);
  await expect(widget.getByRole("button", { name: "Close chat" })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/mobile.png" });
  await page.screenshot({ path: "docs/screenshots/visual/widget-mobile.png" });
});

test("dark mode widget", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("theme", "dark");
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/chat");
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect(page.getByTestId("composer-input")).toBeVisible();
  await page.getByTestId("starter-heat-pump").click();
  await expect(page.getByTestId("card-quote")).toBeVisible();
  await expect(page.getByTestId("card-carousel")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/visual/widget-dark.png" });
});

test("reduced motion still opens", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("launcher-nudge").first()).toBeVisible();
  await page.getByTestId("chat-launcher").click();
  await expect(page.getByTestId("chat-widget")).toBeVisible();
});

test("a11y smoke on landing, embed, and chat", async ({ page }) => {
  for (const path of ["/", "/embed-demo", "/chat"]) {
    await page.goto(path);
    if (path === "/") await page.getByTestId("chat-launcher").click();
    const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
    const serious = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  }
});

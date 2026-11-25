import { expect, test } from "@playwright/test";

test("landing explains the desk", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /quote the visit/i })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText("Portfolio demo by Quvantic - fictional brand, not a real business / not client work");
  await expect(page.getByLabel("Architecture diagram")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/landing.png", fullPage: true });
});

test("cited answer, booking, and gas handoff", async ({ page }) => {
  await page.goto("/chat");
  await page.getByTestId("chat-input").fill("What does the Comfort Club include?");
  await page.getByTestId("send").click();
  await expect(page.getByTestId("assistant-text").last()).toContainText("15%");
  await expect(page.getByText("From the guides").first()).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/citation.png" });

  await page.getByRole("button", { name: "New chat" }).click();
  await page.getByTestId("starter-ac").click();
  await expect(page.getByRole("heading", { name: /not cooling/i })).toBeVisible();
  await expect(page.getByText("From the guides")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/quote.png" });
  await page.getByRole("button", { name: /·/ }).first().click();
  await page.getByRole("button", { name: "Use sample customer" }).click();
  await page.getByRole("button", { name: "Confirm visit" }).click();
  await expect(page.getByRole("heading", { name: /NW-\d{4}/ })).toBeVisible();
  await expect(page.getByLabel("Name")).toBeDisabled();
  await page.screenshot({ path: "docs/screenshots/booking.png" });

  await page.getByRole("button", { name: "New chat" }).click();
  await page.getByTestId("starter-gas").click();
  await expect(page.locator("article[role=alert]")).toContainText("911");
  await expect(page.getByText("Check the filter")).toHaveCount(0);
  await page.screenshot({ path: "docs/screenshots/handoff.png" });
});

test("widget opens from the sample host site", async ({ page }) => {
  await page.goto("/embed-demo");
  await page.getByRole("button", { name: "Open Northwind chat" }).click();
  const frame = page.frameLocator("iframe");
  await expect(frame.getByTestId("chat-input")).toBeVisible();
  await frame.getByTestId("chat-input").fill("What does the Comfort Club include?");
  await frame.getByTestId("send").click();
  await expect(frame.getByTestId("assistant-text").last()).toContainText("15%");
  await page.screenshot({ path: "docs/screenshots/widget.png" });
  await page.getByRole("button", { name: "Close Northwind chat" }).click();
  await expect(page.getByRole("button", { name: "Open Northwind chat" })).toBeVisible();
});

test("dispatch board lists the inbox", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dispatch board" })).toBeVisible();
  await page.getByRole("tab", { name: "Inbox" }).click();
  await expect(page.getByText(/whatsapp|messenger|web|No conversations/i).first()).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/admin.png" });
});

test("mobile chat keeps the composer on screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/chat");
  const send = page.getByTestId("send");
  await expect(send).toBeVisible();
  const box = await send.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.getByTestId("starter-zip").click();
  await expect(page.getByTestId("assistant-text").last()).toContainText(/78613|trip fee/i);
  await page.screenshot({ path: "docs/screenshots/mobile.png" });
});

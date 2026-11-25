import { expect, test } from "@playwright/test";

test("record the desk demo", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto("/");
  await expect(page.getByTestId("launcher-teaser")).toBeVisible();
  await page.waitForTimeout(600);
  await page.getByTestId("chat-launcher").click();
  const widget = page.getByTestId("chat-widget");
  await expect(widget.getByTestId("starter-ac")).toBeVisible();
  await page.waitForTimeout(400);
  await widget.getByTestId("starter-ac").click();
  await expect(widget.getByTestId("card-quote")).toBeVisible();
  await page.waitForTimeout(700);
  await widget.getByRole("button", { name: "Menu" }).click();
  await widget.getByRole("button", { name: "New chat" }).click();
  await widget.getByTestId("starter-gas").click();
  await expect(widget.getByTestId("urgent-banner")).toBeVisible();
  await page.waitForTimeout(800);
});

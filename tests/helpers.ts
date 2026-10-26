import type { Page } from "@playwright/test";
export async function skipOpening(page: Page) {
  const skip = page.getByRole("button", { name: /Skip intro/ });
  if (await skip.isVisible()) await skip.click();
}
export async function openHudEditor(page: Page) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Controls", exact: true }).click();
  await page.getByRole("button", { name: "Custom HUD", exact: true }).click();
}

import { test, expect } from "@playwright/test";
import { PAGES } from "./pages.mjs";

// Pixel baselines. Any colour, font or layout change shows up as a diff.
// First run (or after an intended design change): npm run test:update
for (const pg of PAGES) {
  test(`screenshot ${pg.name}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(pg.path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`${pg.name}.png`, { fullPage: true, mask: [page.locator("img[src$='.gif']")] });
  });
}

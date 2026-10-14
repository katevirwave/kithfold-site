import { defineConfig, devices } from "@playwright/test";

// Serves the repo root (two levels up) exactly as GitHub Pages does.
export default defineConfig({
  testDir: ".",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" } },
  use: { baseURL: "http://127.0.0.1:8787" },
  webServer: {
    command: "python3 -m http.server 8787 --bind 127.0.0.1",
    cwd: "../..",
    url: "http://127.0.0.1:8787/",
    reuseExistingServer: true,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});

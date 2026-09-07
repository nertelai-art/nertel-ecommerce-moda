import { defineConfig, devices } from "@playwright/test";
import { run } from "./tests/e2e/isolated-run";

export default defineConfig({
  testDir: "./tests/e2e",
  projects: [
    {
      name: "desktop-chromium",
      testMatch: ["checkout.e2e.ts", "pwa.e2e.ts"],
      use: {
        browserName: "chromium",
        launchOptions: {
          args: [
            `--ignore-certificate-errors-spki-list=${run.certificateSpki}`,
          ],
        },
      },
    },
    {
      name: "mobile-chromium",
      testMatch: "mobile-pwa.e2e.ts",
      use: {
        ...devices["Pixel 7"],
        launchOptions: {
          args: [
            `--ignore-certificate-errors-spki-list=${run.certificateSpki}`,
          ],
        },
      },
    },
    {
      name: "mobile-webkit",
      testMatch: "mobile-pwa.e2e.ts",
      use: { ...devices["iPhone 13"] },
    },
  ],
  forbidOnly: true,
  retries: 0,
  reporter: "list",
  outputDir: `${process.env.MODA_E2E_RUN_DIR}/test-results`,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 15000 },
  use: {
    baseURL: run.appOrigin,
    // Only disposable loopback origins pass the run guard. No certificate is
    // installed in the OS/browser trust store; production checks stay intact.
    ignoreHTTPSErrors: true,
    headless: true,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});

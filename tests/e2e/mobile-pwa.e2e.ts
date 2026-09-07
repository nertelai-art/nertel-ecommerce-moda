import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

async function fitsViewport(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("touch navigation, installation help, icons and connectivity recovery", async ({
  page,
  context,
  browserName,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  // Playwright only supports service worker automation on Chromium.
  if (browserName === "chromium") {
    await expect
      .poll(() =>
        page.evaluate(
          async () =>
            (await navigator.serviceWorker.getRegistration())?.active?.state,
        ),
      )
      .toBe("activated");
    await expect
      .poll(() =>
        page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      )
      .toBe(true);
  }
  await expect(page.locator("header img")).toBeVisible();
  expect(
    await page
      .locator("header img")
      .evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
  ).toBe(true);
  await fitsViewport(page);
  const favicon = await page.request.get("/favicon.ico");
  expect(favicon.ok()).toBe(true);
  expect((await favicon.body()).readUInt16LE(2)).toBe(1);
  const appleIcon = await page.request.get("/pwa/apple-touch-icon.png");
  expect((await appleIcon.body()).readUInt32BE(16)).toBe(180);
  await page.getByText("Instal·lar la botiga", { exact: true }).tap();
  await expect(page.getByText(/A l’iPhone o l’iPad/)).toBeVisible();
  await fitsViewport(page);
  await page.getByRole("link", { name: "Col·lecció", exact: true }).tap();
  await expect(page).toHaveURL(/\/cataleg$/);
  await fitsViewport(page);
  await page.goto("/productes/vestit-alba");
  await page
    .getByRole("button", { name: "Afegir Vestit Alba, M, sorra al carret" })
    .tap();
  await page.getByRole("link", { name: /Carret/ }).tap();
  const reserve = page.getByRole("button", { name: "Reservar estoc" });
  await expect(reserve).toBeEnabled();
  await fitsViewport(page);
  await context.setOffline(true);
  await expect(reserve).toBeDisabled();
  await expect(page.getByText(/Sense connexió\. Connecta’t/)).toBeVisible();
  if (browserName === "chromium") {
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Ara no tens connexió." }),
    ).toBeVisible();
    await fitsViewport(page);
    await context.setOffline(false);
    await page.getByRole("button", { name: "Tornar-ho a provar" }).tap();
  } else {
    await context.setOffline(false);
  }
  await expect(reserve).toBeEnabled();
  expect(errors).toEqual([]);
});

test("a browser that denies storage still supports an in-memory cart", async ({
  page,
  context,
}, testInfo) => {
  await context.addInitScript(() => {
    for (const method of ["getItem", "setItem", "removeItem"]) {
      Object.defineProperty(Storage.prototype, method, {
        configurable: true,
        value: () => {
          throw new DOMException("Storage denied", "SecurityError");
        },
      });
    }
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/productes/vestit-alba");
  await page
    .getByRole("button", { name: "Afegir Vestit Alba, M, sorra al carret" })
    .tap();
  await page.getByRole("link", { name: /Carret/ }).tap();
  await expect(
    page.getByRole("button", { name: "Reservar estoc" }),
  ).toBeEnabled();
  await expect(
    page.getByText(/El navegador no permet desar el carret/),
  ).toBeVisible();
  // Public fixture only, for local visual review; never uploaded by CI.
  await page.screenshot({
    path: path.join(
      process.cwd(),
      ".e2e",
      `mobile-cart-${testInfo.project.name}.png`,
    ),
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByText("El carret és buit.", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

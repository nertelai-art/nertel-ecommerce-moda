import { test, expect, type Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { run } from "./isolated-run";

async function controlled(page: Page) {
  await page.goto("/");
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

const shellAssets = [
  "/offline.html",
  "/pwa/offline.css",
  "/pwa/offline.js",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/icon-maskable-512.png",
  "/pwa/apple-touch-icon.png",
].sort();

test("PWA manifest, icons, mobile installation help and worker security", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await controlled(page);
  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    id: "/",
    scope: "/",
    start_url: "/",
    display: "standalone",
    lang: "ca",
  });
  expect(manifest.name.length).toBeGreaterThan(0);
  for (const icon of manifest.icons) {
    const response = await page.request.get(icon.src);
    expect(response.headers()["content-type"]).toContain("image/png");
    const png = await response.body();
    const [width, height] = icon.sizes.split("x").map(Number);
    expect(png.readUInt32BE(16)).toBe(width);
    expect(png.readUInt32BE(20)).toBe(height);
  }
  const cdp = await context.newCDPSession(page);
  const browserManifest = await cdp.send("Page.getAppManifest");
  expect(browserManifest.errors).toEqual([]);
  expect(JSON.parse(browserManifest.data!)).toMatchObject({
    name: manifest.name,
  });
  const sw = await page.request.get("/sw.js");
  expect(sw.headers()["cache-control"]).toContain("no-store");
  expect(sw.headers()["service-worker-allowed"]).toBe("/");
  const html = await page.request.get("/");
  expect(html.headers()["content-security-policy"]).toContain(
    "worker-src 'self'",
  );
  await page.getByText("Instal·lar la botiga", { exact: true }).click();
  await expect(page.getByText(/A l’iPhone o l’iPad/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  // Exercise the optional prompt's UI with a synthetic browser event. Native
  // OS installation still requires a real-device acceptance check.
  await page.evaluate(() => {
    const event = Object.assign(
      new Event("beforeinstallprompt", { cancelable: true }),
      {
        prompt: async () => {},
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      },
    );
    window.dispatchEvent(event);
  });
  await page
    .getByRole("button", { name: "Afegir a la pantalla d’inici" })
    .click();
  await expect(
    page.getByText("Pots continuar comprant des del navegador."),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("offline blocks purchase and never restores a private account or API response", async ({
  page,
  context,
}) => {
  await controlled(page);
  await page.goto("/auth/entrar");
  await page.getByLabel("Correu electrònic").fill(run.email);
  await page.getByLabel("Contrasenya", { exact: true }).fill(run.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/compte$/);
  await expect(page.getByText(run.email, { exact: true })).toBeVisible();
  await page.goto("/productes/vestit-alba");
  await page
    .getByRole("button", { name: "Afegir Vestit Alba, M, sorra al carret" })
    .click();
  await page.getByRole("link", { name: /Carret/ }).click();
  await expect(
    page.getByRole("button", { name: "Reservar estoc" }),
  ).toBeEnabled();
  const storedCart = await page.evaluate(() =>
    localStorage.getItem("moda.cart.v1"),
  );
  let writes = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      /\/api\/(cart\/reserve|cart\/cancel|checkout\/prepare)/.test(
        request.url(),
      )
    )
      writes++;
  });
  await context.setOffline(true);
  await expect(
    page.getByRole("button", { name: "Reservar estoc" }),
  ).toBeDisabled();
  await expect(page.getByText(/Sense connexió\. Connecta’t/)).toBeVisible();
  await context.setOffline(false);
  await expect(
    page.getByRole("button", { name: "Reservar estoc" }),
  ).toBeEnabled();
  expect(writes).toBe(0);
  await context.setOffline(true);
  for (const route of [
    "/compte",
    "/admin",
    "/carret",
    "/auth/entrar",
    "/cataleg",
  ]) {
    await page.goto(route);
    await expect(
      page.getByRole("heading", { name: "Ara no tens connexió." }),
    ).toBeVisible();
    await expect(page.getByText(run.email, { exact: true })).toHaveCount(0);
  }
  expect(await page.evaluate(() => localStorage.getItem("moda.cart.v1"))).toBe(
    storedCart,
  );
  expect(
    await page.evaluate(async () => {
      try {
        await fetch("/api/checkout/current");
        return "unexpected response";
      } catch {
        return "network unavailable";
      }
    }),
  ).toBe("network unavailable");
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    return (
      await Promise.all(
        keys.map(async (key) =>
          (await (await caches.open(key)).keys()).map(
            (request) => new URL(request.url).pathname,
          ),
        ),
      )
    )
      .flat()
      .sort();
  });
  expect(cached).toEqual(shellAssets);
  await context.setOffline(false);
  await page.getByRole("button", { name: "Tornar-ho a provar" }).click();
  await expect(
    page.getByRole("heading", { name: "Ara no tens connexió." }),
  ).toHaveCount(0);
  expect(writes).toBe(0);
});

test("a worker update waits for open windows and removes only its old shell", async ({
  page,
  context,
}) => {
  await controlled(page);
  const workerPath = path.join(
    process.env.MODA_E2E_RUN_DIR!,
    "app",
    "public",
    "sw.js",
  );
  const original = readFileSync(workerPath, "utf8");
  const updated = original.replace(
    /const VERSION = "[^"]+";/,
    'const VERSION = "v1-e2e-update";',
  );
  expect(updated).not.toBe(original);
  await page.evaluate(async () => {
    await caches.open("unrelated-cache");
  });
  const controllerUrl = await page.evaluate(
    () => navigator.serviceWorker.controller?.scriptURL,
  );
  await page.goto("/carret");
  writeFileSync(workerPath, updated);
  try {
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.ready).update();
    });
    await expect(page.getByText(/Hi ha una versió nova\./)).toBeVisible();
    await expect(page).toHaveURL(/\/carret$/);
    expect(
      await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL),
    ).toBe(controllerUrl);
    expect(
      await page.evaluate(async () =>
        Boolean((await navigator.serviceWorker.ready).waiting),
      ),
    ).toBe(true);
    await page.close();
    const reopened = await context.newPage();
    await controlled(reopened);
    await expect
      .poll(() => reopened.evaluate(async () => (await caches.keys()).sort()))
      .toEqual(["moda-pwa-shell-v1-e2e-update", "unrelated-cache"].sort());
    await expect(reopened.getByText(/Hi ha una versió nova\./)).toHaveCount(0);
  } finally {
    writeFileSync(workerPath, original);
  }
});

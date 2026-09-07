import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { run, sql } from "./isolated-run";

const variant = "30000000-0000-4000-8000-000000000001";
const location = "40000000-0000-4000-8000-000000000001";
const inventory = () =>
  JSON.parse(
    sql(
      `select row_to_json(i) from (select on_hand, reserved from private.inventory_levels where variant_id='${variant}' and location_id='${location}') i`,
    ),
  ) as { on_hand: number; reserved: number };

test.beforeEach(() => {
  // The run guard verifies the exact disposable container before every query.
  expect(inventory().reserved).toBe(0);
  sql(
    `update private.inventory_levels set on_hand=1 where variant_id='${variant}' and location_id='${location}'`,
  );
});

test("login, cart, authoritative quote, order, reload, cancel and logout", async ({
  page,
  context,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/compte");
  await expect(page).toHaveURL(new RegExp("/auth/entrar$"));
  await page.getByLabel("Correu electrònic").fill(run.email);
  await page.getByLabel("Contrasenya", { exact: true }).fill(run.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("/compte$"));
  await expect(page.getByText(run.email, { exact: true })).toBeVisible();
  const cookies = (await context.cookies()).filter((cookie) =>
    cookie.name.includes("auth-token"),
  );
  expect(cookies.length).toBeGreaterThan(0);
  expect(
    cookies.every(
      (cookie) => cookie.httpOnly && cookie.secure && cookie.sameSite === "Lax",
    ),
  ).toBe(true);
  await page.goto("/productes/vestit-alba");
  await page
    .getByRole("button", { name: "Afegir Vestit Alba, M, sorra al carret" })
    .click();
  await page.getByRole("link", { name: /Carret/ }).click();
  await expect(page.getByText(/Total:.*89,90/)).toBeVisible();
  await page.getByRole("button", { name: "Reservar estoc" }).click();
  await expect(page.getByLabel("Destinatari")).toBeVisible();
  expect(inventory()).toEqual({ on_hand: 1, reserved: 1 });
  await page.getByLabel("Correu electrònic").fill(run.email);
  await page.getByLabel("Destinatari").fill("Client de prova");
  await page.getByLabel("Adreça", { exact: true }).fill("Carrer de prova 1");
  await page.getByLabel("Ciutat").fill("Barcelona");
  await page.getByLabel("Codi postal").fill("08001");
  await page.getByRole("button", { name: "Crear comanda pendent" }).click();
  await expect(page.getByText("Preparada per al pagament")).toBeVisible();
  const order = JSON.parse(
    sql(
      `select row_to_json(o) from (select id,status,amount_minor,customer_id from private.orders where email='${run.email}') o`,
    ),
  ) as {
    id: string;
    status: string;
    amount_minor: number;
    customer_id: string;
  };
  expect(order.status).toBe("pending_payment");
  expect(order.amount_minor).toBe(8990);
  expect(order.customer_id).toBe(run.buyerId);
  expect(
    sql(
      `select count(*) from private.payment_attempts where order_id='${order.id}' and status='requires_provider'`,
    ),
  ).toBe("1");
  await page.reload();
  await expect(page.getByText("Preparada per al pagament")).toBeVisible();
  expect(
    sql(`select count(*) from private.orders where email='${run.email}'`),
  ).toBe("1");
  await page.getByRole("button", { name: "Cancel·lar comanda" }).click();
  await expect(page.getByText("El carret és buit.")).toBeVisible();
  expect(inventory()).toEqual({ on_hand: 1, reserved: 0 });
  expect(sql(`select status from private.orders where id='${order.id}'`)).toBe(
    "cancelled",
  );
  expect(
    sql(
      `select status from private.payment_attempts where order_id='${order.id}'`,
    ),
  ).toBe("cancelled");
  await page.goto("/compte");
  await page.getByRole("button", { name: "Tancar totes les sessions" }).click();
  await expect(page).toHaveURL(new RegExp("/auth/entrar$"));
  await page.goto("/compte");
  await expect(page).toHaveURL(new RegExp("/auth/entrar$"));
  expect(pageErrors).toEqual([]);
});

test("two independent buyers compete for the last unit and retries are idempotent", async ({
  browser,
}) => {
  const contexts = await Promise.all(
    [0, 1].map(() => browser.newContext({ ignoreHTTPSErrors: true })),
  );
  const keys = [randomUUID(), randomUUID()];
  const body = (index: number) => ({
    items: [{ variantId: variant, quantity: 1 }],
    requestKey: keys[index],
  });
  try {
    const buyers = await Promise.all(
      contexts.map(async (context) => {
        const page = await context.newPage();
        await page.goto(run.appOrigin);
        return {
          async post(url: string, options?: { data: unknown }) {
            const response = await page.evaluate(
              async ({ url, data }) => {
                const result = await fetch(url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: data === undefined ? null : JSON.stringify(data),
                });
                return { status: result.status, body: await result.text() };
              },
              { url, data: options?.data },
            );
            return {
              status: () => response.status,
              ok: () => response.status >= 200 && response.status < 300,
              json: async () => JSON.parse(response.body),
            };
          },
        };
      }),
    );
    const responses = await Promise.all(
      buyers.map((buyer, index) =>
        buyer.post("/api/cart/reserve", { data: body(index) }),
      ),
    );
    expect(responses.map((response) => response.status()).sort()).toEqual([
      200, 409,
    ]);
    expect(inventory()).toEqual({ on_hand: 1, reserved: 1 });
    const winnerIndex = responses.findIndex((response) => response.ok());
    const winner = buyers[winnerIndex]!;
    const loser = buyers[1 - winnerIndex]!;
    const original = await responses[winnerIndex]!.json();
    const retry = await winner.post("/api/cart/reserve", {
      data: body(winnerIndex),
    });
    expect(retry.status()).toBe(200);
    expect(await retry.json()).toEqual(original);
    expect(inventory().reserved).toBe(1);
    const tamper = await winner.post("/api/cart/reserve", {
      data: {
        ...body(winnerIndex),
        items: [{ variantId: variant, quantity: 2 }],
      },
    });
    expect(tamper.status()).toBe(409);
    expect((await winner.post("/api/cart/cancel")).status()).toBe(204);
    expect(inventory().reserved).toBe(0);
    expect(
      (
        await loser.post("/api/cart/reserve", { data: body(1 - winnerIndex) })
      ).status(),
    ).toBe(200);
    expect(inventory().reserved).toBe(1);
    expect((await loser.post("/api/cart/cancel")).status()).toBe(204);
    expect(inventory()).toEqual({ on_hand: 1, reserved: 0 });
  } finally {
    await Promise.all(contexts.map((buyer) => buyer.close()));
  }
});

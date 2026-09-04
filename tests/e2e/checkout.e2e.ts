import { test, expect, request as playwrightRequest } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

test.skip(
  process.env.LOCAL_AUTH_E2E !== "1",
  "Explicit local-only checkout test.",
);

const sql = (statement: string) =>
  execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_nertel-ecommerce-moda",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-tAc",
      statement,
    ],
    { encoding: "utf8" },
  ).trim();

test("cart, reservation, pending order, reload and cancellation", async ({
  page,
}) => {
  const email = `checkout-${randomUUID().replaceAll("-", "")}@example.invalid`;
  const variant = "30000000-0000-4000-8000-000000000001";
  const location = "40000000-0000-4000-8000-000000000001";
  const original = Number(
    sql(
      `select on_hand from private.inventory_levels where variant_id='${variant}' and location_id='${location}'`,
    ),
  );
  try {
    sql(
      `update private.inventory_levels set on_hand=1,reserved=0 where variant_id='${variant}' and location_id='${location}'`,
    );
    await page.goto("/productes/vestit-alba");
    await page
      .getByRole("button", { name: "Afegir Vestit Alba, M, sorra al carret" })
      .click();
    await page.getByRole("link", { name: /Carret/ }).click();
    await page.getByRole("button", { name: "Reservar estoc" }).click();
    await page.getByLabel("Correu electrònic").fill(email);
    await page.getByLabel("Destinatari").fill("Client E2E");
    await page.getByLabel("Adreça", { exact: true }).fill("Carrer de prova 1");
    await page.getByLabel("Ciutat").fill("Barcelona");
    await page.getByLabel("Codi postal").fill("08001");
    await page.getByRole("button", { name: "Crear comanda pendent" }).click();
    await expect(page.getByText("Preparada per al pagament")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Preparada per al pagament")).toBeVisible();
    await page.getByRole("button", { name: "Cancel·lar comanda" }).click();
    await expect(page.getByText("El carret és buit.")).toBeVisible();
    expect(
      Number(
        sql(
          `select reserved from private.inventory_levels where variant_id='${variant}' and location_id='${location}'`,
        ),
      ),
    ).toBe(0);
  } finally {
    sql(
      `delete from private.checkout_requests where order_id in (select id from private.orders where email='${email}')`,
    );
    sql(
      `delete from private.payment_attempts where order_id in (select id from private.orders where email='${email}')`,
    );
    sql(
      `delete from private.order_items where order_id in (select id from private.orders where email='${email}')`,
    );
    const session = sql(
      `select checkout_session_id from private.orders where email='${email}' limit 1`,
    );
    sql(`delete from private.orders where email='${email}'`);
    if (session) {
      sql(
        `delete from private.stock_reservations where checkout_session_id='${session}'`,
      );
      sql(
        `delete from private.reservation_requests where checkout_session_id='${session}'`,
      );
      sql(`delete from private.checkout_sessions where id='${session}'`);
    }
    sql(
      `update private.inventory_levels set on_hand=${original},reserved=0 where variant_id='${variant}' and location_id='${location}'`,
    );
  }
});

test("two simultaneous buyers cannot reserve the same unit", async () => {
  const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
  const variant = "30000000-0000-4000-8000-000000000001";
  const location = "40000000-0000-4000-8000-000000000001";
  const original = Number(
    sql(
      `select on_hand from private.inventory_levels where variant_id='${variant}' and location_id='${location}'`,
    ),
  );
  const first = await playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: { Origin: baseURL },
  });
  const second = await playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: { Origin: baseURL },
  });
  try {
    sql(
      `update private.inventory_levels set on_hand=1,reserved=0 where variant_id='${variant}' and location_id='${location}'`,
    );
    const body = (requestKey: string) => ({
      items: [{ variantId: variant, quantity: 1 }],
      requestKey,
    });
    const responses = await Promise.all([
      first.post("/api/cart/reserve", { data: body(randomUUID()) }),
      second.post("/api/cart/reserve", { data: body(randomUUID()) }),
    ]);
    expect(responses.map((response) => response.status()).sort()).toEqual([
      200, 409,
    ]);
    const winner = responses[0]!.ok() ? first : second;
    await winner.post("/api/cart/cancel");
  } finally {
    await first.dispose();
    await second.dispose();
    sql(
      `delete from private.stock_reservations where checkout_session_id in (select id from private.checkout_sessions where user_id is null)`,
    );
    sql(
      `delete from private.reservation_requests where checkout_session_id in (select id from private.checkout_sessions where user_id is null)`,
    );
    sql(
      "delete from private.checkout_sessions where user_id is null and not exists(select 1 from private.orders where checkout_session_id=checkout_sessions.id)",
    );
    sql(
      `update private.inventory_levels set on_hand=${original},reserved=0 where variant_id='${variant}' and location_id='${location}'`,
    );
  }
});

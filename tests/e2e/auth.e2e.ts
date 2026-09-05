import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

test.skip(
  process.env.LOCAL_AUTH_E2E !== "1",
  "Explicit opt-in: creates and deletes synthetic users in the local Docker DB only.",
);

async function mailboxCode(
  request: APIRequestContext,
  mailbox: string,
  recovery = false,
) {
  let code: string | undefined;
  await expect
    .poll(async () => {
      const response = await request.get(
        "http://127.0.0.1:55324/api/v1/search",
        { params: { query: "to:" + mailbox + "@example.invalid" } },
      );
      const { messages } = await response.json();
      const latest = messages.find((message: { Subject: string }) =>
        recovery
          ? /reset|recover|recuper/i.test(message.Subject)
          : /confirm/i.test(message.Subject),
      );
      if (!latest) return false;
      const message = await (
        await request.get("http://127.0.0.1:55324/api/v1/message/" + latest.ID)
      ).json();
      code = ((message.Text ?? "") + " " + (message.HTML ?? "")).match(
        /\b[0-9]{6}\b/,
      )?.[0];
      return Boolean(code);
    })
    .toBe(true);
  return code!;
}
test("local account lifecycle, HttpOnly cookies and live staff authorization", async ({
  page,
  request,
  context,
}) => {
  const mailbox = "moda-e2e-" + randomUUID().replaceAll("-", "");
  const email = mailbox + "@example.invalid";
  const password = "Local-" + randomUUID();
  const newPassword = "New-" + randomUUID();
  let inventoryReference: string | null = null;
  if (!/^moda-e2e-[a-f0-9]{32}@example\.invalid$/.test(email))
    throw new Error("Unsafe fixture identity");
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
  const originalOnHand = Number(
    sql(
      "select on_hand from private.inventory_levels where variant_id='30000000-0000-4000-8000-000000000001' and location_id='40000000-0000-4000-8000-000000000001'",
    ),
  );
  try {
    await page.goto("/compte");
    await expect(page).toHaveURL(/\/auth\/entrar$/);
    await page
      .getByRole("link", { name: "Crea un compte", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Crea el teu compte", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading")).toHaveCount(1);
    await page.getByLabel("Correu electrònic").fill(email);
    await page.locator("form").evaluate((form) => {
      (form as HTMLFormElement).noValidate = true;
    });
    await page.getByLabel("Contrasenya", { exact: true }).fill("massa-curta");
    await page
      .getByRole("button", { name: "Crear compte", exact: true })
      .click();
    await expect(page.locator('form [role="alert"]')).toContainText(
      "La contrasenya ha de tenir",
    );
    await expect(page.getByLabel("Correu electrònic")).toHaveValue(email);
    await expect(page.getByLabel("Contrasenya", { exact: true })).toHaveValue(
      "",
    );
    await page.getByLabel("Contrasenya", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Crear compte", exact: true })
      .click();
    await expect(page).toHaveURL(/\/compte$/);
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    const sessionCookies = (await context.cookies()).filter((cookie) =>
      cookie.name.includes("auth-token"),
    );
    expect(sessionCookies.length).toBeGreaterThan(0);
    expect(
      sessionCookies.every(
        (cookie) =>
          cookie.httpOnly && cookie.sameSite === "Lax" && cookie.path === "/",
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() => document.cookie.includes("auth-token")),
    ).toBe(false);

    await page
      .getByRole("button", { name: "Tancar totes les sessions" })
      .click();
    await expect(page).toHaveURL(/\/auth\/entrar$/);
    await page.goto("/compte");
    await expect(page).toHaveURL(/\/auth\/entrar$/);
    await page.getByRole("link", { name: "He oblidat la contrasenya" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Has oblidat la contrasenya?",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading")).toHaveCount(1);
    await page.getByLabel("Correu electrònic").fill(email);
    await page.getByRole("button", { name: "Enviar codi" }).click();
    await expect(
      page.getByRole("heading", { name: "Revisa el teu correu" }),
    ).toBeVisible();
    const recovery = await mailboxCode(request, mailbox, true);

    await page.getByLabel("Codi del correu").fill(recovery);
    await page
      .getByRole("button", { name: "Validar codi", exact: true })
      .click();
    await expect(page).toHaveURL(/\/compte\/contrasenya$/);
    await page
      .getByLabel("Nova contrasenya", { exact: true })
      .fill(newPassword);
    await page
      .getByRole("button", { name: "Canviar contrasenya", exact: true })
      .click();
    await expect(page).toHaveURL(/\/auth\/entrar$/);
    await expect(page.getByRole("heading")).toHaveCount(1);
    await page.getByLabel("Correu electrònic").fill(email);
    await page.getByLabel("Contrasenya", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/\/compte$/);
    await page.goto("/admin");
    await expect(
      page.getByText("Aquest compte no té permisos d’administració."),
    ).toBeVisible();
    sql(
      "insert into private.staff_permissions(user_id,permission) select id,permission from auth.users cross join (values ('catalog.manage'),('inventory.manage')) p(permission) where email='" +
        email +
        "'",
    );
    await page.reload();
    await expect(page.getByRole("heading", { name: "Bon dia." })).toBeVisible();
    await page.getByRole("link", { name: "Inventari", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Inventari" }),
    ).toBeVisible();
    await page.getByRole("searchbox", { name: "CERCAR" }).fill("ALBA-M");
    await expect(page).toHaveURL(/q=ALBA-M/);
    await expect(
      page.locator("article").filter({ hasText: "ALBA-M-SORRA" }),
    ).toHaveCount(1);
    await page.getByRole("searchbox", { name: "CERCAR" }).fill("");
    await expect(page).not.toHaveURL(/q=/);
    const inventoryCard = page
      .locator("article")
      .filter({ hasText: "ALBA-M-SORRA" });
    await inventoryCard
      .getByText("Registrar una entrada o sortida d’estoc")
      .click();
    inventoryReference = await inventoryCard
      .locator('input[name="idempotencyKey"]')
      .getAttribute("value");
    expect(inventoryReference).toMatch(/^[0-9a-f-]{36}$/);
    await inventoryCard.getByLabel("Variació d’estoc").fill("1");
    await inventoryCard.getByLabel("Motiu").fill("Ajust E2E reversible");
    await inventoryCard
      .getByRole("button", { name: "Registrar ajust" })
      .click();
    await expect(
      page.getByText("Estoc actualitzat i moviment registrat."),
    ).toBeVisible();
    const adjustedCard = page
      .locator("article")
      .filter({ hasText: "ALBA-M-SORRA" });
    await expect(
      adjustedCard.getByLabel(`Físic: ${originalOnHand + 1}`),
    ).toBeVisible();
    sql(
      "delete from private.staff_permissions where user_id=(select id from auth.users where email='" +
        email +
        "')",
    );
    await page.reload();
    await expect(
      page.getByText("Aquest compte no té permisos d’administració."),
    ).toBeVisible();
  } finally {
    if (inventoryReference) {
      sql(
        "delete from private.stock_movements where reference_key='" +
          inventoryReference +
          "'",
      );
      sql(
        "update private.inventory_levels set on_hand=" +
          originalOnHand +
          " where variant_id='30000000-0000-4000-8000-000000000001' and location_id='40000000-0000-4000-8000-000000000001'",
      );
    }
    // Only this generated fixture account; cascade removes its sessions and factors.
    sql("delete from auth.users where email='" + email + "'");
    await context.clearCookies();
  }
});

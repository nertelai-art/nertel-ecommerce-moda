import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomUUID, createHmac } from "node:crypto";
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
function totp(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of secret.replace(/=+$/, ""))
    bits += alphabet.indexOf(character).toString(2).padStart(5, "0");
  const bytes = Buffer.from(
    bits.match(/.{8}/g)!.map((byte) => Number.parseInt(byte, 2)),
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", bytes).update(counter).digest();
  const offset = digest[digest.length - 1]! & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}

test("local account lifecycle, HttpOnly cookies, MFA and live staff authorization", async ({
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
      page.getByText("Verifica el segon factor per comprovar el teu accés."),
    ).toBeVisible();

    await page.goto("/compte/seguretat");
    await page.getByRole("button", { name: "Configurar autenticador" }).click();
    await expect(page.locator("code")).toBeVisible();
    const secret = await page.locator("code").innerText();
    await page.getByLabel("Codi de l’autenticador").fill(totp(secret));
    await page
      .getByRole("button", { name: "Verificar autenticador", exact: true })
      .click();
    await expect(page).toHaveURL(/\/compte$/);
    await expect(
      page.getByText("Sessió verificada amb segon factor."),
    ).toBeVisible();
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
    await expect(
      page.getByText("catalog.manage", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("inventory.manage", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Inventari" }),
    ).toBeVisible();
    inventoryReference = await page
      .locator('input[name="idempotencyKey"]')
      .getAttribute("value");
    expect(inventoryReference).toMatch(/^[0-9a-f-]{36}$/);
    await page.getByLabel("Variació d’estoc").fill("1");
    await page.getByLabel("Motiu").fill("Ajust E2E reversible");
    await page.getByRole("button", { name: "Registrar ajust" }).click();
    await expect(
      page.getByText("Estoc actualitzat i moviment registrat."),
    ).toBeVisible();
    await expect(
      page.getByText(
        `Ubicació fictícia: ${originalOnHand + 1} disponibles físicament, 0 reservats.`,
      ),
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

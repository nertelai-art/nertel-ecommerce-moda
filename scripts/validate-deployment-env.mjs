import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const expected = process.argv[2];
const failures = [];
const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);

if (!new Set(["preproduction", "production"]).has(expected)) {
  throw new Error(
    "Usage: validate-deployment-env.mjs preproduction|production",
  );
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) failures.push(`${name}: missing`);
  return value ?? "";
}

function secureOrigin(name) {
  const value = required(name);
  if (!value) return;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      loopback.has(url.hostname)
    ) {
      failures.push(`${name}: must be a clean, non-local HTTPS origin`);
    }
  } catch {
    failures.push(`${name}: invalid URL`);
  }
}

function jwtRole(value) {
  try {
    return JSON.parse(
      Buffer.from(value.split(".")[1] ?? "", "base64url").toString(),
    ).role;
  } catch {
    return undefined;
  }
}

if (required("DEPLOYMENT_ENV") !== expected) {
  failures.push(`DEPLOYMENT_ENV: expected ${expected}`);
}
secureOrigin("APP_ORIGIN");
secureOrigin("SUPABASE_URL");

const publishable = required("SUPABASE_PUBLISHABLE_KEY");
const secret = required("SUPABASE_SECRET_KEY");
if (
  publishable &&
  !publishable.startsWith("sb_publishable_") &&
  jwtRole(publishable) !== "anon"
) {
  failures.push("SUPABASE_PUBLISHABLE_KEY: not a publishable/anon key");
}
if (
  secret &&
  !secret.startsWith("sb_secret_") &&
  jwtRole(secret) !== "service_role"
) {
  failures.push("SUPABASE_SECRET_KEY: not a server secret/service-role key");
}
if (publishable && secret && publishable === secret) {
  failures.push("Supabase public and server keys must differ");
}
if (process.env.PAYMENTS_MODE !== "disabled") {
  failures.push("PAYMENTS_MODE: must remain disabled before Stripe is audited");
}

if (failures.length) {
  console.error(
    `Deployment environment rejected (${failures.length} issue(s)):`,
  );
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `${expected} environment is structurally safe; no secret values printed.`,
  );
}

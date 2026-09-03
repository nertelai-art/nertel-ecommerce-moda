import { z } from "zod";

export function publicCatalogConfig(
  environment: Record<string, string | undefined>,
) {
  const url = z.url().parse(environment.SUPABASE_URL);
  const parsed = new URL(url);
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/" ||
    !(
      parsed.protocol === "https:" ||
      (parsed.protocol === "http:" &&
        ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname))
    )
  ) {
    throw new Error("Invalid public catalog configuration");
  }
  const key = z.string().min(1).parse(environment.SUPABASE_PUBLISHABLE_KEY);
  if (!key.startsWith("sb_publishable_")) {
    // The local CLI still provides a legacy anon JWT. Never accept service_role.
    const payload = key.split(".")[1];
    if (
      !payload ||
      JSON.parse(Buffer.from(payload, "base64url").toString()).role !== "anon"
    )
      throw new Error("The catalog requires a public key");
  }
  return { url: parsed.origin, key };
}

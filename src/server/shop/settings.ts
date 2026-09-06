import "server-only";
import {
  shopSettingsSchema,
  type ShopSettings,
} from "@/features/shop/settings";
import { publicCatalogConfig } from "@/server/integrations/supabase/public-config";

// La identitat de la instància no pot canviar sense una migració i un
// desplegament nous, així que es llegeix una vegada per procés. Es desa la
// promesa i no el valor perquè dues peticions simultànies no facin dues
// crides mentre la primera encara vola.
let pending: Promise<ShopSettings> | null = null;

async function readShopSettings(): Promise<ShopSettings> {
  try {
    const config = publicCatalogConfig(process.env);
    const response = await fetch(`${config.url}/rest/v1/rpc/shop_settings`, {
      method: "POST",
      headers: {
        apikey: config.key,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Shop settings request failed");
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length !== 1) {
      throw new Error("Shop settings must be a single row");
    }
    return shopSettingsSchema.parse(rows[0]);
  } catch {
    // Mai reenviar respostes, capçaleres ni claus del proveïdor als registres.
    throw new Error("Shop settings unavailable");
  }
}

export function shopSettings(): Promise<ShopSettings> {
  // Un error no es memoritza: si la primera lectura falla, la següent petició
  // ho torna a intentar en comptes d'arrossegar la fallada tot el procés.
  pending ??= readShopSettings().catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
}

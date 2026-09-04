import { productImageDeleteSchema } from "@/features/catalog/image";
import { publicCatalogConfig } from "@/server/integrations/supabase/public-config";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = productImageDeleteSchema.safeParse(await params);
  if (!parsed.success) return new Response(null, { status: 404 });
  const config = publicCatalogConfig(process.env);
  const query = new URLSearchParams({
    select: "object_path,mime_type",
    id: `eq.${parsed.data.id}`,
    limit: "1",
  });
  const metadata = await fetch(
    `${config.url}/rest/v1/product_images?${query}`,
    {
      headers: { apikey: config.key },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!metadata.ok) return new Response(null, { status: 404 });
  const rows = (await metadata.json()) as unknown;
  if (!Array.isArray(rows) || rows.length !== 1)
    return new Response(null, { status: 404 });
  const row = rows[0] as { object_path?: unknown; mime_type?: unknown };
  if (typeof row.object_path !== "string" || typeof row.mime_type !== "string")
    return new Response(null, { status: 404 });
  const object = await fetch(
    `${config.url}/storage/v1/object/authenticated/product-images/${encodeURI(row.object_path)}`,
    {
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!object.ok || !object.body) return new Response(null, { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": row.mime_type,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

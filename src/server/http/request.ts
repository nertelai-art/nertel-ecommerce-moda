import "server-only";
import { createHash } from "node:crypto";

export async function readJsonBody(
  request: Request,
  maximum: number,
): Promise<unknown> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new Error("Invalid content type");
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength < 1 || bytes.byteLength > maximum)
    throw new Error("Invalid payload size");
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export async function readMultipartBody(request: Request, maximum: number) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;"))
    throw new Error("Invalid content type");
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength < 1 || bytes.byteLength > maximum)
    throw new Error("Invalid payload size");
  return new Response(bytes, {
    headers: { "Content-Type": contentType },
  }).formData();
}

export function commerceRateKey(request: Request) {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    "local";
  const address = forwarded.split(",", 1)[0]!.trim().slice(0, 128);
  return createHash("sha256").update(address).digest("hex");
}

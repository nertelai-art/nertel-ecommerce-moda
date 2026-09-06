import "server-only";
import { createHash } from "node:crypto";
import { commerceRateSubject } from "@/features/commerce/rate-key";

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

/**
 * La sessió de compra és el recanvi quan no hi ha cap adreça de confiança; per
 * això la demana qui crida, que ja la té a la mà. Null quan no hi ha cap de les
 * dues: la base de dades ho entén com «no limitis», que és millor que les dues
 * alternatives possibles sense identitat del client.
 */
export function commerceRateKey(request: Request, sessionToken: string | null) {
  const subject = commerceRateSubject(
    request.headers,
    sessionToken,
    process.env.TRUST_FORWARDED_FOR === "1",
  );
  return subject === null
    ? null
    : createHash("sha256").update(subject).digest("hex");
}

import "server-only";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { commerceRateSubject } from "@/features/commerce/rate-key";
import { readBoundedBody } from "@/lib/request-body";

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
  const bytes = await readBoundedBody(request, maximum);
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export async function readMultipartBody(request: Request, maximum: number) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;"))
    throw new Error("Invalid content type");
  const bytes = await readBoundedBody(request, maximum);
  return new Response(bytes, {
    headers: { "Content-Type": contentType },
  }).formData();
}

/** Production requires a trusted address; session fallback is local only. */
export function commerceRateKey(request: Request, sessionToken: string | null) {
  const subject = commerceRateSubject(
    request.headers,
    sessionToken,
    process.env.TRUST_FORWARDED_FOR === "1",
    process.env.VERCEL === "1",
  );
  if (
    (process.env.NODE_ENV === "production" &&
      !subject?.startsWith("address:")) ||
    (subject?.startsWith("address:") && !isIP(subject.slice(8)))
  ) {
    console.error("commerce_trusted_address_unavailable");
    return new Response("Commerce temporarily unavailable", { status: 503 });
  }
  return subject === null
    ? null
    : createHash("sha256").update(subject).digest("hex");
}

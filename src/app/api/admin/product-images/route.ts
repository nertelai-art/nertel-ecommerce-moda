import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAllowedRequestOrigin } from "@/features/auth/validation";
import {
  detectProductImage,
  maxProductImageBytes,
  productImageInputSchema,
} from "@/features/catalog/image";
import { authClient } from "@/server/auth/client";
import { requirePermission } from "@/server/permissions/staff";
import { readMultipartBody } from "@/server/http/request";

const multipartOverheadAllowance = 64 * 1024;

function adminRedirect(
  request: Request,
  result: "created" | "invalid" | "failed",
) {
  return NextResponse.redirect(
    new URL(`/admin?media=${result}`, request.url),
    303,
  );
}

export async function POST(request: Request) {
  if (
    !isAllowedRequestOrigin(
      request.headers.get("origin"),
      process.env.APP_ORIGIN,
    )
  )
    return new Response("Forbidden", { status: 403 });
  await requirePermission("catalog.manage");
  let form: FormData;
  try {
    form = await readMultipartBody(
      request,
      maxProductImageBytes + multipartOverheadAllowance,
    );
  } catch {
    return new Response("Invalid payload", { status: 413 });
  }
  const input = productImageInputSchema.safeParse({
    productId: form.get("productId"),
    altText: form.get("altText"),
    sortOrder: form.get("sortOrder"),
  });
  const file = form.get("image");
  if (
    !input.success ||
    !(file instanceof File) ||
    file.size < 1 ||
    file.size > maxProductImageBytes
  )
    return adminRedirect(request, "invalid");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectProductImage(bytes);
  if (!detected || file.type !== detected.mimeType)
    return adminRedirect(request, "invalid");

  const objectPath = `${input.data.productId}/${randomUUID()}.${detected.extension}`;
  const client = await authClient(true);
  const { error: uploadError } = await client.storage
    .from("product-images")
    .upload(objectPath, bytes, {
      cacheControl: "31536000",
      contentType: detected.mimeType,
      upsert: false,
    });
  if (uploadError) return adminRedirect(request, "failed");

  const { error: registerError } = await client.rpc("register_catalog_image", {
    target_product: input.data.productId,
    new_object_path: objectPath,
    new_alt_text: input.data.altText,
    new_sort_order: input.data.sortOrder,
    new_mime_type: detected.mimeType,
    new_byte_size: file.size,
  });
  if (registerError) {
    const { error: cleanupError } = await client.storage
      .from("product-images")
      .remove([objectPath]);
    if (cleanupError)
      await client.rpc("queue_product_image_cleanup", {
        object_path: objectPath,
      });
    return adminRedirect(request, "failed");
  }
  return adminRedirect(request, "created");
}

/** Bound memory while consuming the stream, including chunked requests. */
export async function readBoundedBody(request: Request, maximum: number) {
  if (!Number.isSafeInteger(maximum) || maximum < 1)
    throw new Error("Invalid body limit");
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maximum)) {
    await request.body?.cancel();
    throw new Error("Invalid payload size");
  }
  if (!request.body) throw new Error("Empty payload");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) {
        await reader.cancel();
        throw new Error("Invalid payload size");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (size === 0) throw new Error("Empty payload");
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

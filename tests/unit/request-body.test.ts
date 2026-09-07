import { describe, expect, it, vi } from "vitest";
import { readBoundedBody } from "../../src/lib/request-body";
function streamed(chunks: string[], headers?: HeadersInit) {
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const chunk = chunks.shift();
        if (chunk === undefined) controller.close();
        else controller.enqueue(new TextEncoder().encode(chunk));
      },
      cancel,
    },
    { highWaterMark: 0 },
  );
  const request = new Request("http://localhost", {
    method: "POST",
    body,
    headers,
    duplex: "half",
  } as RequestInit);
  return { request, cancel };
}
describe("bounded request bodies", () => {
  it("accepts UTF-8 split across chunks at exactly the byte limit", async () => {
    const { request } = streamed(["a", "é"]);
    expect(new TextDecoder().decode(await readBoundedBody(request, 3))).toBe(
      "aé",
    );
  });
  it("cancels chunked bodies immediately on overflow", async () => {
    const chunks = ["abcd", "efgh", "unread"];
    const { request, cancel } = streamed(chunks);
    await expect(readBoundedBody(request, 6)).rejects.toThrow(
      "Invalid payload size",
    );
    expect(cancel).toHaveBeenCalledOnce();
    expect(chunks).toEqual(["unread"]);
  });
  it("rejects oversized Content-Length without consuming the stream", async () => {
    const chunks = ["unread"];
    const { request, cancel } = streamed(chunks, { "Content-Length": "999" });
    await expect(readBoundedBody(request, 6)).rejects.toThrow();
    expect(chunks).toEqual(["unread"]);
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("does not trust a falsely small Content-Length", async () => {
    const { request } = streamed(["too large"], { "Content-Length": "1" });
    await expect(readBoundedBody(request, 3)).rejects.toThrow();
  });
  it("rejects empty bodies", async () => {
    await expect(readBoundedBody(streamed([]).request, 3)).rejects.toThrow(
      "Empty payload",
    );
  });
});

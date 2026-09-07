import { type NextRequest } from "next/server";
import { refreshAuth } from "@/server/auth/refresh";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const development = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    `connect-src 'self'${development ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!development ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = await refreshAuth(request, headers);
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

// «media» queda fora a propòsit. El proxy posa Cache-Control: private, no-store
// a tota resposta que hi passa, i això és correcte per a HTML i per a qualsevol
// cosa lligada a una sessió, però esclafava el public, max-age=3600 que posa la
// ruta d'imatges: cada fotografia del catàleg es tornava a demanar a Storage a
// cada visita de cada persona. Una imatge de producte publicat no depèn de cap
// sessió, i el proxy no li aporta res: refreshAuth ja hi retornava de seguida i
// la CSP no governa res dins d'una resposta d'imatge. Les capçaleres de
// seguretat que sí que hi valen (nosniff, DENY) venen de next.config.ts, que
// s'aplica igualment.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|media/|pwa/|sw.js$|offline.html$|favicon.ico|icon.svg|manifest.webmanifest|robots.txt).*)",
  ],
};

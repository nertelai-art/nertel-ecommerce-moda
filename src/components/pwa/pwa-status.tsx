"use client";

import { useEffect, useState } from "react";
import { useOnline } from "./use-online";

export function PwaStatus() {
  const online = useOnline();
  const [updateWaiting, setUpdateWaiting] = useState(false);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    )
      return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let worker: ServiceWorker | null = null;
    const check = () => {
      if (!disposed) setUpdateWaiting(Boolean(registration?.waiting));
    };
    const installing = () => {
      worker?.removeEventListener("statechange", check);
      worker = registration?.installing ?? null;
      worker?.addEventListener("statechange", check);
    };
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((result) => {
        if (disposed) return;
        registration = result;
        check();
        installing();
        registration.addEventListener("updatefound", installing);
      })
      .catch(() => {
        // Installation is optional; the shop must still work without storage/SW.
      });
    return () => {
      disposed = true;
      registration?.removeEventListener("updatefound", installing);
      worker?.removeEventListener("statechange", check);
    };
  }, []);

  return (
    <div aria-live="polite" aria-atomic="true">
      {!online ? (
        <p
          className="border-b border-line bg-sand px-6 py-3 text-center text-sm"
          role="status"
        >
          Sense connexió. Connecta’t per validar preus, reservar estoc o
          gestionar comandes.
        </p>
      ) : null}
      {updateWaiting ? (
        <p
          className="border-b border-line bg-sand px-6 py-3 text-center text-sm"
          role="status"
        >
          Hi ha una versió nova. Quan hagis acabat, tanca totes les pestanyes i
          finestres de la botiga i torna-la a obrir.
        </p>
      ) : null}
    </div>
  );
}

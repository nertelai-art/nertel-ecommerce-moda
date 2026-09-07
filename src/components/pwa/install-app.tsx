"use client";

import { useEffect, useState } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const sync = () =>
      setInstalled(
        standalone.matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      );
    const offer = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    queueMicrotask(sync);
    standalone.addEventListener("change", sync);
    window.addEventListener("beforeinstallprompt", offer);
    window.addEventListener("appinstalled", done);
    return () => {
      standalone.removeEventListener("change", sync);
      window.removeEventListener("beforeinstallprompt", offer);
      window.removeEventListener("appinstalled", done);
    };
  }, []);

  async function install() {
    if (!prompt || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "Instal·lació sol·licitada al navegador."
          : "Pots continuar comprant des del navegador.",
      );
    } catch {
      setMessage(
        "Pots instal·lar la botiga des del menú del navegador, si és compatible.",
      );
    } finally {
      setPrompt(null);
      setBusy(false);
    }
  }

  if (installed) return null;
  return (
    <div className="mx-auto mt-5 max-w-7xl">
      <details>
        <summary className="min-h-11 cursor-pointer py-3 font-medium text-foreground">
          Instal·lar la botiga
        </summary>
        <div className="grid max-w-xl gap-3 pb-3">
          <p>
            Tingues la botiga a la pantalla d’inici. Instal·lar-la és opcional:
            pots comprar des del navegador.
          </p>
          {prompt ? (
            <button
              type="button"
              className="action w-fit"
              disabled={busy}
              onClick={install}
            >
              Afegir a la pantalla d’inici
            </button>
          ) : null}
          <p>
            A l’iPhone o l’iPad, obre la botiga amb Safari, toca Compartir i
            tria «Afegir a la pantalla d’inici».
          </p>
          <p>
            A Android o a l’ordinador, busca «Instal·lar aplicació» o «Afegir a
            la pantalla d’inici» al menú del navegador, si hi apareix.
          </p>
          <p className="text-xs">
            Per consultar el catàleg, el compte i les comandes cal connexió.
          </p>
          <p role="status">{message}</p>
        </div>
      </details>
    </div>
  );
}

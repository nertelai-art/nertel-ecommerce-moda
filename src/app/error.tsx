"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-3xl font-semibold">
        No hem pogut carregar la pàgina
      </h1>
      <p role="alert" className="my-6">
        Torna-ho a provar d’aquí a un moment.
      </p>
      <button className="action" onClick={reset}>
        Torna-ho a provar
      </button>
    </main>
  );
}

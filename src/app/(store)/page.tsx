import Link from "next/link";

export default function StorePage() {
  return (
    <main
      id="main"
      className="mx-auto w-full max-w-7xl px-6 py-16 sm:px-12 sm:py-28"
    >
      <section className="max-w-3xl" aria-labelledby="welcome-title">
        <p className="mb-6 text-xs tracking-[0.2em] uppercase text-muted">
          Una nova història, properament
        </p>
        <h1
          id="welcome-title"
          className="font-serif text-5xl leading-tight sm:text-7xl"
        >
          Un nou espai per trobar el teu estil.
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted">
          Estem donant forma a la nostra botiga. Un espai tranquil per descobrir
          peces i trobar les que van amb tu.
        </p>
        <Link className="action mt-10" href="/cataleg">
          Descobreix la col·lecció{" "}
          <span aria-hidden="true" className="ml-5">
            →
          </span>
        </Link>
      </section>
      <p className="mt-20 border-t border-line pt-6 text-sm text-muted">
        Primera versió de la botiga. El catàleg local conté articles de
        demostració.
      </p>
    </main>
  );
}

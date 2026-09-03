export default function StorePage() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6 py-10 sm:px-12"
    >
      <header className="border-b border-line pb-6 text-sm font-semibold tracking-widest uppercase">
        Botiga de moda
      </header>
      <section
        className="flex flex-1 flex-col justify-center py-20"
        aria-labelledby="welcome-title"
      >
        <p className="mb-5 text-sm tracking-widest uppercase text-muted">
          Properament
        </p>
        <h1
          id="welcome-title"
          className="max-w-3xl text-5xl leading-tight font-medium tracking-tight sm:text-7xl"
        >
          Un nou espai per trobar el teu estil.
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted">
          Estem preparant la botiga i les primeres col·leccions. Torna aviat per
          descobrir-les.
        </p>
      </section>
      <footer className="border-t border-line pt-6 text-sm text-muted">
        Botiga en preparació. Les compres encara no estan disponibles.
      </footer>
    </main>
  );
}

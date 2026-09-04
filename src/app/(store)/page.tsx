import Image from "next/image";
import Link from "next/link";

const stories = [
  {
    label: "Edició 01",
    title: "La forma de l'essencial",
    copy: "Siluetes àmplies, fibres honestes i una paleta pensada per durar més d'una temporada.",
    image: "/editorial/campaign-woman.png",
    alt: "Dona amb vestit de lli color sorra en un carrer de pedra",
  },
  {
    label: "Quadern mediterrani",
    title: "Vestir sense pressa",
    copy: "Peces que conviuen entre elles i amb tu: fàcils de combinar, precises en cada detall.",
    image: "/editorial/campaign-man.png",
    alt: "Home amb camisa oliva i pantalons clars en una terrassa mediterrània",
  },
] as const;

const principles = [
  [
    "01",
    "Materials",
    "Textures naturals i teixits agradables que guanyen caràcter amb el temps.",
  ],
  [
    "02",
    "Proporció",
    "Formes netes, còmodes i pensades per combinar sense esforç.",
  ],
  [
    "03",
    "Ritme",
    "Col·leccions pausades que fugen de la novetat per la novetat.",
  ],
] as const;

export default function StorePage() {
  return (
    <main id="main" className="overflow-hidden">
      <section
        className="relative isolate min-h-[calc(100svh-9rem)] overflow-hidden bg-[#d7d0c4]"
        aria-labelledby="hero-title"
      >
        <Image
          alt="Dues persones amb peces de lli en una arquitectura mediterrània"
          className="landing-hero-image object-cover object-[64%_center]"
          fill
          priority
          sizes="100vw"
          src="/editorial/campaign-hero.png"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,23,20,.74)_0%,rgba(24,23,20,.34)_43%,rgba(24,23,20,.03)_72%)]" />
        <div className="relative mx-auto flex min-h-[calc(100svh-9rem)] max-w-7xl items-end px-6 py-14 sm:px-12 sm:py-20 lg:items-center">
          <div className="max-w-2xl text-white">
            <p className="mb-6 flex items-center gap-3 text-[0.68rem] font-medium tracking-[0.28em] uppercase">
              <span className="h-px w-10 bg-current" aria-hidden="true" />
              Primavera · Estiu 2026
            </p>
            <h1
              id="hero-title"
              className="max-w-xl font-serif text-[clamp(3.5rem,8vw,7.5rem)] leading-[0.88] tracking-[-0.045em]"
            >
              Menys soroll. Més tu.
            </h1>
            <p className="mt-7 max-w-md text-base leading-relaxed text-white/82 sm:text-lg">
              Una col·lecció serena de peces versàtils, textures naturals i
              formes que respiren.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-12 items-center bg-white px-6 text-sm font-semibold text-[#292723] transition-colors hover:bg-[#eee8df]"
                href="/cataleg"
              >
                Veure la col·lecció
                <span className="ml-6" aria-hidden="true">
                  ↗
                </span>
              </Link>
              <a
                className="inline-flex min-h-12 items-center border border-white/55 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10"
                href="#manifest"
              >
                La nostra mirada
              </a>
            </div>
          </div>
        </div>
        <p className="absolute right-6 bottom-5 hidden text-[0.62rem] tracking-[0.2em] text-white/70 uppercase sm:block">
          Campanya original · Mediterrani 01
        </p>
      </section>

      <div
        className="border-y border-line bg-background py-4"
        aria-hidden="true"
      >
        <div className="landing-marquee flex min-w-max gap-10 text-xs tracking-[0.24em] uppercase">
          {[0, 1].map((group) => (
            <div className="flex gap-10" key={group}>
              <span>Fibres naturals</span>
              <span>✦</span>
              <span>Sèries curtes</span>
              <span>✦</span>
              <span>Disseny atemporal</span>
              <span>✦</span>
              <span>Fet per conviure</span>
              <span>✦</span>
            </div>
          ))}
        </div>
      </div>

      <section
        className="mx-auto max-w-7xl px-6 py-24 sm:px-12 sm:py-32"
        aria-labelledby="edit-title"
      >
        <div className="mb-12 flex flex-col justify-between gap-6 border-b border-line pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs tracking-[0.22em] text-muted uppercase">
              Històries d&apos;estil
            </p>
            <h2
              id="edit-title"
              className="mt-4 max-w-2xl font-serif text-4xl leading-none tracking-tight sm:text-6xl"
            >
              Una manera més tranquil·la de vestir.
            </h2>
          </div>
          <Link
            className="group inline-flex min-h-11 items-center text-sm font-semibold"
            href="/cataleg"
          >
            Explora totes les peces
            <span
              className="ml-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {stories.map((story, index) => (
            <article
              className={index === 1 ? "lg:mt-24" : ""}
              key={story.title}
            >
              <div className="group relative aspect-[4/5] overflow-hidden bg-sand">
                <Image
                  alt={story.alt}
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                  fill
                  sizes="(min-width: 1024px) 44vw, 90vw"
                  src={story.image}
                />
                <span className="absolute top-5 left-5 bg-background/92 px-3 py-2 text-[0.62rem] tracking-[0.2em] uppercase backdrop-blur-sm">
                  {story.label}
                </span>
              </div>
              <div className="grid gap-4 border-b border-line py-6 sm:grid-cols-[1fr_1.1fr]">
                <h3 className="font-serif text-3xl leading-tight">
                  {story.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  {story.copy}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="manifest" className="bg-[#26362e] text-white">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex min-h-[32rem] flex-col justify-between border-white/15 px-6 py-16 sm:px-12 lg:border-r lg:py-24">
            <p className="text-xs tracking-[0.24em] text-white/65 uppercase">
              Manifest 01
            </p>
            <p className="font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl">
              Comprar menys. Triar millor. Portar-ho molt.
            </p>
          </div>
          <div className="grid content-center gap-12 px-6 py-16 sm:grid-cols-3 sm:px-12 lg:py-24">
            {principles.map(([number, title, copy]) => (
              <article key={number}>
                <p className="text-xs text-white/50">{number}</p>
                <h3 className="mt-5 font-serif text-2xl">{title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-white/68">
                  {copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-6 py-24 text-center sm:px-12 sm:py-32"
        aria-labelledby="closing-title"
      >
        <p className="text-xs tracking-[0.22em] text-muted uppercase">
          La primera edició
        </p>
        <h2
          id="closing-title"
          className="mx-auto mt-5 max-w-3xl font-serif text-5xl leading-[0.98] tracking-tight sm:text-7xl"
        >
          Peces per tornar-hi, una vegada i una altra.
        </h2>
        <Link className="action mt-10 rounded-none px-7" href="/cataleg">
          Descobreix la col·lecció
          <span className="ml-5" aria-hidden="true">
            →
          </span>
        </Link>
        <p className="mx-auto mt-7 max-w-lg text-sm leading-relaxed text-muted">
          Previsualització de la botiga. Pots explorar el catàleg i preparar el
          carret; els pagaments encara no estan activats.
        </p>
      </section>
    </main>
  );
}

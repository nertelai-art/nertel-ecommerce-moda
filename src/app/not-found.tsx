import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-3xl font-semibold">No hem trobat aquesta pàgina</h1>
      <p className="my-6">Comprova l’adreça o torna a l’inici.</p>
      <Link className="action" href="/">
        Torna a l’inici
      </Link>
    </main>
  );
}

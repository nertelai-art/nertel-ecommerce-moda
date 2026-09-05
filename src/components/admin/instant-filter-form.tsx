"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useTransition, type FormEvent } from "react";

export function InstantFilterForm({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();

  function navigate(form: HTMLFormElement) {
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === "string" && value.trim()) params.set(key, value);
    }
    startTransition(() => {
      router.replace(params.size ? `${pathname}?${params}` : pathname, {
        scroll: false,
      });
    });
  }

  function handleInput(event: FormEvent<HTMLFormElement>) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "search")
      return;
    if (timer.current) clearTimeout(timer.current);
    const form = event.currentTarget;
    timer.current = setTimeout(() => navigate(form), 250);
  }

  function handleChange(event: FormEvent<HTMLFormElement>) {
    if (event.target instanceof HTMLSelectElement)
      navigate(event.currentTarget);
  }

  return (
    <form
      aria-busy={pending}
      className={`${className ?? ""} transition-opacity ${pending ? "opacity-60" : ""}`}
      method="get"
      onChange={handleChange}
      onInput={handleInput}
      onSubmit={(event) => {
        event.preventDefault();
        navigate(event.currentTarget);
      }}
    >
      {children}
      <span className="sr-only" role="status" aria-live="polite">
        {pending ? "Actualitzant resultats" : "Resultats actualitzats"}
      </span>
    </form>
  );
}

import { useState } from 'react';
import { SITE_URL, asset } from '../config';

/** Topp i samme stil som ranheimkraft.no: tilbakelenke, isbjørn og tittel. */
export default function Header() {
  const [asleep, setAsleep] = useState(false);

  return (
    <div className="space-y-4">
      <nav
        aria-label="Hovedmeny"
        className="flex items-center justify-between gap-3 border-b border-white/10 pb-2.5 font-mono text-xs"
      >
        <a
          href={SITE_URL}
          className="group -my-3 flex min-h-12 items-center gap-2 text-zinc-400 transition hover:text-white"
        >
          <span aria-hidden="true" className="transition-transform group-hover:-translate-x-0.5">
            &larr;
          </span>
          <span className="font-syne text-sm font-bold tracking-wider text-white uppercase">
            Ranheim Kraft
          </span>
        </a>
        <span className="flex items-center gap-2 text-zinc-400">
          <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
          Promillekalkulator
        </span>
      </nav>

      <header className="flex items-center gap-3 sm:gap-5">
        <div
          className="shrink-0 rounded-xl border border-white/10 bg-brand-dark p-1 shadow-lg sm:rounded-2xl sm:p-2"
          onPointerEnter={() => setAsleep(true)}
          onPointerLeave={() => setAsleep(false)}
        >
          <img
            src={asset(asleep ? 'logosove-320.webp' : 'logo-320.webp')}
            width={320}
            height={188}
            alt="Ranheim-isbjørnen"
            className="h-auto w-14 object-contain sm:w-20"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-syne text-3xl leading-none font-black tracking-tighter text-white uppercase sm:text-5xl">
            Kraft{' '}
            <span className="bg-gradient-to-r from-rose-300 via-accent to-accent-strong bg-clip-text text-transparent">
              Promille
            </span>
            <span className="sr-only"> – promillekalkulator: hvor lenge til jeg er edru?</span>
          </h1>
          <p className="mt-1.5 text-xs text-zinc-400 sm:text-sm">
            Promillekalkulator: regn ut promillen og når du er edru
          </p>
        </div>
      </header>
    </div>
  );
}

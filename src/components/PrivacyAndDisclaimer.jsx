import { Lock, TriangleAlert } from 'lucide-react';

/** Personvern-banner øverst på siden. */
export function PrivacyBanner() {
  return (
    <p className="flex items-start gap-2.5 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.07] p-3 text-sm leading-snug text-emerald-100">
      <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-300" />
      <span>
        <strong className="font-bold text-white">100 % Privat:</strong> Alt du skriver inn, lagres
        kun lokalt på din egen mobil/PC. Ingenting av det sendes over nett.
      </span>
    </p>
  );
}

/** Juridisk ansvarsfraskrivelse. */
export function Disclaimer({ className = '' }) {
  return (
    <aside
      aria-label="Ansvarsfraskrivelse"
      className={`flex items-start gap-2.5 rounded-2xl border border-orange-400/30 bg-orange-400/[0.07] p-3 text-sm leading-snug text-orange-100 ${className}`}
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-orange-300" />
      <span>
        <strong className="font-bold text-white">Kun et matematisk estimat.</strong> Individuelle
        forskjeller i leverfunksjon, dagsform og medisiner påvirker forbrenningen. Ikke bruk
        kalkulatoren som fasit for bilkjøring.
      </span>
    </aside>
  );
}

export default function PrivacyAndDisclaimer() {
  return (
    <div className="grid gap-2 lg:grid-cols-2">
      <PrivacyBanner />
      <Disclaimer />
    </div>
  );
}

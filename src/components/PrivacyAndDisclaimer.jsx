import { Lock, TriangleAlert } from 'lucide-react';

/** Personvern-banner øverst på siden. */
export function PrivacyBanner() {
  return (
    <p className="flex items-center gap-1.5 font-mono text-[11px] leading-snug text-emerald-300">
      <Lock aria-hidden="true" className="size-3 shrink-0" />
      <span>
        <strong className="font-bold">100 % privat:</strong> det du skriver inn, lagres bare på
        enheten din.
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
      <div className="space-y-2">
        <p>
          <strong className="font-bold text-white">Kun et matematisk estimat.</strong> Individuelle
          forskjeller i leverfunksjon, dagsform og medisiner påvirker forbrenningen. Ikke bruk
          kalkulatoren som fasit for bilkjøring.
        </p>
        <p className="text-xs text-orange-100/90">
          <strong className="font-bold text-white">Ansvarsfraskrivelse:</strong> Denne tjenesten er
          kun ment som et uforpliktende og teoretisk hjelpemiddel. Ranheim Kraft garanterer ikke for
          nøyaktigheten av beregningene og kan under ingen omstendigheter holdes erstatningsrettslig
          eller juridisk ansvarlig for tap, skade eller straffereaksjoner som følge av bruken. Etter
          vegtrafikkloven § 22 har enhver bilfører et selvstendig og ufravikelig ansvar for å
          forsikre seg om at man ikke er påvirket av alkohol under kjøring.
        </p>
        <a
          href="#vilkar"
          className="inline-flex min-h-11 items-center text-xs font-bold text-orange-200 underline underline-offset-2 hover:text-white"
        >
          Les fullstendige vilkår og ansvarsfraskrivelse
        </a>
      </div>
    </aside>
  );
}

export default function PrivacyAndDisclaimer() {
  return (
    <div className="space-y-2">
      <Disclaimer />
      <PrivacyBanner />
    </div>
  );
}

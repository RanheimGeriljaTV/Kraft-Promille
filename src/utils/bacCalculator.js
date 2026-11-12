/**
 * Matematisk motor for Kraft Promille. Bare rene funksjoner, testet i bacCalculator.test.js.
 *
 * Modellen:
 * 1. Kroppsvæske (TBW, liter) med Watsons formel (Watson 1980, alderleddet er 0,09516).
 * 2. Gram alkohol per enhet, med 10 % resorpsjonstap i mage/lever (normalkurven).
 * 3. Promille = gram × 0,8 / TBW. Alkoholen fordeler seg i kroppsvæsken, og blod er ca. 80 % vann,
 *    så dette er Widmark-korreksjonen der TBW er den faktiske væskefordelingen.
 * 4. Hver enhet drikkes jevnt over drikketiden (`durationMs`, 0 = alt på en gang), og alkoholen
 *    tas opp lineært over 30 min (tom mage) eller 60 min (mat).
 * 5. Forbrenningen starter med første slurk og går så lenge promillen er over 0.
 *
 * To kurver:
 * - Normal: 0,15 ‰/t, Watson med 10 % tap. TBW har et tak, så effektiv Widmark-faktor (r) aldri
 *   blir over 0,8 (for slanke og høye kan Watson ellers gi r over 1, som er fysiologisk umulig).
 * - Forsiktig: 0,10 ‰/t, 60 min opptak, INGEN resorpsjonstap og det laveste av Watson og
 *   Widmark (r = 0,7 menn og 0,6 kvinner). Den er derfor aldri tidligere enn Widmark med 0,10 ‰/t.
 *

 * Alle tidspunkter er millisekunder (Date.getTime()).
 */

export const ETHANOL_DENSITY = 0.789;
/** Andel av alkoholen som når blodet (10 % resorpsjonstap). */
export const ABSORBED_SHARE = 0.9;
/** Vannandelen i blod. */
export const BLOOD_WATER = 0.8;
/** Widmark-faktoren (r), norsk tommelfingerregel. Brukes som gulv i den forsiktige kurven. */
export const WIDMARK_R = { male: 0.7, female: 0.6 };
/** Tak på effektiv Widmark-faktor i normalkurven. */
export const MAX_EFFECTIVE_R = 0.8;

export const BURN_NORMAL = 0.15;
export const BURN_SAFE = 0.1;

export const ABSORPTION_MINUTES = { empty: 30, fed: 60 };
/** Den konservative kurven bruker alltid full opptakstid. */
export const SAFE_ABSORPTION_MINUTES = 60;

export const DRIVING_LIMIT = 0.2;

/**
 * Promillen slik den vises: rundet OPP til to desimaler. Tall, nivå, tekst og «over 0,2»
 * bruker alltid denne verdien, så siden aldri viser «0,20» ved siden av «under 0,2».
 */
export const roundUpPromille = (bac) => Math.ceil(Number((bac * 100).toFixed(6))) / 100;
export const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const MINUTE = 60 * 1000;
/** Oppløsning i simuleringen. */
const STEP_MINUTES = 1;
/** Sikkerhetsgrense, så en feil aldri gir evig løkke. */
const MAX_HOURS = 96;

/** Kroppsvæske i liter (Watsons formel). */
export function totalBodyWater({ sex, age, heightCm, weightKg }) {
  if (sex === 'female') return -2.097 + 0.1069 * heightCm + 0.2466 * weightKg;
  return 2.447 - 0.09516 * age + 0.1074 * heightCm + 0.3362 * weightKg;
}

/** Kroppsvæske til normalkurven: Watson, men slik at effektiv r (med 10 % tap) holder seg under taket. */
export const normalTbw = (profile) =>
  Math.min(
    totalBodyWater(profile),
    MAX_EFFECTIVE_R * BLOOD_WATER * ABSORBED_SHARE * profile.weightKg,
  );

/** Kroppsvæske til den forsiktige kurven: det laveste av Watson og Widmark (gir høyest promille). */
export const safeTbw = (profile) =>
  Math.min(
    totalBodyWater(profile),
    WIDMARK_R[profile.sex === 'female' ? 'female' : 'male'] * BLOOD_WATER * profile.weightKg,
  );

/** Gram ren alkohol som når blodet: volum i dl × prosent × 0,789 × 0,90. */
export const gramsAlcohol = (volumeDl, abvPercent) =>
  volumeDl * abvPercent * ETHANOL_DENSITY * ABSORBED_SHARE;

/** Promillebidraget fra et antall gram alkohol. */
export const promilleFromGrams = (grams, tbw) => (tbw > 0 ? (grams * BLOOD_WATER) / tbw : 0);

/** Deler en enhet i porsjoner à ca. 5 min, så drikketiden kan simuleres. */
function portions({ ts, grams, durationMs = 0 }) {
  const duration = Math.max(0, durationMs);
  const n = Math.max(1, Math.round(duration / (5 * MINUTE)));
  return Array.from({ length: n }, (_, i) => ({
    ts: ts + ((i + 0.5) * duration) / n,
    grams: grams / n,
  }));
}

/** Hvor stor del av [start, start + varighet] som ligger innenfor [a, b]. */
function overlapShare(a, b, start, duration) {
  const overlap = Math.min(b, start + duration) - Math.max(a, start);
  return overlap > 0 ? overlap / duration : 0;
}

/**
 * Simulerer promillekurven minutt for minutt.
 *
 * @param {{ ts: number, grams: number, durationMs?: number }[]} drinks
 * @param {{ tbw: number, burnRate: number, absorptionMinutes: number }} options
 * @returns {{ points: { t: number, bac: number }[], start: number | null, peak: number,
 *   peakAt: number | null, legalAt: number | null, soberAt: number | null }}
 *   legalAt: når promillen sist går under 0,2 (null hvis den aldri var over).
 *   soberAt: når promillen er 0,00 for godt.
 */
export function simulate(drinks, { tbw, burnRate, absorptionMinutes }) {
  const empty = { points: [], start: null, peak: 0, peakAt: null, legalAt: null, soberAt: null };
  const valid = drinks.filter((d) => d.grams > 0 && Number.isFinite(d.ts));
  if (valid.length === 0 || tbw <= 0) return empty;

  const absorbMs = absorptionMinutes * MINUTE;
  const stepMs = STEP_MINUTES * MINUTE;
  const burnPerStep = (burnRate * STEP_MINUTES) / 60;
  const start = Math.min(...valid.map((d) => d.ts));
  const allAbsorbed = Math.max(...valid.map((d) => d.ts + (d.durationMs ?? 0))) + absorbMs;
  const limit = start + MAX_HOURS * 60 * MINUTE;
  const promilles = valid
    .flatMap(portions)
    .map((p) => ({ ts: p.ts, bac: promilleFromGrams(p.grams, tbw) }));

  const points = [{ t: start, bac: 0 }];
  let bac = 0;
  let peak = 0;
  let peakAt = start;
  let lastOverLimit = null;
  let lastPositive = null;

  for (let t = start; t < limit; t += stepMs) {
    let added = 0;
    for (const d of promilles) added += d.bac * overlapShare(t, t + stepMs, d.ts, absorbMs);
    bac = Math.max(0, bac + added - burnPerStep);
    const at = t + stepMs;
    points.push({ t: at, bac });

    if (bac > peak) {
      peak = bac;
      peakAt = at;
    }
    if (roundUpPromille(bac) >= DRIVING_LIMIT) lastOverLimit = at;
    if (bac > 0) lastPositive = at;
    if (at >= allAbsorbed && bac === 0) break;
  }

  return {
    points,
    start,
    peak,
    peakAt: peak > 0 ? peakAt : null,
    legalAt: lastOverLimit === null ? null : lastOverLimit + stepMs,
    soberAt: lastPositive === null ? start : lastPositive + stepMs,
  };
}

/** Promillen på et tidspunkt, lineært mellom punktene i kurven. */
export function bacAt(points, t) {
  if (points.length === 0 || t <= points[0].t || t >= points[points.length - 1].t) return 0;
  const stepMs = points[1].t - points[0].t;
  const i = Math.floor((t - points[0].t) / stepMs);
  const a = points[i];
  const b = points[i + 1] ?? a;
  return a.bac + ((b.bac - a.bac) * (t - a.t)) / stepMs;
}

/** Punkter hvert `minutes` minutt fra `from` til og med `to`. */
export function sample(points, from, to, minutes = 15) {
  const out = [];
  for (let t = from; t <= to; t += minutes * MINUTE) out.push({ t, bac: bacAt(points, t) });
  return out;
}

/**
 * Hele utregningen for appen: profil + drinker → to kurver og nøkkeltall.
 * `grams` er gram alkohol som når blodet (etter 10 % tap, se gramsAlcohol). Den forsiktige kurven
 * regner dem tilbake til full mengde.
 *
 * @param {{ sex: 'male' | 'female', age: number, heightCm: number, weightKg: number,
 *   stomach: 'empty' | 'fed' }} profile
 * @param {{ ts: number, grams: number, durationMs?: number }[]} drinks
 * @param {number} now
 */
export function calculateEvening(profile, drinks, now) {
  const tbw = normalTbw(profile);
  const normal = simulate(drinks, {
    tbw,
    burnRate: BURN_NORMAL,
    absorptionMinutes: ABSORPTION_MINUTES[profile.stomach] ?? ABSORPTION_MINUTES.fed,
  });
  const safeDrinks = drinks.map((d) => ({ ...d, grams: d.grams / ABSORBED_SHARE }));
  const safe = simulate(safeDrinks, {
    tbw: safeTbw(profile),
    burnRate: BURN_SAFE,
    absorptionMinutes: Math.max(
      SAFE_ABSORPTION_MINUTES,
      ABSORPTION_MINUTES[profile.stomach] ?? SAFE_ABSORPTION_MINUTES,
    ),
  });
  const finished = drinks.filter((d) => d.grams > 0).map((d) => d.ts + (d.durationMs ?? 0));
  const lastDrinkAt = finished.length ? Math.max(...finished) : null;

  return {
    tbw,
    tbwSafe: safeTbw(profile),
    hasDrinks: finished.length > 0,
    now: bacAt(normal.points, now),
    nowSafe: bacAt(safe.points, now),
    normal,
    safe,
    lastDrinkAt,
    twelveHourAt: lastDrinkAt === null ? null : lastDrinkAt + TWELVE_HOURS_MS,
  };
}

/** Fargekode for et promillenivå (tidslinjen). */
export function level(bac) {
  const shown = roundUpPromille(bac);
  if (shown > 0.5) return 'red';
  if (shown >= DRIVING_LIMIT) return 'orange';
  if (shown > 0) return 'yellow';
  return 'green';
}

/** Kort beskrivelse av typisk påvirkning på et nivå. */
export function effectOf(bac) {
  const shown = roundUpPromille(bac);
  if (shown === 0) return 'Ingen alkohol i blodet.';
  if (shown < 0.2) return 'Lite merkbart, men reaksjonsevnen kan allerede være svekket.';
  if (shown < 0.5) return 'Lett påvirket: mer pratsom, dårligere dømmekraft og konsentrasjon.';
  if (shown < 1.0) return 'Tydelig påvirket: tregere reaksjoner og dårligere koordinasjon.';
  if (shown < 1.5) return 'Beruset: ustø gange, utydelig tale og svekket hukommelse.';
  if (shown < 2.5) return 'Sterkt beruset: kvalme, oppkast og fare for hukommelsestap.';
  return 'Fare for alkoholforgiftning. Ring 113 hvis noen ikke er kontaktbar.';
}

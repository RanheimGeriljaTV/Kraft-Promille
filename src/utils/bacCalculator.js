/**
 * Matematisk motor for Kraft Promille. Bare rene funksjoner, testet i bacCalculator.test.js.
 *
 * Modellen:
 * 1. Kroppsvæske (TBW, liter) med Watsons formel.
 * 2. Gram alkohol per enhet, med 10 % resorpsjonstap i mage/lever.
 * 3. Promille = gram × 0,8 / TBW. Alkoholen fordeler seg i kroppsvæsken, og blod er ca. 80 % vann,
 *    så dette er Widmark-korreksjonen der TBW er den faktiske væskefordelingen.
 * 4. Hver enhet drikkes jevnt over drikketiden (`durationMs`, 0 = alt på en gang), og alkoholen
 *    tas opp lineært over 30 min (tom mage) eller 60 min (mat).
 * 5. Forbrenningen starter med første slurk og går så lenge promillen er over 0:
 *    0,15 ‰/t (normal) og 0,10 ‰/t (konservativ sikkerhetsmargin).
 * 6. Den konservative kurven («Sikker sone») trekker ikke fra resorpsjonstapet, og Widmark-faktoren
 *    r = TBW / (0,8 × vekt) har en øvre grense (se SAFE_MAX_R).
 *
 * Alle tidspunkter er millisekunder (Date.getTime()).
 */

export const ETHANOL_DENSITY = 0.789;
/** Andel av alkoholen som når blodet (10 % resorpsjonstap). */
export const ABSORBED_SHARE = 0.9;
/** Vannandelen i blod. */
export const BLOOD_WATER = 0.8;

export const BURN_NORMAL = 0.15;
export const BURN_SAFE = 0.1;

export const ABSORPTION_MINUTES = { empty: 30, fed: 60 };
/** Den konservative kurven bruker alltid full opptakstid. */
export const SAFE_ABSORPTION_MINUTES = 60;

/**
 * Øvre grense for Widmark-faktoren r på den konservative kurven: 0,70 for menn og 0,60 for kvinner.
 * Kilde: den norske tommelfingerregelen for Widmark (promille = gram / (vekt × 0,7 / 0,6)), som er
 * fasiten i kodegjennomgangen (issue #1, H2) og QA-runden (issue #2, Q2). Verdiene ligger i det
 * vanlige området i litteraturen: Widmarks egne snitt er 0,68 / 0,55 (E.M.P. Widmark, «Principles
 * and Applications of Medicolegal Alcohol Determination», 1981, s. 107–108, gjengitt i R. Gullberg,
 * «Widmark's Equation», Washington State Patrol 2002), og Searle (Med Sci Law 2015;55(1):58–64)
 * viser r 0,66–0,80 for menn og 0,53–0,74 for kvinner etter BMI.
 * Uten tak gir Watson r opp mot 1,15 for slanke, høye personer (40 kg, 210 cm), altså altfor lav
 * promille. Lavere r gir høyere promille, så Watson brukes fortsatt når den gir lavere r (tunge
 * personer). Med taket og uten resorpsjonstap kommer «Sikker sone» ikke før Widmark med 0,10 ‰/t
 * (testet i bacCalculator.test.js).
 */
export const SAFE_MAX_R = { male: 0.7, female: 0.6 };

export const DRIVING_LIMIT = 0.2;
export const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const MINUTE = 60 * 1000;
/** Oppløsning i simuleringen. */
const STEP_MINUTES = 1;
/** Sikkerhetsgrense, så en feil aldri gir evig løkke. */
const MAX_HOURS = 96;

/** Kroppsvæske i liter (Watsons formel). */
export function totalBodyWater({ sex, age, heightCm, weightKg }) {
  if (sex === 'female') return -2.097 + 0.1069 * heightCm + 0.2466 * weightKg;
  return 2.447 - 0.09156 * age + 0.1074 * heightCm + 0.3362 * weightKg;
}

/**
 * Kroppsvæsken på den konservative kurven: Watson, men aldri mer enn det som gir r = SAFE_MAX_R.
 * Mer væske gir lavere promille, så taket gjør kurven forsiktigere for slanke og høye personer.
 */
export function safeBodyWater(profile) {
  const maxR = profile.sex === 'female' ? SAFE_MAX_R.female : SAFE_MAX_R.male;
  return Math.min(totalBodyWater(profile), maxR * BLOOD_WATER * profile.weightKg);
}

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
    if (bac >= DRIVING_LIMIT) lastOverLimit = at;
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
 *
 * @param {{ sex: 'male' | 'female', age: number, heightCm: number, weightKg: number,
 *   stomach: 'empty' | 'fed' }} profile
 * @param {{ ts: number, grams: number, durationMs?: number }[]} drinks
 * @param {number} now
 */
export function calculateEvening(profile, drinks, now) {
  const tbw = totalBodyWater(profile);
  const normal = simulate(drinks, {
    tbw,
    burnRate: BURN_NORMAL,
    absorptionMinutes: ABSORPTION_MINUTES[profile.stomach] ?? ABSORPTION_MINUTES.fed,
  });
  // Den konservative kurven regner med at all alkoholen når blodet (ingen resorpsjonstap).
  const safe = simulate(
    drinks.map((d) => ({ ...d, grams: d.grams / ABSORBED_SHARE })),
    {
      tbw: safeBodyWater(profile),
      burnRate: BURN_SAFE,
      absorptionMinutes: Math.max(
        SAFE_ABSORPTION_MINUTES,
        ABSORPTION_MINUTES[profile.stomach] ?? SAFE_ABSORPTION_MINUTES,
      ),
    },
  );
  const finished = drinks.filter((d) => d.grams > 0).map((d) => d.ts + (d.durationMs ?? 0));
  const lastDrinkAt = finished.length ? Math.max(...finished) : null;

  return {
    tbw,
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
  if (bac > 0.5) return 'red';
  if (bac >= DRIVING_LIMIT) return 'orange';
  if (bac > 0.005) return 'yellow';
  return 'green';
}

/** Kort beskrivelse av typisk påvirkning på et nivå. */
export function effectOf(bac) {
  if (bac < 0.005) return 'Ingen alkohol i blodet.';
  if (bac < 0.2) return 'Lite merkbart, men reaksjonsevnen kan allerede være svekket.';
  if (bac < 0.5) return 'Lett påvirket: mer pratsom, dårligere dømmekraft og konsentrasjon.';
  if (bac < 1.0) return 'Tydelig påvirket: tregere reaksjoner og dårligere koordinasjon.';
  if (bac < 1.5) return 'Beruset: ustø gange, utydelig tale og svekket hukommelse.';
  if (bac < 2.5) return 'Sterkt beruset: kvalme, oppkast og fare for hukommelsestap.';
  return 'Fare for alkoholforgiftning. Ring 113 hvis noen ikke er kontaktbar.';
}

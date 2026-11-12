import { findDrink, resolveChoice } from '../data/drinks';
import { gramsAlcohol } from './bacCalculator';
import { firstAtOrAfter, latestAtOrBefore, toHHMM } from './time';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/**
 * En ny kveld i «Oppsummer i etterkant»: start siste gang klokka var `startText`, og slutt første
 * gang klokka er `endText` etter det, men aldri senere enn nå. Du oppsummerer i etterkant, så
 * enhetene skal ikke legges fram i tid.
 */
export function newEvening(now, startText = '19:00', endText = '01:30') {
  const startTs = latestAtOrBefore(now, startText);
  const endTs = Math.min(firstAtOrAfter(startTs, endText), Math.floor(now / MINUTE) * MINUTE);
  return { startTs, endTs, counts: {} };
}

/**
 * Oppsummeringen som gjelder nå. Har startklokkeslettet kommet rundt igjen (neste dag), er den
 * lagrede kvelden over: da blir det en ny kveld med samme klokkeslett og ingen enheter, så
 * gårsdagens tider og antall aldri brukes i kveld. Morgenen etter gjelder gårsdagens kveld fortsatt.
 */
export function currentSummary(summary, now) {
  const stale = latestAtOrBefore(now, toHHMM(summary.startTs)) - summary.startTs > 12 * HOUR;
  return stale ? newEvening(now, toHHMM(summary.startTs), toHHMM(summary.endTs)) : summary;
}

/** Drikketid i minutter: den du har markert med «Ferdig», ellers standardtiden for kategorien. */
export const drinkMinutes = (entry) =>
  entry.durationMin ?? findDrink(entry.drinkId)?.defaultMinutes ?? 0;

/** Modus A: hver registrerte enhet med eget klokkeslett, drukket jevnt over drikketiden. */
export const entriesToDrinks = (entries) =>
  entries.map((e) => ({
    ts: e.ts,
    grams: gramsAlcohol(e.volumeDl, e.abv),
    durationMs: drinkMinutes(e) * MINUTE,
  }));

/**
 * Modus B: totalt antall av hver enhet fordeles jevnt mellom start og slutt.
 * Første enhet drikkes ved start og siste ved slutt. Typene flettes (øl, vin, øl, vin …),
 * så sterke og svake enheter ikke havner i hver sin ende av kvelden.
 */
export function summaryToDrinks({ startTs, endTs, counts }, choices) {
  const queues = Object.entries(counts ?? {})
    .map(([id, n]) => ({ drink: findDrink(id), n: Math.max(0, Math.floor(n)) }))
    .filter(({ drink, n }) => drink && n > 0)
    .map(({ drink, n }) => {
      const { volumeDl, abv } = resolveChoice(drink, choices?.[drink.id]);
      return { grams: gramsAlcohol(volumeDl, abv), n };
    });

  const order = [];
  for (let round = 0; queues.some((q) => q.n > round); round++) {
    for (const q of queues) if (q.n > round) order.push(q.grams);
  }

  const span = Math.max(0, endTs - startTs);
  const gap = order.length > 1 ? span / (order.length - 1) : 0;
  return order.map((grams, i) => ({ ts: startTs + i * gap, grams }));
}

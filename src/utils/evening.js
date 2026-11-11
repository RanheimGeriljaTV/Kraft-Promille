import { findDrink, resolveChoice } from '../data/drinks';
import { gramsAlcohol } from './bacCalculator';

const MINUTE = 60 * 1000;

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

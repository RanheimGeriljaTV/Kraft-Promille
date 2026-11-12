import { DEFAULT_PROFILE, PROFILE_LIMITS } from '../data/profile';
import { DRINKS, MAX_PER_DRINK, defaultChoice, findDrink } from '../data/drinks';
import { firstAtOrAfter, latestAtOrBefore } from './time';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const inRange = (v, { min, max }) => isNum(v) && v >= min && v <= max;
export const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Etter så lang tid regnes en lagret kveld som gammel (brukes av oppstart og advarselen). */
export const STALE_EVENING_MS = 18 * 60 * 60 * 1000;

/** Tom oppsummering for «i kveld»: 19:00 (siste gang) til 01:30 (første gang etter det). */
export function defaultSummary(now) {
  const startTs = latestAtOrBefore(now, '19:00');
  return { startTs, endTs: firstAtOrAfter(startTs, '01:30'), counts: {} };
}

/** Leser lagret økt og retter opp alt som mangler eller er ugyldig. */
export function restoreState(saved, now) {
  const p = saved?.profile ?? {};
  const profile = {
    sex: p.sex === 'female' ? 'female' : 'male',
    stomach: p.stomach === 'empty' ? 'empty' : 'fed',
    ...Object.fromEntries(
      Object.entries(PROFILE_LIMITS).map(([key, limits]) => [
        key,
        inRange(p[key], limits) ? p[key] : DEFAULT_PROFILE[key],
      ]),
    ),
  };

  const choices = Object.fromEntries(
    DRINKS.map((d) => {
      const c = saved?.choices?.[d.id] ?? {};
      const base = defaultChoice(d);
      return [
        d.id,
        {
          volume: d.volumes[c.volume] ? c.volume : base.volume,
          strength: d.strengths[c.strength] ? c.strength : base.strength,
        },
      ];
    }),
  );

  const entries = Array.isArray(saved?.entries)
    ? saved.entries
        .filter(
          (e) =>
            e && isNum(e.ts) && findDrink(e.drinkId) && isNum(e.volumeDl) && isNum(e.abv) && e.id,
        )
        .map((e) => ({
          ...e,
          durationMin: isNum(e.durationMin) && e.durationMin > 0 ? e.durationMin : null,
        }))
    : [];

  const s = saved?.summary;
  const counts = Object.fromEntries(
    Object.entries(s?.counts ?? {}).filter(
      ([id, n]) => findDrink(id) && isNum(n) && n > 0 && n <= MAX_PER_DRINK,
    ),
  );
  // En tom, gammel oppsummering gjenbrukes ikke: da ville nye enheter havnet på gårsdagen.
  const stale = s && now - s.endTs > STALE_EVENING_MS && Object.keys(counts).length === 0;
  const summary =
    s && isNum(s.startTs) && isNum(s.endTs) && s.endTs >= s.startTs && !stale
      ? { startTs: s.startTs, endTs: s.endTs, counts }
      : defaultSummary(now);

  return {
    profile,
    mode: saved?.mode === 'summary' ? 'summary' : 'live',
    choices,
    entries,
    summary,
  };
}

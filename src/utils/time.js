/** Klokkeslett og formatering. Rene funksjoner, testet i time.test.js. */
import { roundUpPromille } from './bacCalculator';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

/** Runder et tidspunkt OPP til nærmeste 5 minutter, så anslaget heller blir for sent enn for tidlig. */
export const roundUp5 = (ts) => Math.ceil(ts / (5 * MINUTE)) * 5 * MINUTE;

const pad = (n) => String(n).padStart(2, '0');

/** «03:40». */
export function toHHMM(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const startOfDay = (ts) => new Date(ts).setHours(0, 0, 0, 0);

/** «i dag», «i morgen», «i går» eller «lør. 14.11.». */
export function dayLabel(ts, now) {
  const days = Math.round((startOfDay(ts) - startOfDay(now)) / DAY);
  if (days === 0) return 'i dag';
  if (days === 1) return 'i morgen';
  if (days === -1) return 'i går';
  return new Date(ts).toLocaleDateString('nb-NO', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  });
}

/** «0,85» – rundet OPP til to desimaler (se roundUpPromille). */
export const formatPromille = (bac) => roundUpPromille(bac).toFixed(2).replace('.', ',');

/** «1,5» – inntil én desimal, med komma. */
export const formatDecimal = (value) => (Math.round(value * 10) / 10).toString().replace('.', ',');

/** «3 t 40 min», «45 min». Rundes opp til nærmeste 5 min. */
export function formatDuration(ms) {
  const total = Math.max(0, Math.ceil(ms / (5 * MINUTE)) * 5);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} t` : `${h} t ${m} min`;
}

/** Tolker «HH:MM». Gir null for ugyldig tekst. */
export function parseHHMM(text) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text ?? '');
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h < 24 && m < 60 ? { h, m } : null;
}

/**
 * Klokkeslettet `hm` på dagen `days` dager fra `ts`. Dagene flyttes i kalenderen (setDate),
 * ikke med 24 timer i millisekunder, for et døgn er 23 eller 25 timer når klokka stilles.
 */
const atTime = (ts, { h, m }, days = 0) => {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.setHours(h, m, 0, 0);
};

/** Samme klokkeslett som `text`, på den dagen som ligger nærmest `ts` (for å flytte en enhet). */
export function retime(ts, text) {
  const hm = parseHHMM(text);
  if (!hm) return ts;
  return [-1, 0, 1]
    .map((days) => atTime(ts, hm, days))
    .reduce((best, c) => (Math.abs(c - ts) < Math.abs(best - ts) ? c : best));
}

/** Siste gang klokka var `text`, nå eller tidligere (for «Startet å drikke kl.»). */
export function latestAtOrBefore(now, text) {
  const hm = parseHHMM(text);
  if (!hm) return now;
  const same = atTime(now, hm);
  return same <= now ? same : atTime(now, hm, -1);
}

/** Første gang klokka er `text` etter `ts` (eller lik). For «Sluttet å drikke kl.». */
export function firstAtOrAfter(ts, text) {
  const hm = parseHHMM(text);
  if (!hm) return ts;
  const same = atTime(ts, hm);
  return same >= ts ? same : atTime(ts, hm, 1);
}

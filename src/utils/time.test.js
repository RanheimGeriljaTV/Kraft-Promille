import {
  dayLabel,
  firstAtOrAfter,
  formatDuration,
  formatPromille,
  latestAtOrBefore,
  parseHHMM,
  retime,
  roundUp5,
  toHHMM,
} from './time';
import { summaryToDrinks } from './evening';

const at = (d, h, m) => new Date(2026, 10, d, h, m).getTime();

describe('tid', () => {
  it('runder opp til nærmeste 5 min', () => {
    expect(toHHMM(roundUp5(at(14, 22, 1)))).toBe('22:05');
    expect(toHHMM(roundUp5(at(14, 22, 5)))).toBe('22:05');
  });

  it('viser dag i forhold til nå', () => {
    const now = at(14, 22, 0);
    expect(dayLabel(at(14, 23, 0), now)).toBe('i dag');
    expect(dayLabel(at(15, 3, 0), now)).toBe('i morgen');
    expect(dayLabel(at(13, 23, 0), now)).toBe('i går');
  });

  it('formaterer promille og varighet', () => {
    expect(formatPromille(0.844)).toBe('0,85');
    expect(formatPromille(0.1996)).toBe('0,20');
    expect(formatPromille(0)).toBe('0,00');
    expect(formatDuration(95 * 60 * 1000)).toBe('1 t 35 min');
    expect(formatDuration(91 * 60 * 1000)).toBe('1 t 35 min');
    expect(formatDuration(30 * 60 * 1000)).toBe('30 min');
  });

  it('tolker HH:MM', () => {
    expect(parseHHMM('19:30')).toEqual({ h: 19, m: 30 });
    expect(parseHHMM('25:00')).toBeNull();
    expect(parseHHMM('')).toBeNull();
  });

  it('flytter en enhet til nærmeste dag med det klokkeslettet', () => {
    // Registrert 00:10 natt til søndag, endret til 23:50 → lørdag kveld, ikke søndag kveld.
    expect(retime(at(15, 0, 10), '23:50')).toBe(at(14, 23, 50));
    expect(retime(at(14, 20, 0), '19:30')).toBe(at(14, 19, 30));
  });

  it('finner start og slutt for en kveld over midnatt', () => {
    const morning = at(15, 9, 0);
    const start = latestAtOrBefore(morning, '19:00');
    expect(start).toBe(at(14, 19, 0));
    expect(firstAtOrAfter(start, '01:30')).toBe(at(15, 1, 30));
  });
});

describe('summaryToDrinks', () => {
  it('fordeler enhetene jevnt fra start til slutt og fletter typene', () => {
    const drinks = summaryToDrinks(
      { startTs: at(14, 19, 0), endTs: at(14, 22, 0), counts: { 'beer-05': 3, shot: 1 } },
      {},
    );
    expect(drinks.map((d) => toHHMM(d.ts))).toEqual(['19:00', '20:00', '21:00', '22:00']);
    // Øl, shot, øl, øl
    expect(drinks[1].grams).toBeLessThan(drinks[0].grams);
  });

  it('legger én enhet ved start', () => {
    const drinks = summaryToDrinks(
      { startTs: at(14, 19, 0), endTs: at(14, 23, 0), counts: { wine: 1 } },
      {},
    );
    expect(drinks).toHaveLength(1);
    expect(drinks[0].ts).toBe(at(14, 19, 0));
  });
});

describe('sommertid (Europe/Oslo)', () => {
  const hhmm = (ts) => toHHMM(ts);

  it('oppsummering natt til 25.10.2026 (klokka stilles tilbake): 19:00–04:00 er 10 timer', () => {
    const now = new Date(2026, 9, 25, 5, 0).getTime();
    const start = latestAtOrBefore(now, '19:00');
    const end = firstAtOrAfter(start, '04:00');
    expect(hhmm(start)).toBe('19:00');
    expect(new Date(start).getDate()).toBe(24);
    expect(hhmm(end)).toBe('04:00');
    expect((end - start) / 3600000).toBe(10);
  });

  it('flytter en enhet kl. 00:30 natt til 25.10.2026 til 23:50 kvelden før', () => {
    const ts = new Date(2026, 9, 25, 0, 30).getTime();
    const moved = retime(ts, '23:50');
    expect(hhmm(moved)).toBe('23:50');
    expect(new Date(moved).getDate()).toBe(24);
  });

  it('beholder klokkeslettet over 29.03.2026 (klokka stilles frem)', () => {
    const now = new Date(2026, 2, 29, 5, 0).getTime();
    const start = latestAtOrBefore(now, '19:00');
    const end = firstAtOrAfter(start, '01:30');
    expect(hhmm(start)).toBe('19:00');
    expect(new Date(start).getDate()).toBe(28);
    expect(hhmm(end)).toBe('01:30');
    expect((end - start) / 3600000).toBe(6.5);
  });
});

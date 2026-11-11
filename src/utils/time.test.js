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
    expect(formatPromille(0.844)).toBe('0,84');
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

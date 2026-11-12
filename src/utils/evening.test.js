import { currentSummary, drinkMinutes, entriesToDrinks, newEvening } from './evening';

const entry = { id: 'a', ts: 1000, drinkId: 'beer-05', volumeDl: 5, abv: 4.7 };

describe('drikketid', () => {
  it('bruker standardtiden for kategorien når «Ferdig» ikke er trykket', () => {
    expect(drinkMinutes({ ...entry, durationMin: null })).toBe(40);
    expect(drinkMinutes({ ...entry, drinkId: 'shot' })).toBe(1);
    expect(drinkMinutes({ ...entry, drinkId: 'wine' })).toBe(45);
  });

  it('bruker tiden som er markert med «Ferdig»', () => {
    expect(drinkMinutes({ ...entry, durationMin: 25 })).toBe(25);
  });

  it('gir 0 for ukjente enheter', () => {
    expect(drinkMinutes({ ...entry, drinkId: 'finnes-ikke' })).toBe(0);
  });

  it('gjør enhetene om til drinker med varighet i millisekunder', () => {
    const [a, b] = entriesToDrinks([entry, { ...entry, id: 'b', durationMin: 10 }]);
    expect(a.durationMs).toBe(40 * 60 * 1000);
    expect(b.durationMs).toBe(10 * 60 * 1000);
    expect(a.ts).toBe(1000);
    expect(a.grams).toBeCloseTo(5 * 4.7 * 0.789 * 0.9, 6);
  });
});

describe('ny kveld i oppsummering', () => {
  const at = (d, h, m) => new Date(2026, 10, d, h, m).getTime();
  const friday = { startTs: at(13, 19, 0), endTs: at(14, 1, 30), counts: { 'beer-05': 2 } };

  it('legger aldri slutten på en ny kveld fram i tid', () => {
    expect(newEvening(at(14, 23, 0))).toEqual({
      startTs: at(14, 19, 0),
      endTs: at(14, 23, 0),
      counts: {},
    });
    // Morgenen etter: hele gårsdagens kveld er i fortiden.
    expect(newEvening(at(15, 9, 0))).toMatchObject({
      startTs: at(14, 19, 0),
      endTs: at(15, 1, 30),
    });
  });

  it('beholder gårsdagens kveld morgenen etter, men starter en ny neste kveld', () => {
    expect(currentSummary(friday, at(14, 2, 0))).toBe(friday);
    expect(currentSummary(friday, at(14, 18, 59))).toBe(friday);
    expect(currentSummary(friday, at(14, 23, 0))).toEqual({
      startTs: at(14, 19, 0),
      endTs: at(14, 23, 0),
      counts: {},
    });
    // Gamle oppsummeringer flere dager bak flyttes også til i kveld.
    expect(currentSummary(friday, at(20, 23, 0)).startTs).toBe(at(20, 19, 0));
  });
});

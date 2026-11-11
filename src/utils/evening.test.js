import { drinkMinutes, entriesToDrinks } from './evening';

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

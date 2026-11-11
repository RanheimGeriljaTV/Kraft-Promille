import {
  BURN_NORMAL,
  BURN_SAFE,
  bacAt,
  calculateEvening,
  effectOf,
  gramsAlcohol,
  level,
  promilleFromGrams,
  sample,
  simulate,
  totalBodyWater,
} from './bacCalculator';

const H = 60 * 60 * 1000;
const T0 = new Date(2026, 10, 14, 20, 0).getTime();
const man = { sex: 'male', age: 30, heightCm: 180, weightKg: 80, stomach: 'fed' };
const opts = (absorptionMinutes = 60, burnRate = 0.15) => ({
  tbw: 40,
  burnRate,
  absorptionMinutes,
});

describe('totalBodyWater (Watson)', () => {
  it('mann 30 år, 180 cm, 80 kg', () => {
    expect(totalBodyWater(man)).toBeCloseTo(2.447 - 2.7468 + 19.332 + 26.896, 3);
  });

  it('kvinne bruker ikke alder', () => {
    const woman = { sex: 'female', age: 30, heightCm: 165, weightKg: 60 };
    expect(totalBodyWater(woman)).toBeCloseTo(-2.097 + 17.6385 + 14.796, 3);
    expect(totalBodyWater({ ...woman, age: 80 })).toBe(totalBodyWater(woman));
  });
});

describe('gramsAlcohol', () => {
  it('0,5 l pils 4,7 % med 10 % tap', () => {
    expect(gramsAlcohol(5, 4.7)).toBeCloseTo(5 * 4.7 * 0.789 * 0.9, 6);
  });

  it('gir promille med vannandel 0,8 i blodet', () => {
    expect(promilleFromGrams(50, 40)).toBeCloseTo(1, 6);
  });
});

describe('simulate', () => {
  it('gir tom kurve uten drinker', () => {
    expect(simulate([], opts())).toMatchObject({ points: [], peak: 0, soberAt: null });
  });

  it('tar opp alkoholen gradvis og forbrenner fra første slurk', () => {
    // 50 g i 40 l → 1,0 ‰ uten forbrenning. Opptak over 60 min med 0,15 ‰/t → topp 0,85 etter 1 t.
    const r = simulate([{ ts: T0, grams: 50 }], opts());
    expect(bacAt(r.points, T0)).toBe(0);
    expect(bacAt(r.points, T0 + 0.5 * H)).toBeCloseTo(0.5 - 0.075, 2);
    expect(r.peak).toBeCloseTo(0.85, 2);
    expect(r.peakAt).toBe(T0 + H);
    // Helt edru når 1,0 ‰ er forbrent: 1 / 0,15 = 6,67 t.
    expect((r.soberAt - T0) / H).toBeCloseTo(1 / 0.15, 1);
    expect((r.legalAt - T0) / H).toBeCloseTo(0.8 / 0.15, 1);
  });

  it('raskere opptak på tom mage gir høyere topp', () => {
    const fed = simulate([{ ts: T0, grams: 50 }], opts(60));
    const empty = simulate([{ ts: T0, grams: 50 }], opts(30));
    expect(empty.peak).toBeGreaterThan(fed.peak);
    expect(empty.peakAt).toBe(T0 + 0.5 * H);
  });

  it('fordeler en enhet over drikketiden: lavere og senere topp, og senere edru', () => {
    const instant = simulate([{ ts: T0, grams: 50 }], opts(30));
    const slow = simulate([{ ts: T0, grams: 50, durationMs: H }], opts(30));
    expect(slow.peak).toBeLessThan(instant.peak);
    expect(slow.peakAt).toBeGreaterThan(instant.peakAt);
    expect(slow.soberAt).toBeGreaterThan(instant.soberAt);
    expect(slow.soberAt - instant.soberAt).toBeLessThan(H);
    expect(slow.start).toBe(T0);
  });

  it('stopper forbrenningen på 0 mellom to drinker', () => {
    // 10 g → 0,2 ‰, forbrent etter ca. 1,3 t. Ny drink etter 5 t skal starte fra 0, ikke minus.
    const drinks = [
      { ts: T0, grams: 10 },
      { ts: T0 + 5 * H, grams: 10 },
    ];
    const r = simulate(drinks, opts(30));
    expect(bacAt(r.points, T0 + 4 * H)).toBe(0);
    expect(bacAt(r.points, T0 + 5.5 * H)).toBeCloseTo(0.2 - 0.075, 2);
  });

  it('sier at lovgrensen aldri ble passert når toppen er under 0,2', () => {
    const r = simulate([{ ts: T0, grams: 5 }], opts(30));
    expect(r.peak).toBeLessThan(0.2);
    expect(r.legalAt).toBeNull();
  });
});

describe('calculateEvening', () => {
  it('lager normal og konservativ kurve, der den konservative er sist på 0', () => {
    const drinks = [0, 1, 2, 3].map((i) => ({ ts: T0 + i * 0.5 * H, grams: gramsAlcohol(5, 4.7) }));
    const r = calculateEvening({ ...man, stomach: 'empty' }, drinks, T0 + 2 * H);
    expect(r.hasDrinks).toBe(true);
    expect(r.now).toBeGreaterThan(0.5);
    expect(r.safe.soberAt).toBeGreaterThan(r.normal.soberAt);
    // Like mye alkohol, forbrent med 0,10 i stedet for 0,15 → ca. 1,5 ganger så lang tid.
    const normalHours = (r.normal.soberAt - T0) / H;
    const safeHours = (r.safe.soberAt - T0) / H;
    expect(safeHours / normalHours).toBeCloseTo(BURN_NORMAL / BURN_SAFE, 0);
    expect(r.twelveHourAt).toBe(T0 + 1.5 * H + 12 * H);
  });

  it('regner siste slurk som slutten på siste drikketid', () => {
    const drinks = [{ ts: T0, grams: 12, durationMs: 40 * 60 * 1000 }];
    const r = calculateEvening(man, drinks, T0);
    expect(r.lastDrinkAt).toBe(T0 + 40 * 60 * 1000);
    expect(r.twelveHourAt).toBe(T0 + 40 * 60 * 1000 + 12 * H);
  });

  it('gir 0 og ingen tidspunkter uten drinker', () => {
    const r = calculateEvening(man, [], T0);
    expect(r).toMatchObject({ hasDrinks: false, now: 0, lastDrinkAt: null, twelveHourAt: null });
  });
});

describe('sample, level og effectOf', () => {
  it('sampler hvert 15. minutt', () => {
    const r = simulate([{ ts: T0, grams: 50 }], opts());
    const s = sample(r.points, T0, T0 + H);
    expect(s.map((p) => p.t)).toEqual([0, 15, 30, 45, 60].map((m) => T0 + m * 60 * 1000));
  });

  it('gir fargekoder etter nivå', () => {
    expect(level(0.8)).toBe('red');
    expect(level(0.5)).toBe('orange');
    expect(level(0.2)).toBe('orange');
    expect(level(0.1)).toBe('yellow');
    expect(level(0)).toBe('green');
  });

  it('beskriver påvirkningen', () => {
    expect(effectOf(0)).toMatch(/Ingen alkohol/);
    expect(effectOf(0.84)).toMatch(/Tydelig påvirket/);
    expect(effectOf(3)).toMatch(/113/);
  });
});

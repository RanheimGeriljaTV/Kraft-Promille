import {
  BURN_NORMAL,
  BURN_SAFE,
  bacAt,
  calculateEvening,
  effectOf,
  gramsAlcohol,
  level,
  MAX_EFFECTIVE_R,
  normalTbw,
  safeTbw,
  promilleFromGrams,
  roundUpPromille,
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
    // Watson 1980: alderleddet er 0,09516 (Merck/MSD har skrevet 0,09156).
    expect(totalBodyWater(man)).toBeCloseTo(2.447 - 2.8548 + 19.332 + 26.896, 3);
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
    // «Over 0,2» regnes på verdien som vises (rundet opp), så grensen er 0,19 + litt.
    expect((r.legalAt - T0) / H).toBeCloseTo(0.81 / 0.15, 1);
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

describe('avrunding opp (0,2-grensen)', () => {
  it('runder promillen opp til to desimaler', () => {
    expect(roundUpPromille(0.1996)).toBe(0.2);
    expect(roundUpPromille(0.2)).toBe(0.2);
    expect(roundUpPromille(0.2001)).toBe(0.21);
    expect(roundUpPromille(0.001)).toBe(0.01);
    expect(roundUpPromille(0)).toBe(0);
  });

  it('behandler 0,1996 som over grensen, slik tallet på skjermen sier', () => {
    expect(level(0.1996)).toBe('orange');
    expect(effectOf(0.1996)).toMatch(/Lett påvirket/);
    // Toppen 0,1996 skal gi et tidspunkt for «under 0,2», ikke «aldri over».
    const r = simulate([{ ts: T0, grams: (0.1996 * 40) / 0.8 }], opts(30, 0));
    expect(r.peak).toBeCloseTo(0.1996, 4);
    expect(r.legalAt).not.toBeNull();
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

/**
 * Uavhengig fasit: Widmark med r = 0,7 (menn) og 0,6 (kvinner), øyeblikkelig opptak, ingen
 * resorpsjonstap og 0,10 ‰/t. Skrevet for seg selv, uten å bruke noe fra bacCalculator.js.
 */
function widmarkSoberHours({ sex, weightKg }, rawGrams, hoursOfDrinks, burn = 0.1) {
  const r = sex === 'male' ? 0.7 : 0.6;
  let bac = 0;
  for (let minute = 0; minute < 96 * 60; minute++) {
    hoursOfDrinks.forEach((h, i) => {
      if (minute === h * 60) bac += rawGrams[i] / (r * weightKg);
    });
    if (bac > 0) bac = Math.max(0, bac - burn / 60);
    if (bac === 0 && minute > Math.max(...hoursOfDrinks) * 60) return minute / 60;
  }
  return 96;
}

describe('Forsiktig kurve mot uavhengig fasit (QA-tabellen i issue #2)', () => {
  const halvliter = 5 * 4.7 * 0.789; // gram ren alkohol før tap
  const personas = [
    { name: 'mann 80 kg, 180 cm, 30 år', sex: 'male', weightKg: 80, heightCm: 180, age: 30 },
    { name: 'kvinne 65 kg, 165 cm', sex: 'female', weightKg: 65, heightCm: 165, age: 30 },
    { name: 'kvinne 50 kg, 160 cm', sex: 'female', weightKg: 50, heightCm: 160, age: 30 },
    { name: 'mann 60 kg, 190 cm, 18 år', sex: 'male', weightKg: 60, heightCm: 190, age: 18 },
    { name: 'mann 120 kg, 175 cm, 50 år', sex: 'male', weightKg: 120, heightCm: 175, age: 50 },
    { name: 'mann 40 kg, 210 cm, 18 år', sex: 'male', weightKg: 40, heightCm: 210, age: 18 },
  ];

  it.each(personas)('er aldri tidligere enn Widmark med 0,10 ‰/t: $name', (p) => {
    const hours = [0, 1, 2, 3];
    const drinks = hours.map((h) => ({ ts: T0 + h * H, grams: halvliter * 0.9 }));
    const r = calculateEvening({ ...p, stomach: 'fed' }, drinks, T0 + 5 * H);
    const appHours = (r.safe.soberAt - T0) / H;
    const reference = widmarkSoberHours(
      p,
      hours.map(() => halvliter),
      hours,
    );
    expect(appHours).toBeGreaterThanOrEqual(reference - 0.05);
    // ... og heller ikke urimelig mye senere enn fasiten (maks 15 % eller 1,5 t).
    expect(appHours).toBeLessThan(reference * 1.15 + 1.5);
  });

  it.each(personas)('forsiktig er senere enn normal: $name', (p) => {
    const drinks = [0, 1, 2, 3].map((h) => ({ ts: T0 + h * H, grams: halvliter * 0.9 }));
    const r = calculateEvening({ ...p, stomach: 'fed' }, drinks, T0);
    expect(r.safe.soberAt).toBeGreaterThan(r.normal.soberAt);
    expect(r.safe.peak).toBeGreaterThan(0);
  });

  it('håndregnet: 56 g på 80 kg mann gir 1,0 ‰ og 10 timer med 0,10 ‰/t', () => {
    // 56 g / (0,7 × 80 kg) = 1,0 ‰. Normalprofilen gir TBW 44,8 l (Widmark er lavest av de to).
    const p = { sex: 'male', weightKg: 80, heightCm: 180, age: 30, stomach: 'fed' };
    const r = calculateEvening(p, [{ ts: T0, grams: 56 * 0.9 }], T0);
    expect(safeTbw(p)).toBeCloseTo(44.8, 6);
    expect((r.safe.soberAt - T0) / H).toBeCloseTo(10, 1);
  });

  it('effektiv r i normalkurven er aldri over taket, for alle tillatte profiler', () => {
    for (const sex of ['male', 'female']) {
      for (let weightKg = 40; weightKg <= 160; weightKg += 10) {
        for (let heightCm = 140; heightCm <= 210; heightCm += 10) {
          for (let age = 18; age <= 90; age += 18) {
            const p = { sex, weightKg, heightCm, age };
            const rEff = normalTbw(p) / (0.8 * 0.9 * weightKg);
            expect(rEff).toBeLessThanOrEqual(MAX_EFFECTIVE_R + 1e-9);
            // Den forsiktige kurven bruker aldri mer kroppsvæske enn Widmark.
            expect(safeTbw(p)).toBeLessThanOrEqual(
              (sex === 'male' ? 0.7 : 0.6) * 0.8 * weightKg + 1e-9,
            );
          }
        }
      }
    }
  });

  it('taket slår inn for den slanke og høye (r over 1 uten tak)', () => {
    const p = { sex: 'male', weightKg: 40, heightCm: 210, age: 18 };
    expect(totalBodyWater(p) / (0.8 * 0.9 * 40)).toBeGreaterThan(1);
    expect(normalTbw(p) / (0.8 * 0.9 * 40)).toBeCloseTo(MAX_EFFECTIVE_R, 9);
  });
});

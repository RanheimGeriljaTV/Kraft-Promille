import axe from 'axe-core';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { restoreState } from './utils/restoreState';
import { STORAGE_KEY } from './utils/storage';

const at = (d, h, m, s = 0) => new Date(2026, 10, d, h, m, s).getTime();

async function expectNoViolations(container) {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    // Fargekontrast kan ikke måles i jsdom (ingen ekte CSS).
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
  );
  expect(summary).toEqual([]);
}

const promilleNow = () => screen.getByTestId('promille-now').textContent;
const add = (name) =>
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Legg til ${name}`) }));
const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY));

describe('Kraft Promille', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'Date'] });
    vi.setSystemTime(at(14, 22, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('viser personvern-banner og ansvarsfraskrivelse', () => {
    render(<App />);
    expect(screen.getByText(/100 % privat:/).parentElement).toHaveTextContent(
      '100 % privat: det du skriver inn, lagres bare på enheten din.',
    );
    expect(screen.getByRole('complementary', { name: 'Ansvarsfraskrivelse' })).toHaveTextContent(
      'Kun et matematisk estimat. Individuelle forskjeller i leverfunksjon, dagsform og medisiner påvirker forbrenningen. Ikke bruk kalkulatoren som fasit for bilkjøring.',
    );
    expect(screen.getByRole('complementary', { name: 'Ansvarsfraskrivelse' })).toHaveTextContent(
      'Denne tjenesten er kun ment som et uforpliktende og teoretisk hjelpemiddel. Ranheim Kraft garanterer ikke for nøyaktigheten av beregningene og kan under ingen omstendigheter holdes erstatningsrettslig eller juridisk ansvarlig for tap, skade eller straffereaksjoner som følge av bruken. Etter vegtrafikkloven § 22 har enhver bilfører et selvstendig og ufravikelig ansvar for å forsikre seg om at man ikke er påvirket av alkohol under kjøring.',
    );
  });

  it('starter på 0,00 uten enheter', () => {
    render(<App />);
    expect(promilleNow()).toBe('0,00‰');
    expect(screen.getByTestId('mobile-bar')).toHaveTextContent('Ingen enheter');
  });

  it('logger fortløpende med klokkeslett og regner ut kvelden', () => {
    render(<App />);
    add('Øl 0,5 l');
    add('Øl 0,5 l');
    const times = screen.getAllByLabelText(/^Klokkeslett for Øl 0,5 l · 4,7 %/);
    expect(times).toHaveLength(2);
    expect(times[0]).toHaveValue('22:00');

    // Flytt begge enhetene til 20:00 og 20:30, og se kvelden kl. 22:00.
    fireEvent.change(times[0], { target: { value: '20:00' } });
    fireEvent.change(screen.getAllByLabelText(/^Klokkeslett for/)[1], {
      target: { value: '20:30' },
    });
    expect(promilleNow()).not.toBe('0,00‰');
    expect(screen.getByTestId('twelve-hour')).toHaveTextContent('kl. 09:10');
    expect(screen.getByTestId('safe-sober')).toHaveTextContent('kl.');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(saved().entries).toHaveLength(2);
  });

  it('bruker valgt styrke på enheten', () => {
    render(<App />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Styrke, glass vin' }), {
      target: { value: '3' },
    });
    add('Glass vin');
    expect(screen.getByLabelText(/^Klokkeslett for Glass vin 1,5 dl · 14,5 %/)).toBeInTheDocument();
  });

  it('fjerner én enhet og tømmer listen med «Start ny kveld»', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    add('Shot');
    add('Shot');
    fireEvent.click(screen.getAllByRole('button', { name: /^Fjern Shot/ })[0]);
    expect(screen.getAllByLabelText(/^Klokkeslett for Shot/)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Start ny kveld / Tøm liste' }));
    expect(screen.queryAllByLabelText(/^Klokkeslett for/)).toHaveLength(0);
    expect(saved().entries).toEqual([]);
  });

  it('oppsummerer kvelden i etterkant og fordeler enhetene', () => {
    vi.setSystemTime(at(15, 9, 0));
    render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: /Oppsummer i etterkant/ }));
    fireEvent.change(screen.getByLabelText('Startet å drikke kl.'), { target: { value: '19:00' } });
    fireEvent.change(screen.getByLabelText('Sluttet å drikke kl.'), { target: { value: '01:00' } });
    expect(screen.getByText(/fordeles jevnt over 6 t/)).toBeInTheDocument();

    const more = screen.getByRole('button', { name: /^Én til: Øl 0,5 l/ });
    for (let i = 0; i < 6; i++) fireEvent.click(more);
    // Siste enhet 01:00 → 12-timersregelen kl. 13:00.
    expect(screen.getByTestId('twelve-hour')).toHaveTextContent('kl. 13:00');
    expect(saved().mode).toBe('summary');
    expect(saved().summary.counts['beer-05']).toBe(6);
  });

  it('husker profil og liste etter at siden lukkes', () => {
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: 'Kvinne' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Vekt' }), { target: { value: '62' } });
    add('Øl 0,4 l');
    const before = promilleNow();
    unmount();

    render(<App />);
    expect(screen.getByRole('radio', { name: 'Kvinne' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('spinbutton', { name: 'Vekt' })).toHaveValue(62);
    expect(screen.getAllByLabelText(/^Klokkeslett for Øl 0,4 l/)).toHaveLength(1);
    expect(promilleNow()).toBe(before);
  });

  it('melder resultatet til skjermlesere når det har stått stille', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'setTimeout', 'Date'] });
    vi.setSystemTime(at(14, 22, 0));
    render(<App />);
    add('Drink / dram');
    const live = screen.getByTestId('announcement');
    expect(live).toBeEmptyDOMElement();
    act(() => vi.advanceTimersByTime(900));
    expect(live).toHaveTextContent(/^Estimert promille 0,00\. Sikker sone klokka \d\d:\d\d\.$/);
  });
});

describe('Vilkår og ansvarsfraskrivelse', () => {
  it('lenker fra den oransje boksen til de fullstendige vilkårene i «Spørsmål og svar»', () => {
    render(<App />);
    const link = screen.getByRole('link', {
      name: 'Les fullstendige vilkår og ansvarsfraskrivelse',
    });
    expect(link).toHaveAttribute('href', '#vilkar');
    const terms = document.getElementById('vilkar');
    expect(terms).toBeInTheDocument();
    expect(terms.closest('section')).toHaveAccessibleName('Spørsmål og svar');
    expect(
      within(terms)
        .getAllByRole('heading', { level: 4 })
        .map((h) => h.textContent),
    ).toEqual([
      '1. Tjenestens formål og tekniske begrensninger',
      '2. Førerens selvstendige og ufravikelige lovansvar',
      '3. Fullstendig fraskrivelse av erstatnings- og rettsansvar',
      '4. Aksept av vilkår',
    ]);
    expect(within(terms).getAllByRole('listitem')).toHaveLength(5);
    expect(terms).toHaveTextContent('Under ingen omstendigheter kan Ranheim Kraft');
  });
});

describe('Drikketid og «Ferdig»', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'Date'] });
    vi.setSystemTime(at(14, 22, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('antar standard drikketid, og «Ferdig» setter den faktiske tiden', () => {
    render(<App />);
    add('Øl 0,5 l');
    expect(screen.getByText('Drikker nå · antas ferdig kl. 22:40')).toBeInTheDocument();
    // «Ferdig» er med en gang, selv om klokken i appen bare oppdateres hvert 30. sekund.
    expect(screen.getByRole('button', { name: /^Ferdig med Øl 0,5 l/ })).toBeInTheDocument();
    expect(saved().entries[0].durationMin).toBeNull();

    act(() => vi.advanceTimersByTime(30 * 60 * 1000));
    fireEvent.click(screen.getByRole('button', { name: /^Ferdig med Øl 0,5 l/ }));
    expect(screen.getByText('Drukket over 30 min')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Ferdig med/ })).not.toBeInTheDocument();
    expect(saved().entries[0].durationMin).toBe(30);
  });

  it('beholder drikketiden når startklokkeslettet endres', () => {
    render(<App />);
    add('Øl 0,5 l');
    act(() => vi.advanceTimersByTime(20 * 60 * 1000));
    fireEvent.click(screen.getByRole('button', { name: /^Ferdig med/ }));
    fireEvent.change(screen.getByLabelText(/^Klokkeslett for Øl 0,5 l/), {
      target: { value: '21:30' },
    });
    expect(screen.getByText('Drukket over 20 min')).toBeInTheDocument();
    expect(screen.getByTestId('twelve-hour')).toHaveTextContent('kl. 09:50');
  });

  it('slår «Ferdig» av etter to timer, og sier at tiden er antatt', () => {
    render(<App />);
    add('Øl 0,5 l');
    act(() => vi.advanceTimersByTime(2 * 60 * 60 * 1000 + 60 * 1000));
    expect(screen.queryByRole('button', { name: /^Ferdig med/ })).not.toBeInTheDocument();
    expect(screen.getByText('Antatt drukket over 40 min')).toBeInTheDocument();
  });
});

describe('Oppsummering neste kveld (CR H1 / QA Q1)', () => {
  const beer = () => screen.getByRole('button', { name: 'Én til: Øl 0,5 l (4,7 %)' });
  const fields = () => [
    screen.getByLabelText('Startet å drikke kl.').value,
    screen.getByLabelText('Sluttet å drikke kl.').value,
  ];
  /** Fredag: oppsummering 19:00–01:30 med 2 halvlitere. */
  function friday() {
    fireEvent.click(screen.getByRole('radio', { name: /Oppsummer i etterkant/ }));
    fireEvent.change(screen.getByLabelText('Startet å drikke kl.'), { target: { value: '19:00' } });
    fireEvent.change(screen.getByLabelText('Sluttet å drikke kl.'), { target: { value: '01:30' } });
    fireEvent.click(beer());
    fireEvent.click(beer());
  }
  /** Fire halvlitere i kveld skal gi tydelig promille nå, og sikker sone skal ikke være nådd. */
  function expectTonight() {
    const now = Number(promilleNow().replace('‰', '').replace(',', '.'));
    expect(now).toBeGreaterThan(0.25);
    expect(screen.getByTestId('safe-sober')).not.toHaveTextContent('nådd');
    expect(screen.getByTestId('safe-sober')).toHaveTextContent(/kl\. 06:40\s*i morgen/);
    expect(screen.getByTestId('mobile-bar')).not.toHaveTextContent('Nådd');
    expect(saved().summary.startTs).toBe(at(14, 19, 0));
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'Date'] });
    vi.setSystemTime(at(13, 23, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('«Start ny kveld» neste dag legger nye enheter på i kveld, ikke på gårsdagen', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    friday();

    // Lørdag 23:00, samme fane: «Start ny kveld» og 4 halvlitere.
    vi.setSystemTime(at(14, 22, 59, 30));
    act(() => vi.advanceTimersByTime(30 * 1000));
    fireEvent.click(screen.getByRole('button', { name: 'Start ny kveld / Tøm liste' }));
    for (let i = 0; i < 4; i++) fireEvent.click(beer());

    expectTonight();
    expect(fields()).toEqual(['19:00', '23:00']);
    expect(saved().summary.counts).toEqual({ 'beer-05': 4 });
  });

  it('åpner siden neste kveld med en ny, tom kveld', () => {
    const { unmount } = render(<App />);
    friday();
    unmount();

    vi.setSystemTime(at(14, 23, 0));
    render(<App />);
    expect(fields()).toEqual(['19:00', '23:00']);
    expect(screen.getByRole('button', { name: 'Start ny kveld / Tøm liste' })).toBeDisabled();
    for (let i = 0; i < 4; i++) fireEvent.click(beer());
    expect(saved().summary.counts).toEqual({ 'beer-05': 4 });
    expectTonight();
  });

  it('teller ikke gårsdagens enheter med når fanen har stått åpen siden i går', () => {
    render(<App />);
    friday();
    vi.setSystemTime(at(14, 22, 59, 30));
    act(() => vi.advanceTimersByTime(30 * 1000));
    // Gårsdagens 2 vises ikke lenger, så første trykk gir 1, ikke 3.
    fireEvent.click(beer());
    expect(saved().summary.counts).toEqual({ 'beer-05': 1 });
    expect(saved().summary.startTs).toBe(at(14, 19, 0));
  });

  it('beholder gårsdagens oppsummering morgenen etter', () => {
    const { unmount } = render(<App />);
    friday();
    const before = saved().summary;
    unmount();

    vi.setSystemTime(at(14, 10, 0));
    render(<App />);
    expect(fields()).toEqual(['19:00', '01:30']);
    expect(saved().summary).toEqual(before);
  });
});

describe('restoreState', () => {
  it('retter opp ugyldige og manglende verdier', () => {
    const state = restoreState(
      {
        profile: { sex: 'x', weightKg: 500, heightCm: 170 },
        mode: 'tull',
        choices: { wine: { volume: 9, strength: 1 } },
        entries: [{ id: 'a', ts: 1, drinkId: 'finnes-ikke', volumeDl: 1, abv: 1 }],
        summary: { startTs: 10, endTs: 5 },
      },
      at(14, 22, 0),
    );
    expect(state.profile).toEqual({
      sex: 'male',
      stomach: 'fed',
      weightKg: 80,
      heightCm: 170,
      age: 30,
    });
    expect(state.mode).toBe('live');
    expect(state.choices.wine).toEqual({ volume: 0, strength: 1 });
    expect(state.entries).toEqual([]);
    expect(state.summary.startTs).toBe(at(14, 19, 0));
  });

  it('retter opp ugyldig drikketid på lagrede enheter', () => {
    const entry = { id: 'a', ts: at(14, 20, 0), drinkId: 'beer-05', volumeDl: 5, abv: 4.7 };
    const { entries } = restoreState(
      {
        entries: [
          { ...entry, id: 'a', durationMin: -5 },
          { ...entry, id: 'b', durationMin: 35 },
          { ...entry, id: 'c' },
        ],
      },
      at(14, 22, 0),
    );
    expect(entries.map((e) => e.durationMin)).toEqual([null, 35, null]);
  });

  it('tåler at localStorage er ødelagt', () => {
    localStorage.setItem(STORAGE_KEY, '{ikke json');
    render(<App />);
    expect(promilleNow()).toBe('0,00‰');
  });
});

describe('Tilgjengelighet (axe)', () => {
  it('uten og med enheter, og i oppsummeringsmodus', async () => {
    const { container } = render(<App />);
    await expectNoViolations(container);
    add('Øl 0,5 l');
    await expectNoViolations(container);
    fireEvent.click(screen.getByRole('radio', { name: /Oppsummer i etterkant/ }));
    await expectNoViolations(container);
  });

  it('har overskrifter for hver del', () => {
    render(<App />);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      '01 / Profil',
      '02 / Hva har du drukket?',
      '03 / Resultat',
      'Spørsmål og svar',
    ]);
  });

  it('har fire resultatkort', () => {
    render(<App />);
    const region = screen.getByRole('region', { name: /Resultat/ });
    expect(
      within(region)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual([
      'Estimert promille nå',
      'Bilkjøring: 0,00 ‰ og 0,2 ‰-grensen',
      'Grønt lys / Sikker sone',
      '12-timersregelen etter siste enhet',
    ]);
  });
});

import axe from 'axe-core';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { restoreState } from './utils/restoreState';
import { STORAGE_KEY } from './utils/storage';

const at = (d, h, m) => new Date(2026, 10, d, h, m).getTime();

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
    expect(screen.getByText(/100 % Privat:/).parentElement).toHaveTextContent(
      '100 % Privat: Alt du skriver inn, lagres kun lokalt på din egen mobil/PC. Ingenting av det sendes over nett.',
    );
    expect(screen.getByRole('complementary', { name: 'Ansvarsfraskrivelse' })).toHaveTextContent(
      'Kun et matematisk estimat. Individuelle forskjeller i leverfunksjon, dagsform og medisiner påvirker forbrenningen. Ikke bruk kalkulatoren som fasit for bilkjøring.',
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
    expect(screen.getByTestId('twelve-hour')).toHaveTextContent('kl. 08:30');
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
      'Norsk lovgrense (0,2 ‰) & 0,00 ‰',
      'Grønt lys / Sikker sone',
      '12-timersregelen etter siste enhet',
    ]);
  });
});

import axe from 'axe-core';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { DRINKS } from './data/drinks';
import { restoreState } from './utils/restoreState';
import { STORAGE_KEY } from './utils/storage';

const at = (d, h, m) => new Date(2026, 10, d, h, m).getTime();

async function expectNoViolations(container) {
  const results = await axe.run(container, {
    // Også de eksperimentelle reglene og `region` (alt innhold i landemerker). jsdom har ikke
    // layout, så axe finner ikke label-content-name-mismatch her: den testes direkte under.
    runOnly: {
      type: 'tag',
      values: [
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
        'wcag22aa',
        'best-practice',
        'experimental',
      ],
    },
    // Fargekontrast kan ikke måles i jsdom (ingen ekte CSS).
    rules: { 'color-contrast': { enabled: false } },
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
    expect(live).toHaveTextContent(
      /^Estimert promille 0,00\. Forsiktig anslag for 0,00 promille klokka \d\d:\d\d\.$/,
    );
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
    expect(screen.getByText('i går · Antatt drukket over 40 min')).toBeInTheDocument();
  });
});

describe('Knappenavn (WCAG 2.5.3, talestyring)', () => {
  it('har synlig tekst i navnet på «Legg til»-knappene', () => {
    render(<App />);
    for (const { name, hint } of DRINKS) {
      // Navnet skal begynne med «Legg til», og inneholde det som står på knappen.
      const button = screen.getByRole('button', {
        name: (accessibleName) =>
          accessibleName.startsWith(`Legg til ${name}`) && accessibleName.includes(hint),
      });
      expect(button).toBeInTheDocument();
    }
  });

  it('sier styrken og størrelsen i navnet, og har ingen aria-label som overstyrer teksten', () => {
    render(<App />);
    const button = screen.getByRole('button', { name: /^Legg til Glass vin/ });
    expect(button).not.toHaveAttribute('aria-label');
    expect(button).toHaveAccessibleName(/\(1,5 dl, 13,5 %\)$/);
  });
});

describe('Landemerker og overskrifter', () => {
  it('legger personvernlinjen og den faste linjen på mobil i landemerker', () => {
    render(<App />);
    expect(screen.getByRole('complementary', { name: 'Personvern' })).toHaveTextContent(
      '100 % privat',
    );
    expect(
      screen.getByRole('complementary', { name: 'Promille nå og forsiktig anslag' }),
    ).toBeInTheDocument();
  });

  it('bruker ikke et avsnitt (p) som overskrift for det store promilletallet', () => {
    render(<App />);
    expect(screen.getByTestId('promille-now').tagName).toBe('DIV');
    expect(screen.getByTestId('mobile-bar').querySelector('p.text-3xl')).toBeNull();
  });
});

describe('Forsiktig ordbruk', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'Date'] });
    vi.setSystemTime(at(14, 22, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('sier ikke «Grønt lys», «Aldri over» eller «Nådd» (issue #1 H3)', () => {
    const { container } = render(<App />);
    add('Øl 0,4 l');
    const text = container.textContent;
    expect(text).not.toMatch(/Grønt lys|Aldri over|Nådd|er du da på 0,00/);
    expect(text).toMatch(/Forsiktig anslag for 0,00/);
  });

  it('har en lenke til vilkårene i den faste linjen på mobil', () => {
    render(<App />);
    const bar = within(screen.getByTestId('mobile-bar'));
    expect(bar.getByRole('link', { name: 'vilkår' })).toHaveAttribute('href', '#vilkar');
    expect(bar.getByText('Forsiktig anslag 0,00 ‰')).toBeInTheDocument();
  });

  it('sier «Anslått under 0,2 ‰» når toppen er under grensen', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: /Oppsummer i etterkant/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Én til: Shot 4 cl/ }));
    expect(screen.getByText('Anslått under 0,2 ‰')).toBeInTheDocument();
  });
});

describe('Ny kveld og planlagte enheter', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'Date'] });
  });
  afterEach(() => vi.useRealTimers());

  it('«Start ny kveld» regner oppsummeringen på nytt fra nå (QA Q1)', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    // Fredag kl. 23:00: oppsummering 19:00–01:30 med 2 halvlitere.
    vi.setSystemTime(at(13, 23, 0));
    const first = render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: /Oppsummer i etterkant/ }));
    const more = screen.getByRole('button', { name: /^Én til: Øl 0,5 l/ });
    fireEvent.click(more);
    fireEvent.click(more);
    first.unmount();

    // Lørdag kl. 23:00: advarsel om gammel kveld, så «Start ny kveld», så 4 halvlitere.
    vi.setSystemTime(at(14, 23, 0));
    render(<App />);
    expect(screen.getByText(/Det du har registrert, ender i dag kl\. 01:30/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start ny kveld' }));
    expect(screen.queryByText(/Det du har registrert, ender/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Startet å drikke kl.')).toHaveValue('19:00');
    expect(screen.getByText('i dag', { selector: 'span' })).toBeInTheDocument();
    const again = screen.getByRole('button', { name: /^Én til: Øl 0,5 l/ });
    for (let i = 0; i < 4; i++) fireEvent.click(again);
    expect(saved().summary.startTs).toBe(at(14, 19, 0));
    expect(promilleNow()).not.toBe('0,00‰');
  });

  it('bruker ny standardkveld når en tom, gammel oppsummering lastes', () => {
    vi.setSystemTime(at(14, 23, 0));
    const state = restoreState(
      { summary: { startTs: at(12, 19, 0), endTs: at(13, 1, 30), counts: {} } },
      at(14, 23, 0),
    );
    expect(state.summary.startTs).toBe(at(14, 19, 0));
    expect(state.summary.endTs).toBe(at(15, 1, 30));
  });

  it('viser en enhet frem i tid som «Planlagt», ikke «Drikker nå» (QA Q4)', () => {
    vi.setSystemTime(at(14, 0, 30));
    render(<App />);
    add('Glass vin');
    fireEvent.change(screen.getByLabelText(/^Klokkeslett for Glass vin/), {
      target: { value: '02:00' },
    });
    expect(screen.getByText('Planlagt kl. 02:00')).toBeInTheDocument();
    expect(screen.queryByText(/Drikker nå/)).not.toBeInTheDocument();
    expect(promilleNow()).toBe('0,00‰');
  });

  it('har en rad for toppunktet i tabellen time for time', () => {
    vi.setSystemTime(at(14, 22, 0));
    render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: /Oppsummer i etterkant/ }));
    fireEvent.change(screen.getByLabelText('Startet å drikke kl.'), { target: { value: '20:00' } });
    fireEvent.change(screen.getByLabelText('Sluttet å drikke kl.'), { target: { value: '20:00' } });
    fireEvent.click(screen.getByRole('button', { name: /^Én til: Øl 0,5 l/ }));
    expect(screen.getByRole('table')).toHaveTextContent('topp');
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
      'Forsiktig anslag for 0,00 ‰',
      '12-timersregelen etter siste enhet',
    ]);
  });
});

import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Faq from './components/Faq';
import PrivacyAndDisclaimer from './components/PrivacyAndDisclaimer';
import ProfileInput from './components/ProfileInput';
import DrinkLogger from './components/DrinkLogger';
import ResultDashboard from './components/ResultDashboard';
import MobileStatusBar from './components/MobileStatusBar';
import { findDrink, resolveChoice } from './data/drinks';
import { newId, restoreState } from './utils/restoreState';
import { calculateEvening } from './utils/bacCalculator';
import { entriesToDrinks, summaryToDrinks } from './utils/evening';
import { loadState, saveState } from './utils/storage';
import {
  firstAtOrAfter,
  formatPromille,
  latestAtOrBefore,
  retime,
  roundUp5,
  toHHMM,
} from './utils/time';
import { useNow } from './hooks/useNow';
import { useAnnouncement } from './hooks/useAnnouncement';

export default function App() {
  const [state, setState] = useState(() => restoreState(loadState(), Date.now()));
  const now = useNow();
  const { profile, mode, choices, entries, summary } = state;

  useEffect(() => saveState(state), [state]);

  const update = (patch) => setState((prev) => ({ ...prev, ...patch(prev) }));

  const drinks = useMemo(
    () => (mode === 'live' ? entriesToDrinks(entries) : summaryToDrinks(summary, choices)),
    [mode, entries, summary, choices],
  );
  const result = useMemo(() => calculateEvening(profile, drinks, now), [profile, drinks, now]);

  const handlers = {
    onModeChange: (value) => update(() => ({ mode: value })),
    onChoiceChange: (id, choice) =>
      update((prev) => ({ choices: { ...prev.choices, [id]: choice } })),
    onAdd: (drinkId) =>
      update((prev) => {
        const { volumeDl, abv } = resolveChoice(findDrink(drinkId), prev.choices[drinkId]);
        return {
          entries: [...prev.entries, { id: newId(), ts: Date.now(), drinkId, volumeDl, abv }],
        };
      }),
    onRetime: (id, text) =>
      update((prev) => ({
        entries: prev.entries.map((e) => (e.id === id ? { ...e, ts: retime(e.ts, text) } : e)),
      })),
    onRemove: (id) => update((prev) => ({ entries: prev.entries.filter((e) => e.id !== id) })),
    onSummaryTime: (which, text) =>
      update((prev) => {
        if (which === 'start') {
          const startTs = latestAtOrBefore(Date.now(), text);
          const endTs = firstAtOrAfter(startTs, toHHMM(prev.summary.endTs));
          return { summary: { ...prev.summary, startTs, endTs } };
        }
        return {
          summary: { ...prev.summary, endTs: firstAtOrAfter(prev.summary.startTs, text) },
        };
      }),
    onCount: (id, n) =>
      update((prev) => ({
        summary: { ...prev.summary, counts: { ...prev.summary.counts, [id]: n } },
      })),
    onReset: () => {
      if (!window.confirm('Tømme drikkelisten og starte en ny kveld? Profilen beholdes.')) return;
      update((prev) => ({ entries: [], summary: { ...prev.summary, counts: {} } }));
    },
  };

  const safeAt = result.hasDrinks ? roundUp5(result.safe.soberAt) : null;
  const announcement = useAnnouncement(
    result.hasDrinks
      ? `Estimert promille ${formatPromille(result.now)}. Sikker sone klokka ${toHHMM(safeAt)}.`
      : '',
    800,
  );

  return (
    <div
      className="mx-auto flex min-h-screen max-w-[1280px] flex-col gap-6 px-4 pt-4 pb-28 lg:pb-0"
      style={{
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      <Header />
      <PrivacyAndDisclaimer />

      <p aria-live="polite" aria-atomic="true" className="sr-only" data-testid="announcement">
        {announcement}
      </p>

      <main className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-5">
          <ProfileInput
            index={1}
            profile={profile}
            onChange={(next) => update(() => ({ profile: next }))}
          />
          <DrinkLogger
            index={2}
            mode={mode}
            choices={choices}
            entries={entries}
            summary={summary}
            {...handlers}
          />
        </div>
        <div className="min-w-0 lg:col-span-7">
          <ResultDashboard index={3} result={result} now={now} />
        </div>
      </main>

      <Faq />
      <Footer />
      <MobileStatusBar result={result} now={now} />
    </div>
  );
}

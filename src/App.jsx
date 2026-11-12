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
import { currentSummary, entriesToDrinks, summaryToDrinks } from './utils/evening';
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
  const { profile, mode, choices, entries } = state;
  // Gårsdagens oppsummering blir en ny, tom kveld når startklokkeslettet kommer rundt igjen.
  const summary = useMemo(() => currentSummary(state.summary, now), [state.summary, now]);

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
          entries: [
            ...prev.entries,
            { id: newId(), ts: Date.now(), drinkId, volumeDl, abv, durationMin: null },
          ],
        };
      }),
    onRetime: (id, text) =>
      update((prev) => ({
        entries: prev.entries.map((e) => (e.id === id ? { ...e, ts: retime(e.ts, text) } : e)),
      })),
    onFinish: (id) =>
      update((prev) => ({
        entries: prev.entries.map((e) =>
          e.id === id
            ? {
                ...e,
                durationMin: Math.min(180, Math.max(1, Math.round((Date.now() - e.ts) / 60000))),
              }
            : e,
        ),
      })),
    onRemove: (id) => update((prev) => ({ entries: prev.entries.filter((e) => e.id !== id) })),
    onSummaryTime: (which, text) =>
      update((prev) => {
        const current = currentSummary(prev.summary, now);
        if (which === 'start') {
          const startTs = latestAtOrBefore(Date.now(), text);
          const endTs = firstAtOrAfter(startTs, toHHMM(current.endTs));
          return { summary: { ...current, startTs, endTs } };
        }
        return {
          summary: { ...current, endTs: firstAtOrAfter(current.startTs, text) },
        };
      }),
    onCount: (id, n) =>
      update((prev) => {
        const current = currentSummary(prev.summary, now);
        return { summary: { ...current, counts: { ...current.counts, [id]: n } } };
      }),
    onReset: () => {
      if (!window.confirm('Tømme drikkelisten og starte en ny kveld? Profilen beholdes.')) return;
      update((prev) => ({
        entries: [],
        summary: { ...currentSummary(prev.summary, now), counts: {} },
      }));
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
            now={now}
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

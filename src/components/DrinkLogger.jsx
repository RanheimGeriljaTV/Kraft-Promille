import { useId } from 'react';
import {
  Beer,
  CalendarClock,
  Check,
  Clock,
  GlassWater,
  ListPlus,
  Martini,
  Minus,
  Plus,
  RotateCcw,
  Wine,
  X,
} from 'lucide-react';
import { DRINKS, MAX_PER_DRINK, entryLabel, resolveChoice } from '../data/drinks';
import { drinkMinutes } from '../utils/evening';
import { formatDuration, toHHMM } from '../utils/time';
import { Panel, SectionLabel, Segmented } from './ui';

const ICONS = { Beer, Wine, Martini, GlassWater };

const roundButton =
  'flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition select-none hover:border-accent/50 active:scale-95 active:bg-accent active:text-black disabled:opacity-30 disabled:active:scale-100 disabled:active:bg-white/[0.04] disabled:active:text-white';

const selectClass =
  'h-11 w-full min-w-0 cursor-pointer rounded-xl border border-white/10 bg-brand-navy px-2 text-xs text-zinc-200 focus:border-accent';

function DrinkTile({ drink, choice, mode, count, onChoice, onAdd, onCount }) {
  const Icon = ICONS[drink.icon] ?? GlassWater;
  const { volumeLabel, abvLabel } = resolveChoice(drink, choice);
  const nameId = useId();
  const what = `${drink.name}${drink.volumes.length > 1 ? ` ${volumeLabel}` : ''} (${abvLabel})`;

  return (
    <li
      aria-labelledby={nameId}
      className={`flex flex-col gap-2 rounded-2xl border p-2 transition ${
        count > 0 ? 'border-accent/40 bg-accent/[0.06]' : 'border-white/10 bg-white/[0.02]'
      }`}
    >
      {mode === 'live' ? (
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Legg til ${what}`}
          className="group relative flex min-h-24 touch-manipulation flex-col items-start justify-between gap-1 rounded-xl bg-white/[0.04] p-2.5 text-left transition select-none hover:bg-white/[0.07] active:scale-[0.97] active:bg-accent active:text-black"
        >
          <span className="flex w-full items-center justify-between">
            <Icon aria-hidden="true" className="size-6 text-accent group-active:text-black" />
            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-black">
              <Plus aria-hidden="true" className="size-5" strokeWidth={3} />
            </span>
          </span>
          <span>
            <span id={nameId} className="block text-sm leading-tight font-bold">
              {drink.name}
            </span>
            <span className="block font-mono text-[10px] text-zinc-400 group-active:text-black/70">
              {drink.hint}
            </span>
          </span>
          {count > 0 && (
            <span className="absolute top-2 right-11 rounded-full bg-white/10 px-1.5 font-mono text-[11px] text-white">
              {count}
            </span>
          )}
        </button>
      ) : (
        <div className="space-y-2 rounded-xl bg-white/[0.04] p-2.5">
          <span className="flex items-center gap-2">
            <Icon aria-hidden="true" className="size-6 shrink-0 text-accent" />
            <span className="min-w-0">
              <span id={nameId} className="block text-sm leading-tight font-bold">
                {drink.name}
              </span>
              <span className="block truncate font-mono text-[10px] text-zinc-400">
                {drink.hint}
              </span>
            </span>
          </span>
          <span className="flex items-center justify-between gap-1">
            <button
              type="button"
              aria-label={`Én færre: ${what}`}
              disabled={count <= 0}
              onClick={() => onCount(count - 1)}
              className={roundButton}
            >
              <Minus aria-hidden="true" className="size-5" />
            </button>
            <output className="font-syne text-2xl font-black tabular-nums">{count}</output>
            <button
              type="button"
              aria-label={`Én til: ${what}`}
              disabled={count >= MAX_PER_DRINK}
              onClick={() => onCount(count + 1)}
              className={roundButton}
            >
              <Plus aria-hidden="true" className="size-5" />
            </button>
          </span>
        </div>
      )}

      {drink.volumes.length > 1 && (
        <select
          aria-label={`Størrelse, ${drink.name.toLowerCase()}`}
          className={selectClass}
          value={choice.volume}
          onChange={(e) => onChoice({ ...choice, volume: Number(e.target.value) })}
        >
          {drink.volumes.map((v, i) => (
            <option key={v.label} value={i}>
              {v.label}
            </option>
          ))}
        </select>
      )}
      <select
        aria-label={`Styrke, ${drink.name.toLowerCase()}`}
        className={selectClass}
        value={choice.strength}
        onChange={(e) => onChoice({ ...choice, strength: Number(e.target.value) })}
      >
        {drink.strengths.map((s, i) => (
          <option key={s.label} value={i}>
            {s.label} – {s.hint}
          </option>
        ))}
      </select>
    </li>
  );
}

const MINUTE = 60 * 1000;
/** «Ferdig»-knappen vises i to timer etter at enheten ble lagt til. */
const FINISH_WINDOW_MS = 2 * 60 * MINUTE;

function EntryList({ entries, now, onRetime, onFinish, onRemove }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-zinc-400">
        Ingen enheter ennå. Trykk på en drikke over hver gang du begynner på en ny.
      </p>
    );
  }
  const sorted = [...entries].sort((a, b) => a.ts - b.ts);
  return (
    <ol className="space-y-1.5">
      {sorted.map((entry) => {
        const label = entryLabel(entry);
        const minutes = drinkMinutes(entry);
        const marked = entry.durationMin != null;
        const drinking = !marked && now < entry.ts + minutes * MINUTE;
        // `now` oppdateres bare hvert 30. sekund, så en enhet du nettopp la til kan ligge litt frem.
        const canFinish = !marked && now >= entry.ts - MINUTE && now - entry.ts < FINISH_WINDOW_MS;
        const status = marked
          ? `Drukket over ${minutes} min`
          : drinking
            ? `Drikker nå · antas ferdig kl. ${toHHMM(entry.ts + minutes * MINUTE)}`
            : `Antatt drukket over ${minutes} min`;
        return (
          <li
            key={entry.id}
            className="rounded-xl border border-white/5 bg-white/[0.02] py-1 pr-1 pl-2"
          >
            <div className="flex items-center gap-2">
              <Clock aria-hidden="true" className="size-4 shrink-0 text-zinc-400" />
              <input
                type="time"
                aria-label={`Klokkeslett for ${label}`}
                value={toHHMM(entry.ts)}
                onChange={(e) => onRetime(entry.id, e.target.value)}
                className="h-11 w-[5.5rem] shrink-0 rounded-lg border border-white/10 bg-brand-navy px-1.5 font-mono text-sm text-white tabular-nums focus:border-accent"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{label}</span>
              <button
                type="button"
                onClick={() => onRemove(entry.id)}
                aria-label={`Fjern ${label} kl. ${toHHMM(entry.ts)}`}
                className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 pr-1 pl-6">
              <span
                className={`font-mono text-[11px] ${drinking ? 'text-accent' : 'text-zinc-400'}`}
              >
                {status}
              </span>
              {canFinish && (
                <button
                  type="button"
                  onClick={() => onFinish(entry.id)}
                  aria-label={`Ferdig med ${label} kl. ${toHHMM(entry.ts)}`}
                  data-umami-event="promille_ferdig"
                  className="flex min-h-11 shrink-0 touch-manipulation items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-bold text-zinc-200 transition hover:border-accent/50 hover:text-white active:bg-accent active:text-black"
                >
                  <Check aria-hidden="true" className="size-4" />
                  Ferdig
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TimeField({ label, value, onChange }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={id} className="font-mono text-[11px] tracking-wide text-zinc-400 uppercase">
        {label}
      </label>
      <input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-xl border border-white/10 bg-brand-navy px-3 font-syne text-lg font-bold text-white tabular-nums focus:border-accent"
      />
    </div>
  );
}

/** Hurtigknapper for norske enheter, to tidsmoduser og listen over kvelden. */
export default function DrinkLogger({
  index,
  mode,
  onModeChange,
  choices,
  onChoiceChange,
  entries,
  onAdd,
  onRetime,
  onFinish,
  onRemove,
  summary,
  now,
  onSummaryTime,
  onCount,
  onReset,
}) {
  const titleId = useId();
  const loggedCount = (id) => entries.filter((e) => e.drinkId === id).length;
  const totalUnits =
    mode === 'live'
      ? entries.length
      : Object.values(summary.counts ?? {}).reduce((a, b) => a + b, 0);

  return (
    <Panel aria-labelledby={titleId}>
      <div className="flex items-center justify-between gap-3">
        <SectionLabel index={index} id={titleId}>
          Hva har du drukket?
        </SectionLabel>
      </div>

      <Segmented
        label="Tidsstyring"
        value={mode}
        onChange={onModeChange}
        options={[
          {
            value: 'live',
            label: 'Logg fortløpende',
            hint: 'Klokkeslett per trykk',
            icon: ListPlus,
          },
          {
            value: 'summary',
            label: 'Oppsummer i etterkant',
            hint: 'Fordeles jevnt',
            icon: CalendarClock,
          },
        ]}
      />

      {mode === 'summary' && (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <TimeField
              label="Startet å drikke kl."
              value={toHHMM(summary.startTs)}
              onChange={(text) => onSummaryTime('start', text)}
            />
            <TimeField
              label="Sluttet å drikke kl."
              value={toHHMM(summary.endTs)}
              onChange={(text) => onSummaryTime('end', text)}
            />
          </div>
          <p className="text-xs text-zinc-400">
            Enhetene fordeles jevnt over {formatDuration(summary.endTs - summary.startTs)}.
          </p>
        </div>
      )}

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {DRINKS.map((drink) => (
          <DrinkTile
            key={drink.id}
            drink={drink}
            mode={mode}
            choice={choices[drink.id]}
            count={mode === 'live' ? loggedCount(drink.id) : (summary.counts?.[drink.id] ?? 0)}
            onChoice={(choice) => onChoiceChange(drink.id, choice)}
            onAdd={() => onAdd(drink.id)}
            onCount={(n) => onCount(drink.id, Math.max(0, Math.min(MAX_PER_DRINK, n)))}
          />
        ))}
      </ul>

      {mode === 'live' && (
        <div className="space-y-2">
          <SectionLabel as="h3">Registrert i kveld</SectionLabel>
          <EntryList
            entries={entries}
            now={now}
            onRetime={onRetime}
            onFinish={onFinish}
            onRemove={onRemove}
          />
        </div>
      )}

      <button
        type="button"
        onClick={onReset}
        disabled={totalUnits === 0}
        className="flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-bold text-zinc-200 transition hover:border-accent/50 hover:text-white disabled:opacity-40"
      >
        <RotateCcw aria-hidden="true" className="size-4" />
        Start ny kveld / Tøm liste
      </button>
    </Panel>
  );
}

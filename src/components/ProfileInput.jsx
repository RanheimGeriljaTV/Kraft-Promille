import { useId, useState } from 'react';
import { Utensils, Zap } from 'lucide-react';
import { PROFILE_LIMITS } from '../data/profile';
import { Panel, SectionLabel, Segmented } from './ui';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Slider og tallfelt for samme verdi. Tallfeltet kan være tomt mens man skriver. */
function RangeField({ name, value, onChange, limits }) {
  const id = useId();
  const { min, max, unit, label } = limits;
  const [draft, setDraft] = useState(null);
  const fill = ((value - min) / (max - min)) * 100;

  const commitText = (text) => {
    setDraft(text);
    const n = Number(text);
    if (text !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(Math.round(n));
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-bold text-white">
          {label}
        </label>
        <span className="flex items-center gap-1.5">
          <input
            id={id}
            name={name}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={draft ?? value}
            onChange={(e) => commitText(e.target.value)}
            onBlur={() => {
              const n = Number(draft);
              if (draft !== null)
                onChange(
                  clamp(Number.isFinite(n) && draft !== '' ? Math.round(n) : value, min, max),
                );
              setDraft(null);
            }}
            className="h-11 w-20 rounded-xl border border-white/10 bg-white/[0.04] px-2 text-right font-syne text-lg font-bold text-white tabular-nums focus:border-accent"
          />
          <span className="w-6 font-mono text-xs text-zinc-400">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        className="range"
        aria-label={label}
        aria-valuetext={`${value} ${unit}`}
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => {
          setDraft(null);
          onChange(Number(e.target.value));
        }}
        style={{ '--fill': `${fill}%` }}
      />
    </div>
  );
}

/** Kjønn, vekt, høyde, alder og mageinnhold. */
export default function ProfileInput({ index, profile, onChange }) {
  const titleId = useId();
  const set = (key) => (value) => onChange({ ...profile, [key]: value });

  return (
    <Panel aria-labelledby={titleId}>
      <SectionLabel index={index} id={titleId}>
        Profil
      </SectionLabel>

      <Segmented
        label="Kjønn"
        value={profile.sex}
        onChange={set('sex')}
        options={[
          { value: 'male', label: 'Mann' },
          { value: 'female', label: 'Kvinne' },
        ]}
      />

      {Object.entries(PROFILE_LIMITS).map(([key, limits]) => (
        <RangeField key={key} name={key} value={profile[key]} limits={limits} onChange={set(key)} />
      ))}

      <Segmented
        label="Mageinnhold"
        value={profile.stomach}
        onChange={set('stomach')}
        options={[
          { value: 'empty', label: 'Tom mage', hint: 'Raskt opptak: 30 min', icon: Zap },
          {
            value: 'fed',
            label: 'Spist mat / middag',
            hint: 'Normalt opptak: 60 min',
            icon: Utensils,
          },
        ]}
      />
      {profile.sex === 'female' && (
        <p className="text-xs leading-relaxed text-zinc-400">
          Watsons formel for kvinner bruker ikke alder, så alder påvirker ikke utregningen.
        </p>
      )}
    </Panel>
  );
}

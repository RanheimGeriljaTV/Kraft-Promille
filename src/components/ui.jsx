import { useId, useRef } from 'react';

/** Etikett i nettsidens stil («01 / Profil»). Er en h2, så skjermlesere kan hoppe mellom delene. */
export function SectionLabel({ index, children, id, as: Tag = 'h2' }) {
  return (
    <Tag id={id} className="font-syne text-xs font-bold tracking-wider text-zinc-400 uppercase">
      {index !== undefined && (
        <span aria-hidden="true">{`${String(index).padStart(2, '0')} / `}</span>
      )}
      {children}
    </Tag>
  );
}

/** Ramme rundt en del av siden. */
export function Panel({ className = '', children, ...rest }) {
  return (
    <section
      className={`space-y-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 ${className}`}
      {...rest}
    >
      {children}
    </section>
  );
}

/**
 * Store valgknapper side om side (radiogruppe). Piltaster flytter valget.
 * options: { value, label, hint?, icon? }[]
 */
export function Segmented({ label, options, value, onChange, columns = 2, size = 'lg' }) {
  const labelId = useId();
  const buttons = useRef([]);

  const handleKeyDown = (event, i) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!delta) return;
    event.preventDefault();
    const next = (i + delta + options.length) % options.length;
    onChange(options[next].value);
    buttons.current[next]?.focus();
  };

  const cols = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 min-[420px]:grid-cols-4' }[
    columns
  ];

  return (
    <div className="space-y-2">
      <p id={labelId} className="font-mono text-[11px] tracking-wide text-zinc-400 uppercase">
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className={`grid ${cols} gap-1.5 rounded-2xl border border-white/10 bg-white/[0.02] p-1.5`}
      >
        {options.map((option, i) => {
          const selected = option.value === value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => handleKeyDown(event, i)}
              className={`flex ${size === 'lg' ? 'min-h-14' : 'min-h-11'} touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-center transition select-none ${
                selected
                  ? 'bg-accent text-black shadow-lg shadow-accent/10'
                  : 'text-zinc-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5 text-sm leading-tight font-bold">
                {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
                {option.label}
              </span>{' '}
              {option.hint && (
                <span
                  className={`font-mono text-[10px] leading-tight ${selected ? 'text-black/70' : 'text-zinc-400'}`}
                >
                  {option.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

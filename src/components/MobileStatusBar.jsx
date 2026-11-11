import { ShieldCheck } from 'lucide-react';
import { level } from '../utils/bacCalculator';
import { dayLabel, formatPromille, roundUp5, toHHMM } from '../utils/time';
import { LEVEL_STYLE } from './levels';

/** Fast linje nederst på mobil: promillen nå og når «Sikker sone (0,00 ‰)» nås. */
export default function MobileStatusBar({ result, now }) {
  const { hasDrinks, safe } = result;
  const safeAt = hasDrinks && safe.soberAt !== null ? roundUp5(safe.soberAt) : null;
  const style = LEVEL_STYLE[level(result.now)];

  return (
    <div
      data-testid="mobile-bar"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-brand-navy/95 shadow-[0_-12px_30px_rgba(0,0,0,0.5)] backdrop-blur-md lg:hidden"
      style={{
        paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      <div className="mx-auto flex max-w-[640px] items-center justify-between gap-3 pt-2.5">
        <div>
          <p className="font-mono text-[10px] tracking-wide text-zinc-400 uppercase">Promille nå</p>
          <p
            className={`font-syne text-3xl leading-none font-black tracking-tighter tabular-nums ${hasDrinks ? style.text : 'text-white'}`}
          >
            {formatPromille(result.now)}
            <span className="ml-1 text-base text-zinc-400">‰</span>
          </p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1 font-mono text-[10px] tracking-wide text-emerald-300 uppercase">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            Sikker sone (0,00 ‰)
          </p>
          {safeAt === null ? (
            <p className="text-sm text-zinc-400">Ingen enheter</p>
          ) : (
            <p className="font-syne text-xl leading-tight font-black text-white tabular-nums">
              {safeAt <= now ? 'Nådd' : `kl. ${toHHMM(safeAt)}`}
              <span className="ml-1.5 font-mono text-[11px] font-normal text-zinc-400">
                {dayLabel(safeAt, now) !== 'i dag' && dayLabel(safeAt, now)}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

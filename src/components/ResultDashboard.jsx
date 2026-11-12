import { useId } from 'react';
import { Activity, Car, Hourglass, ShieldCheck } from 'lucide-react';
import {
  BURN_NORMAL,
  BURN_SAFE,
  DRIVING_LIMIT,
  bacAt,
  effectOf,
  level,
  sample,
} from '../utils/bacCalculator';
import { dayLabel, formatDuration, formatPromille, roundUp5, toHHMM } from '../utils/time';
import { LEVEL_LEGEND, LEVEL_STYLE } from './levels';
import { SectionLabel } from './ui';

const HOUR = 60 * 60 * 1000;
const fmtRate = (r) => r.toFixed(2).replace('.', ',');

/** «i morgen kl. 07:15» + «om 9 t 15 min», eller «nådd» når tidspunktet er passert. */
function When({ ts, now, big = false }) {
  if (ts === null || ts === undefined) return <span className="text-zinc-400">–</span>;
  const at = roundUp5(ts);
  const passed = at <= now;
  const day = dayLabel(at, now);
  return (
    <span className="block">
      <span
        className={`block font-syne font-black tracking-tight text-white tabular-nums ${big ? 'text-3xl' : 'text-xl'}`}
      >
        kl. {toHHMM(at)}
      </span>
      <span className="block font-mono text-[11px] text-zinc-400">
        {[day !== 'i dag' && day, passed ? 'anslag nådd' : `om ${formatDuration(at - now)}`]
          .filter(Boolean)
          .join(' · ')}
      </span>
    </span>
  );
}

function Card({ icon: Icon, title, subtitle, highlight = false, children, className = '' }) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={`flex flex-col gap-3 rounded-2xl border p-4 ${
        highlight
          ? 'border-emerald-400/50 bg-emerald-400/[0.07] shadow-lg shadow-emerald-500/5'
          : 'border-white/10 bg-white/[0.02]'
      } ${className}`}
    >
      <div className="flex items-start gap-2">
        <Icon
          aria-hidden="true"
          className={`mt-0.5 size-4 shrink-0 ${highlight ? 'text-emerald-300' : 'text-accent'}`}
        />
        <div className="min-w-0">
          <h3 id={id} className="font-syne text-sm leading-tight font-bold text-white">
            {title}
          </h3>
          {subtitle && <p className="font-mono text-[11px] text-zinc-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Linjediagram over begge kurvene, med fargede soner for nivåene. */
function Chart({ normal, safe, from, to, now }) {
  const W = 600;
  const H = 200;
  const pad = { l: 34, r: 8, t: 8, b: 22 };
  const pts = sample(normal.points, from, to);
  const safePts = sample(safe.points, from, to);
  const yMax = Math.max(0.6, Math.ceil(Math.max(normal.peak, safe.peak) * 5) / 5);
  const x = (t) => pad.l + ((t - from) / (to - from)) * (W - pad.l - pad.r);
  const y = (b) => pad.t + (1 - b / yMax) * (H - pad.t - pad.b);
  const path = (list) =>
    list.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.bac).toFixed(1)}`).join('');

  const hours = [];
  const firstHour = new Date(from).setMinutes(0, 0, 0) + HOUR;
  const every = to - from > 12 * HOUR ? 3 : to - from > 6 * HOUR ? 2 : 1;
  for (let t = firstHour; t < to; t += HOUR) {
    if (new Date(t).getHours() % every === 0) hours.push(t);
  }
  const ticks = [0, DRIVING_LIMIT, 0.5, ...[1, 1.5, 2, 2.5, 3].filter((v) => v <= yMax)];

  return (
    <figure className="space-y-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Graf over promillen fra kl. ${toHHMM(from)} til kl. ${toHHMM(to)}. Toppunkt ${formatPromille(normal.peak)} promille.`}
      >
        <rect
          x={pad.l}
          y={y(yMax)}
          width={W - pad.l - pad.r}
          height={y(0.5) - y(yMax)}
          className="fill-red-500/10"
        />
        <rect
          x={pad.l}
          y={y(0.5)}
          width={W - pad.l - pad.r}
          height={y(DRIVING_LIMIT) - y(0.5)}
          className="fill-orange-400/10"
        />
        <rect
          x={pad.l}
          y={y(DRIVING_LIMIT)}
          width={W - pad.l - pad.r}
          height={y(0) - y(DRIVING_LIMIT)}
          className="fill-yellow-300/[0.07]"
        />
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(v)}
              y2={y(v)}
              className="stroke-white/10"
              strokeWidth="1"
            />
            <text
              x={pad.l - 6}
              y={y(v) + 4}
              textAnchor="end"
              className="fill-zinc-400 font-mono text-[11px]"
            >
              {formatPromille(v).replace(/0$/, '')}
            </text>
          </g>
        ))}
        {hours.map((t) => (
          <text
            key={t}
            x={x(t)}
            y={H - 6}
            textAnchor="middle"
            className="fill-zinc-400 font-mono text-[11px]"
          >
            {toHHMM(t).slice(0, 2)}
          </text>
        ))}
        <path
          d={path(safePts)}
          fill="none"
          className="stroke-emerald-300"
          strokeWidth="2.5"
          strokeDasharray="6 5"
        />
        <path
          d={path(pts)}
          fill="none"
          className="stroke-accent"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {now > from && now < to && (
          <g>
            <line
              x1={x(now)}
              x2={x(now)}
              y1={pad.t}
              y2={H - pad.b}
              className="stroke-white/60"
              strokeWidth="1.5"
              strokeDasharray="2 3"
            />
            <circle cx={x(now)} cy={y(bacAt(normal.points, now))} r="5" className="fill-white" />
          </g>
        )}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-5 bg-accent" />
          Normal ({fmtRate(BURN_NORMAL)} ‰/t)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-0 w-5 border-t-2 border-dashed border-emerald-300"
          />
          Forsiktig anslag ({fmtRate(BURN_SAFE)} ‰/t)
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 rounded-full bg-white" />
          Nå
        </span>
      </figcaption>
    </figure>
  );
}

function Badge({ bac }) {
  const style = LEVEL_STYLE[level(bac)];
  return (
    <span
      className={`inline-flex min-w-16 items-center justify-end gap-1.5 rounded-full px-2 py-0.5 font-mono text-xs tabular-nums ${style.badge}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${style.dot}`} />
      {formatPromille(bac)}
    </span>
  );
}

/** Time-for-time fra første enhet til begge kurvene er på 0,00. */
function Timeline({ normal, safe, now }) {
  const from = normal.start;
  const end = Math.max(normal.soberAt, safe.soberAt);
  const rows = [from];
  for (let t = new Date(from).setMinutes(0, 0, 0) + HOUR; t < end; t += HOUR) rows.push(t);
  rows.push(end);
  // Toppunktet får en egen rad, ellers kan en topp midt mellom to hele timer forsvinne.
  const peakAt = normal.peakAt === null ? null : Math.round(normal.peakAt / 60000) * 60000;
  if (peakAt !== null && !rows.includes(peakAt)) rows.push(peakAt);
  rows.sort((a, b) => a - b);

  return (
    <div className="space-y-3">
      <Chart normal={normal} safe={safe} from={from} to={end} now={now} />

      <ul className="grid gap-1 font-mono text-[11px] text-zinc-400 sm:grid-cols-2">
        {LEVEL_LEGEND.map(({ key, label }) => (
          <li key={key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`size-2.5 shrink-0 rounded-full ${LEVEL_STYLE[key].dot}`}
            />
            {label}
          </li>
        ))}
      </ul>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Promille time for time, normal og konservativ forbrenning
          </caption>
          <thead className="bg-white/[0.04] font-mono text-[11px] tracking-wide text-zinc-400 uppercase">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-normal">
                Kl.
              </th>
              <th scope="col" className="px-3 py-2 text-right font-normal">
                Normal
              </th>
              <th scope="col" className="px-3 py-2 text-right font-normal">
                Forsiktig
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => {
              const n = bacAt(normal.points, t);
              const s = bacAt(safe.points, t);
              const isNow = t <= now && (rows[i + 1] ?? Infinity) > now;
              return (
                <tr
                  key={t}
                  className={`border-t border-white/5 ${isNow ? 'bg-white/[0.06]' : ''}`}
                  aria-current={isNow ? 'time' : undefined}
                >
                  <th
                    scope="row"
                    className="px-3 py-1.5 text-left font-mono font-normal text-zinc-200 tabular-nums"
                  >
                    {toHHMM(t)}
                    {isNow && <span className="ml-2 text-[10px] text-accent uppercase">nå</span>}
                    {t === peakAt && (
                      <span className="ml-2 text-[10px] text-zinc-400 uppercase">topp</span>
                    )}
                  </th>
                  <td className="px-3 py-1.5 text-right">
                    <Badge bac={n} />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <Badge bac={s} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Sanntidspromille, bilkjøring, forsiktig anslag, 12-timersregelen og tidslinje. */
export default function ResultDashboard({ index, result, now }) {
  const titleId = useId();
  const { hasDrinks, normal, safe, twelveHourAt } = result;
  const promille = result.now;
  const style = LEVEL_STYLE[level(promille)];

  const twelveVsSafe =
    hasDrinks && safe.soberAt !== null && twelveHourAt !== null
      ? twelveHourAt - safe.soberAt
      : null;

  return (
    <section aria-labelledby={titleId} className="space-y-4">
      <SectionLabel index={index} id={titleId}>
        Resultat
      </SectionLabel>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card icon={Activity} title="Estimert promille nå" className="sm:col-span-2">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
            <p
              data-testid="promille-now"
              className={`font-syne text-6xl leading-none font-black tracking-tighter tabular-nums ${hasDrinks ? style.text : 'text-white'}`}
            >
              {formatPromille(promille)}
              <span className="ml-1 text-2xl text-zinc-400">‰</span>
            </p>
            <p className="min-w-0 flex-1 basis-48 text-sm leading-snug text-zinc-300">
              {effectOf(promille)}
            </p>
          </div>
          <p className="font-mono text-xs text-zinc-400">
            {hasDrinks && normal.peakAt !== null
              ? `Toppunkt i kveld: ${formatPromille(normal.peak)} ‰ kl. ${toHHMM(normal.peakAt)}`
              : 'Legg inn det du har drukket, så regnes kvelden ut.'}
          </p>
        </Card>

        <Card
          icon={Car}
          title="Bilkjøring: 0,00 ‰ og 0,2 ‰-grensen"
          subtitle={`Normal forbrenning ${fmtRate(BURN_NORMAL)} ‰/t`}
        >
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="font-mono text-[11px] text-zinc-400 uppercase">0,00 ‰</dt>
              <dd data-testid="normal-sober">
                <When ts={hasDrinks ? normal.soberAt : null} now={now} />
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] text-zinc-400 uppercase">Under 0,2 ‰</dt>
              <dd>
                {hasDrinks && normal.legalAt === null ? (
                  <span className="block text-sm text-zinc-300">Anslått under 0,2 ‰</span>
                ) : (
                  <When ts={hasDrinks ? normal.legalAt : null} now={now} />
                )}
              </dd>
            </div>
          </dl>
          <p className="text-xs leading-snug text-zinc-300">
            Over 0,2 ‰ regnes du alltid som påvirket. Under 0,2 ‰ kan du likevel straffes hvis du er
            påvirket, og det vurderes etter skjønn og oppførsel. Kjør først på 0,00 ‰.
          </p>
        </Card>

        <Card
          icon={ShieldCheck}
          title="Forsiktig anslag for 0,00 ‰"
          subtitle={`Forbrenning ${fmtRate(BURN_SAFE)} ‰/t, full opptakstid og ingen resorpsjonstap`}
          highlight
        >
          <div data-testid="safe-sober">
            <When ts={hasDrinks ? safe.soberAt : null} now={now} big />
          </div>
          <p className="text-xs leading-snug text-emerald-100/80">
            Det forsiktigste anslaget dagen derpå: også med treg forbrenning er du da sannsynligvis
            nede på 0,00 ‰. Det er fortsatt et estimat, ikke en garanti.
          </p>
        </Card>

        <Card
          icon={Hourglass}
          title="12-timersregelen etter siste enhet"
          subtitle={
            hasDrinks
              ? `Siste slurk kl. ${toHHMM(result.lastDrinkAt)} · bare en tommelfingerregel`
              : 'Bare en tommelfingerregel'
          }
          className="sm:col-span-2"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div data-testid="twelve-hour">
              <When ts={twelveHourAt} now={now} />
            </div>
            {twelveVsSafe !== null && (
              <p
                className={`max-w-xs text-xs leading-snug ${twelveVsSafe < 0 ? 'text-orange-300' : 'text-zinc-300'}`}
              >
                {twelveVsSafe < 0
                  ? `Obs: 12 timer er ikke nok i kveld. Det forsiktige anslaget kommer ${formatDuration(-twelveVsSafe)} senere.`
                  : `12-timersregelen er ${formatDuration(twelveVsSafe)} etter ditt forsiktige anslag.`}
              </p>
            )}
          </div>
          <p className="text-xs leading-snug text-zinc-400">
            Ikke stol på 12-timersregelen. Hvor lang tid du trenger, avhenger av hvor mye, hvor
            sterkt og hvor tett du har drukket. Bruk heller det forsiktige anslaget, og vær
            forsiktig også da.
          </p>
        </Card>
      </div>

      {hasDrinks && (
        <section
          aria-label="Tidslinje"
          className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4"
        >
          <SectionLabel as="h3">Time for time</SectionLabel>
          <Timeline normal={normal} safe={safe} now={now} />
        </section>
      )}
    </section>
  );
}

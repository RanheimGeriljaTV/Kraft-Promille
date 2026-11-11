/** Tailwind-klasser per fargekode. Hele klassenavn, så Tailwind finner dem. */
export const LEVEL_STYLE = {
  red: { dot: 'bg-red-500', badge: 'bg-red-500/15 text-red-300', text: 'text-red-300' },
  orange: {
    dot: 'bg-orange-400',
    badge: 'bg-orange-400/15 text-orange-300',
    text: 'text-orange-300',
  },
  yellow: {
    dot: 'bg-yellow-300',
    badge: 'bg-yellow-300/15 text-yellow-200',
    text: 'text-yellow-200',
  },
  green: {
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-400/15 text-emerald-300',
    text: 'text-emerald-300',
  },
};

export const LEVEL_LEGEND = [
  { key: 'red', label: 'Over 0,5 ‰' },
  { key: 'orange', label: '0,2–0,5 ‰ – over lovlig grense' },
  { key: 'yellow', label: '0,01–0,19 ‰ – under grensen, men alkohol i blodet' },
  { key: 'green', label: '0,00 ‰ på begge kurver' },
];

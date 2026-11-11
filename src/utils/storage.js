/**
 * Lagring av økten i localStorage. Ingenting sendes over nett.
 * localStorage kan mangle eller kaste feil (privat modus, blokkert lagring),
 * så alle kall er pakket inn, og appen virker uten.
 */
export const STORAGE_KEY = 'kraft-promille:v1';

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Full eller blokkert lagring: appen virker fortsatt, men husker ikke økten.
  }
}

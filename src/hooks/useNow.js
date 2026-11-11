import { useEffect, useState } from 'react';

/** Tidspunktet nå (ms), oppdatert hvert `intervalMs` (standard 30 s), så promillen og klokkeslettene holder seg riktige. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    // Oppdater med en gang når fanen blir synlig igjen (mobil i lomma hele kvelden).
    const onVisible = () => document.visibilityState === 'visible' && setNow(Date.now());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);

  return now;
}

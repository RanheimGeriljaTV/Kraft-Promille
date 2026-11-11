import { useEffect, useRef, useState } from 'react';

/**
 * Tekst til en aria-live-region. Er tom ved første visning (ingenting å melde),
 * og oppdateres først når `message` har stått stille i `delayMs`, slik at
 * skjermlesere ikke leser opp hvert mellomsteg.
 */
export function useAnnouncement(message, delayMs) {
  const [announcement, setAnnouncement] = useState('');
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const id = window.setTimeout(() => setAnnouncement(message), delayMs);
    return () => window.clearTimeout(id);
  }, [message, delayMs]);

  return announcement;
}

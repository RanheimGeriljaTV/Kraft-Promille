// Testene kjører i norsk tid, så sommertid (25.10.2026 og 29.03.2026) kan testes.
process.env.TZ = 'Europe/Oslo';

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

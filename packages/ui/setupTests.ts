import '@testing-library/jest-dom';

import { afterEach, beforeAll, vi } from 'vitest';

const raf: typeof requestAnimationFrame = (cb) =>
  +setTimeout(() => cb(Date.now()), 0);
const caf: typeof cancelAnimationFrame = (id) =>
  clearTimeout(id);

beforeAll(() => {
  vi.stubGlobal('requestAnimationFrame', raf);
  vi.stubGlobal('cancelAnimationFrame', caf);
  if (typeof window !== 'undefined') {
    window.requestAnimationFrame = raf;
    window.cancelAnimationFrame = caf;
  }
});

afterEach(() => {
  vi.useRealTimers();
});
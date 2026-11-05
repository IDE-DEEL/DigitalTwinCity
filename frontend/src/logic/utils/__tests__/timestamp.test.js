import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCurrentTimestamp } from '../timestamp';
afterEach(() => vi.useRealTimers());
describe('timestamp', () => {
 it('uses padded local date and time', () => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026,0,2,3,4,5)); expect(getCurrentTimestamp()).toBe('2026-01-02_03-04-05'); });
});

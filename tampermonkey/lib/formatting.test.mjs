import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { formatMoney, formatGrowthPercent } = require('../endowus_portfolio_viewer.user.js');

describe('formatMoney', () => {
    it('formats numbers as currency with commas', () => {
        expect(formatMoney(1234)).toBe('$1,234.00');
    });

    it('returns dash for non-number values', () => {
        expect(formatMoney(NaN)).toBe('-');
        expect(formatMoney('1234')).toBe('-');
    });
});

describe('formatGrowthPercent', () => {
    it('calculates growth percentage based on principal', () => {
        expect(formatGrowthPercent(10, 110)).toBe('10.00%');
    });

    it('returns dash for invalid inputs or zero principal', () => {
        expect(formatGrowthPercent(0, 0)).toBe('-');
        expect(formatGrowthPercent('foo', 100)).toBe('-');
    });
});

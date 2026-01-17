# Demo Bucket Configuration

*Generated on: 2026-01-17 23:44:30*

This document tracks the bucket and target configuration used in the demo.

---

## House Purchase Bucket

**Total Target Investment:** $200,000.00

**Total Actual Investment:** $191,519.83

**Total Returns:** $22,865.43 (+11.94%)

**Ending Balance:** $214,385.26

**Time Horizon:** 1.0 year(s) (365 days)

### Goals Breakdown

| Goal | Target | Actual Investment | Returns | Return % | Ending Balance |
|------|--------|-------------------|---------|----------|----------------|
| Core - Balanced | $140,000.00 | $139,430.99 | $19,543.89 | +16.30% | $158,974.88 |
| Megatrends | $20,000.00 | $19,101.80 | $2,950.15 | +18.27% | $22,051.95 |
| Tech | $20,000.00 | $18,993.87 | $1,444.41 | +8.23% | $20,438.28 |
| China | $20,000.00 | $13,993.17 | $-1,073.02 | -7.12% | $12,920.15 |

### Target Allocations

| Goal | Target % | Actual % | Target Amount | Actual Amount | Variance |
|------|----------|----------|---------------|---------------|----------|
| Core - Balanced | 70% | 72.80% | $140,000.00 | $139,430.99 | +2.80% |
| Megatrends | 10% | 9.97% | $20,000.00 | $19,101.80 | -0.03% |
| Tech | 10% | 9.92% | $20,000.00 | $18,993.87 | -0.08% |
| China | 10% | 7.31% | $20,000.00 | $13,993.17 | -2.69% |

### Time-Series Performance

| Goal | Start Date | End Date | Contribution Date | Data Points |
|------|------------|----------|-------------------|--------------|
| Core - Balanced | 2025-01-17 | 2026-01-16 | 2025-11-22 | 365 |
| Megatrends | 2025-01-17 | 2026-01-16 | 2025-12-06 | 365 |
| Tech | 2025-01-17 | 2026-01-16 | 2025-10-25 | 365 |
| China | 2025-01-17 | 2026-01-16 | 2025-12-16 | 365 |

---

## Retirement Bucket

**Total Target Investment:** $60,000.00

**Total Actual Investment:** $58,753.81

**Total Returns:** $8,597.97 (+14.63%)

**Ending Balance:** $67,351.78

**Time Horizon:** 2.0 year(s) (730 days)

### Goals Breakdown

| Goal | Target | Actual Investment | Returns | Return % | Ending Balance |
|------|--------|-------------------|---------|----------|----------------|
| Core - Aggressive | $33,000.00 | $32,195.86 | $4,914.55 | +18.01% | $37,110.41 |
| Megatrends | $9,000.00 | $9,831.34 | $1,877.99 | +23.61% | $11,709.33 |
| Tech | $9,000.00 | $9,162.90 | $1,637.85 | +21.77% | $10,800.75 |
| China | $9,000.00 | $7,563.71 | $167.58 | +2.27% | $7,731.29 |

### Target Allocations

| Goal | Target % | Actual % | Target Amount | Actual Amount | Variance |
|------|----------|----------|---------------|---------------|----------|
| Core - Aggressive | 55% | 54.80% | $33,000.00 | $32,195.86 | -0.20% |
| Megatrends | 15% | 16.73% | $9,000.00 | $9,831.34 | +1.73% |
| Tech | 15% | 15.60% | $9,000.00 | $9,162.90 | +0.60% |
| China | 15% | 12.87% | $9,000.00 | $7,563.71 | -2.13% |

### Time-Series Performance

| Goal | Start Date | End Date | Contribution Date | Data Points |
|------|------------|----------|-------------------|--------------|
| Core - Aggressive | 2024-01-18 | 2026-01-16 | 2025-11-30 | 730 |
| Megatrends | 2024-01-18 | 2026-01-16 | 2025-11-01 | 730 |
| Tech | 2024-01-18 | 2026-01-16 | 2025-11-01 | 730 |
| China | 2024-01-18 | 2026-01-16 | 2025-11-16 | 730 |

---

## Usage Notes

- All actual investments have realistic variance from targets (-8% to +10%) for demo realism
- Returns are randomized within specified ranges per goal type
- Time-series data includes bumpy/realistic market volatility patterns
- Each goal has a 25% contribution event in the final 90 days
- House Purchase bucket spans 1 year (365 days)
- Retirement bucket spans 2 years (730 days)
- Regenerate this file whenever running `generate-mock-data.py`
- Use this configuration as reference for future demo updates

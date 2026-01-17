# Demo Bucket Configuration

*Generated on: 2026-01-17 21:56:28*

This document tracks the bucket and target configuration used in the demo.

---

## House Purchase Bucket

**Total Target Investment:** $200,000.00

**Total Actual Investment:** $168,014.43

**Total Returns:** $5,894.38 (+3.51%)

**Ending Balance:** $173,908.81

**Time Horizon:** 1.0 year(s) (365 days)

### Goals Breakdown

| Goal | Target | Actual Investment | Returns | Return % | Ending Balance |
|------|--------|-------------------|---------|----------|----------------|
| Core - Balanced | $140,000.00 | $117,934.52 | $2,956.10 | +2.57% | $120,890.62 |
| Megatrends | $20,000.00 | $16,679.30 | $589.14 | +3.66% | $17,268.44 |
| Tech | $20,000.00 | $16,580.79 | $1,040.92 | +6.70% | $17,621.71 |
| China | $20,000.00 | $16,819.82 | $1,308.22 | +8.43% | $18,128.04 |

### Target Allocations

| Goal | Target % | Actual % | Target Amount | Actual Amount | Variance |
|------|----------|----------|---------------|---------------|----------|
| Core - Balanced | 70% | 70.19% | $140,000.00 | $117,934.52 | +0.19% |
| Megatrends | 10% | 9.93% | $20,000.00 | $16,679.30 | -0.07% |
| Tech | 10% | 9.87% | $20,000.00 | $16,580.79 | -0.13% |
| China | 10% | 10.01% | $20,000.00 | $16,819.82 | +0.01% |

### Time-Series Performance

| Goal | Start Date | End Date | Contribution Date | Data Points |
|------|------------|----------|-------------------|--------------|
| Core - Balanced | 2025-01-17 | 2026-01-16 | 2025-11-11 | 365 |
| Megatrends | 2025-01-17 | 2026-01-16 | 2025-11-06 | 365 |
| Tech | 2025-01-17 | 2026-01-16 | 2025-12-06 | 365 |
| China | 2025-01-17 | 2026-01-16 | 2025-11-17 | 365 |

---

## Retirement Bucket

**Total Target Investment:** $60,000.00

**Total Actual Investment:** $56,592.23

**Total Returns:** $6,626.30 (+11.71%)

**Ending Balance:** $63,218.53

**Time Horizon:** 2.0 year(s) (730 days)

### Goals Breakdown

| Goal | Target | Actual Investment | Returns | Return % | Ending Balance |
|------|--------|-------------------|---------|----------|----------------|
| Core - Aggressive | $33,000.00 | $30,984.78 | $3,711.18 | +13.61% | $34,695.96 |
| Megatrends | $9,000.00 | $9,486.37 | $1,644.85 | +20.98% | $11,131.22 |
| Tech | $9,000.00 | $6,289.68 | $-684.56 | -9.82% | $5,605.12 |
| China | $9,000.00 | $9,831.40 | $1,954.83 | +24.82% | $11,786.23 |

### Target Allocations

| Goal | Target % | Actual % | Target Amount | Actual Amount | Variance |
|------|----------|----------|---------------|---------------|----------|
| Core - Aggressive | 55% | 54.75% | $33,000.00 | $30,984.78 | -0.25% |
| Megatrends | 15% | 16.76% | $9,000.00 | $9,486.37 | +1.76% |
| Tech | 15% | 11.11% | $9,000.00 | $6,289.68 | -3.89% |
| China | 15% | 17.37% | $9,000.00 | $9,831.40 | +2.37% |

### Time-Series Performance

| Goal | Start Date | End Date | Contribution Date | Data Points |
|------|------------|----------|-------------------|--------------|
| Core - Aggressive | 2024-01-18 | 2026-01-16 | 2025-12-06 | 730 |
| Megatrends | 2024-01-18 | 2026-01-16 | 2025-10-19 | 730 |
| Tech | 2024-01-18 | 2026-01-16 | 2025-12-16 | 730 |
| China | 2024-01-18 | 2026-01-16 | 2025-12-17 | 730 |

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

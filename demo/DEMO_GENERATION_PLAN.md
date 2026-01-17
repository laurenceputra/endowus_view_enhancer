# Demo Generation Plan

*This document provides a comprehensive plan for generating demo data for the Goal Portfolio Viewer.*

---

## Overview

The demo generation system creates realistic mock data including:
- Portfolio buckets with target allocations
- Time-series performance data with realistic market fluctuations
- Contribution events (simulating portfolio additions)
- Target percentages for allocation tracking
- **Cache-based performance data loading** (no external API calls required)

## Demo Mode Architecture

### Performance Data Caching

The demo uses a client-side caching mechanism to avoid external API dependencies:

1. **Data Storage**: Mock performance data is stored in browser storage with key format `gpv_performance_${goalId}`
2. **Storage Format**:
   ```javascript
   {
     fetchedAt: Date.now(),
     response: {
       timeSeries: { data: [...] },
       returnsTable: {...},
       totalCumulativeReturnPercent: ...,
       totalCumulativeReturnAmount: ...
     }
   }
   ```
3. **Cache Fallback**: When BFF endpoint is unavailable (blocked in demo), the userscript automatically falls back to cached data
4. **Freshness Check**: Cache is bypassed on fetch failure to ensure demo works even with stale data

### How It Works

1. `demo-clean.html` loads `mock-data.json`
2. For each goal, performance time-series is stored via `GM_setValue()`
3. Userscript attempts to fetch from BFF endpoint (fails in demo)
4. On fetch failure, userscript checks cache with `ignoreFreshness=true`
5. Cached data is used to render performance charts

This ensures the demo works completely offline without any external dependencies.

## Bucket Configurations

### House Purchase Bucket
- **Target Total**: ~$200,000 SGD
- **Time Horizon**: 1 year (12 months of data)
- **Target Allocation**:
  - 70% Core - Balanced ($140,000)
  - 10% Megatrends ($20,000)
  - 10% Tech ($20,000)
  - 10% China ($20,000)
- **Contribution Event**: 25% portfolio addition in final 3 months

### Retirement Bucket
- **Target Total**: ~$60,000 SGD
- **Time Horizon**: 2 years (24 months of data)
- **Target Allocation**:
  - 55% Core - Aggressive ($33,000)
  - 15% Megatrends ($9,000)
  - 15% Tech ($9,000)
  - 15% China ($9,000)
- **Contribution Event**: 25% portfolio addition in final 3 months

## Data Generation Parameters

### Actual Investment Amounts
- Variance: -8% to +10% from target amounts
- Purpose: Provides realistic deviation from perfect target allocations
- Implementation: `random.uniform(0.92, 1.10)`

### Return Rates by Asset Type
- **Core - Balanced**: 5% to 12% annualized
- **Core - Aggressive**: 6% to 14% annualized
- **Megatrends**: 3% to 15% annualized
- **Tech**: -2% to 20% annualized (higher volatility)
- **China**: -8% to 18% annualized (highest volatility)

### Time-Series Generation

#### Daily Data Points
- **House Purchase**: 365 days (1 year)
- **Retirement**: 730 days (2 years)
- **Frequency**: Daily closing balances

#### Market Volatility Pattern
1. **Baseline Trend**: Smooth growth based on target return rate
2. **Daily Volatility**: ±0.5% to ±2% random fluctuations
3. **Weekly Cycles**: Slight dips mid-week, recovery end-week
4. **Monthly Volatility Events**: 2-3 larger swings (±3-5%) per year
5. **Market Corrections**: 1-2 drawdowns of 5-10% that recover over weeks

#### Contribution Event (Final 3 Months)
- **Timing**: Random date within the final 90 days
- **Amount**: 25% of current portfolio value
- **Implementation**: 
  - Calculate current balance at contribution date
  - Add 25% to `cumulativeNetInvestmentAmount`
  - Balance jumps by contribution amount
  - Subsequent returns calculated on new higher base

## File Structure

### Generated Files

#### 1. `mock-data.json`
Primary data file containing:
```json
{
  "performance": [...],      // Basic performance metrics
  "investible": [...],       // Investment amounts and goal types
  "summary": [...],          // Goal summaries
  "performanceTimeSeries": { // NEW: Time-series data per goal
    "goalId": {
      "timeSeries": {
        "data": [
          {
            "date": "2025-01-01",
            "amount": 50000.00,
            "cumulativeNetInvestmentAmount": 50000.00
          },
          ...
        ]
      },
      "returnsTable": {
        "allTimeValue": 0.0872,
        "oneYearValue": 0.0872,
        ...
      },
      "totalCumulativeReturnPercent": 8.72,
      "totalCumulativeReturnAmount": 4360.00
    }
  }
}
```

#### 2. `BUCKET_CONFIGURATION.md`
Documentation file containing:
- Bucket summaries (totals, returns, growth)
- Goals breakdown (actual investments, returns, percentages)
- Target allocations (target vs actual comparison with variance)
- Time-series statistics (start date, end date, contribution events)

## Generation Process

### Step 1: Initialize Goals
```python
for each bucket:
    for each goal_type:
        calculate actual_amount = target_amount * random.uniform(0.92, 1.10)
        assign target_percentage from bucket config
        store goal metadata
```

### Step 2: Generate Time-Series Data
```python
for each goal:
    # Determine time horizon
    days = 365 if goal.bucket == "House Purchase" else 730
    start_date = today - days
    
    # Calculate initial investment (before any contributions)
    initial_investment = actual_amount / 1.25  # Account for future 25% contribution
    
    # Generate daily data points
    for day in range(days):
        date = start_date + day
        
        # Apply baseline growth
        daily_return_rate = (annual_return_rate / 365)
        
        # Add volatility
        volatility = generate_volatility(day, days)
        
        # Calculate balance
        balance = calculate_balance(initial_investment, daily_return_rate, volatility, day)
        
        # Check for contribution event (in final 90 days)
        if days - day <= 90 and not contribution_made:
            balance += balance * 0.25
            cumulative_net_investment += balance * 0.25
            contribution_made = True
        
        # Store data point
        timeSeries.append({
            date: date,
            amount: balance,
            cumulativeNetInvestmentAmount: cumulative_net_investment
        })
```

### Step 3: Calculate Performance Metrics
```python
for each goal:
    # From time-series data
    starting_balance = timeSeries[0].amount
    ending_balance = timeSeries[-1].amount
    total_contributions = timeSeries[-1].cumulativeNetInvestmentAmount
    
    # Calculate returns
    total_return = ending_balance - total_contributions
    return_percent = (total_return / total_contributions) * 100
    
    # Store in performance data
```

### Step 4: Generate Target Columns
```python
for each goal:
    # Calculate target percentage for this goal within its goal type
    bucket_total = sum(goal.actual_amount for goal in same_bucket)
    target_percent = (goal.target_amount / target_total) * 100
    
    # Store for diff calculation in UI
    goal.target_percent = target_percent
```

### Step 5: Generate Documentation
```python
# Create BUCKET_CONFIGURATION.md with:
- Bucket summaries
- Goals breakdown
- Target allocations table with variance
- Time-series metadata (date range, contribution events)
```

## Volatility Generation Algorithm

### Function: `generate_bumpy_time_series()`

```python
def generate_bumpy_time_series(initial_amount, annual_return, days):
    """
    Generate realistic market data with bumps and volatility
    """
    data = []
    current_amount = initial_amount
    cumulative_investment = initial_amount
    contribution_made = False
    
    # Pre-generate volatility events
    correction_days = random.sample(range(days//3, days-90), k=2)
    high_volatility_days = random.sample(range(days), k=int(days * 0.05))
    
    for day in range(days):
        # Baseline daily growth
        daily_growth = (annual_return / 365) * current_amount
        
        # Weekly pattern (slight dip mid-week)
        week_day = day % 7
        weekly_factor = 0.998 if week_day in [2, 3] else 1.002
        
        # Normal daily volatility
        if day in high_volatility_days:
            volatility = random.uniform(-0.03, 0.03)  # ±3%
        else:
            volatility = random.uniform(-0.01, 0.01)  # ±1%
        
        # Market corrections (gradual recovery)
        correction_factor = 1.0
        for correction_day in correction_days:
            if correction_day <= day < correction_day + 30:
                # Drawdown over 5 days, recover over 25 days
                days_since = day - correction_day
                if days_since < 5:
                    correction_factor *= (1 - 0.02 * days_since)  # Drop 10% over 5 days
                else:
                    recovery_days = days_since - 5
                    correction_factor *= (0.90 + 0.10 * (recovery_days / 25))
        
        # Apply all factors
        current_amount += daily_growth
        current_amount *= (1 + volatility) * weekly_factor * correction_factor
        
        # Contribution event in final 90 days
        if days - day <= 90 and not contribution_made and random.random() < 0.05:
            contribution_amount = current_amount * 0.25
            current_amount += contribution_amount
            cumulative_investment += contribution_amount
            contribution_made = True
        
        data.append({
            'date': format_date(start_date + timedelta(days=day)),
            'amount': round(current_amount, 2),
            'cumulativeNetInvestmentAmount': round(cumulative_investment, 2)
        })
    
    return data
```

## Usage Instructions

### Generate New Demo Data

```bash
cd demo
python3 generate-mock-data.py
```

This will:
1. Generate new randomized actual amounts (within variance range)
2. Create bumpy time-series data for all goals
3. Add 25% contribution in final 3 months
4. Calculate all performance metrics
5. Update `mock-data.json`
6. Regenerate `BUCKET_CONFIGURATION.md`

### View Demo

```bash
cd demo
python3 -m http.server 8080
# Open http://localhost:8080/demo-clean.html
```

### Take Screenshots

```bash
cd demo
python3 take-screenshots.py
# Follow manual instructions to capture:
# - Summary view
# - House Purchase detail (with performance chart)
# - Retirement detail (with performance chart)
```

## Validation Checklist

After generating new demo data, verify:

- [ ] House Purchase time-series spans exactly 1 year
- [ ] Retirement time-series spans exactly 2 years
- [ ] Both buckets show bumpy/realistic performance patterns
- [ ] 25% contribution event visible in final 3 months for each goal
- [ ] Target columns populated in detail views
- [ ] Diff column shows variance from targets
- [ ] All actual amounts within -8% to +10% of targets
- [ ] Performance charts render smoothly
- [ ] No console errors in browser
- [ ] Screenshots updated in `docs/` folder

## Future Enhancements

### Potential Improvements
1. **Configurable Parameters**: CLI args for bucket amounts, time horizons, volatility
2. **Multiple Contributions**: Support multiple contribution events
3. **Redemptions**: Support withdrawal events
4. **Currency Support**: Generate data in multiple currencies
5. **Asset Class Variations**: Different volatility profiles per asset class
6. **Seasonal Patterns**: Model end-of-year tax-loss harvesting, rebalancing

### Extensibility
The generation system is designed to be extensible:
- Add new buckets by extending `bucket_configs` list
- Modify volatility by adjusting `generate_bumpy_time_series()` parameters
- Change time horizons by modifying `days` parameter
- Customize contribution patterns in contribution event logic

---

*Last Updated: 2026-01-17*
*Version: 2.0*

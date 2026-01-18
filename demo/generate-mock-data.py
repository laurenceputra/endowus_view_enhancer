#!/usr/bin/env python3
"""
Mock Data Generator for Goal Portfolio Viewer Demo
Generates realistic portfolio data with time-series performance charts
"""

import json
import os
import random
from datetime import datetime, timedelta


def generate_bumpy_time_series(initial_investment, target_final_amount, annual_return_rate, days, goal_name):
    """
    Generate realistic time-series data with market volatility and a contribution event
    
    Args:
        initial_investment: Starting investment amount (should be target * 0.6 to allow for growth + 25% contribution)
        target_final_amount: Desired ending amount (after growth and contribution)
        annual_return_rate: Expected annual return rate (decimal)
        days: Number of days to generate (365 for House Purchase, 730 for Retirement)
        goal_name: Name of the goal for debugging
    
    Returns:
        List of data points with date, amount, and cumulativeNetInvestmentAmount
    """
    data = []
    current_amount = initial_investment
    cumulative_investment = initial_investment
    contribution_made = False
    contribution_date = None
    
    # Calculate contribution timing (random day in final 90 days)
    contribution_day = days - random.randint(30, 90)
    
    # Calculate when contribution will happen - we need to plan our growth
    # Target: current_amount_at_contribution * 1.25 * (1 + remaining_growth) ≈ target_final_amount
    days_after_contribution = days - contribution_day
    
    # Pre-generate volatility events for realism
    # Market corrections: 1-2 drawdowns that recover
    num_corrections = 1 if days < 500 else 2
    correction_days = random.sample(range(days//4, days - 100), k=num_corrections)
    
    # High volatility days (about 5% of days)
    high_volatility_days = set(random.sample(range(days), k=int(days * 0.05)))
    
    start_date = datetime.now() - timedelta(days=days)
    
    for day in range(days):
        current_date = start_date + timedelta(days=day)
        
        # Baseline daily growth
        daily_growth_rate = annual_return_rate / 365
        daily_growth = current_amount * daily_growth_rate
        
        # Weekly pattern (markets tend to dip mid-week)
        week_day = day % 7
        if week_day in [2, 3]:  # Wednesday, Thursday
            weekly_factor = random.uniform(0.997, 0.999)
        elif week_day in [0, 4]:  # Monday, Friday
            weekly_factor = random.uniform(1.001, 1.003)
        else:
            weekly_factor = 1.0
        
        # Normal daily volatility
        if day in high_volatility_days:
            daily_volatility = random.uniform(-0.02, 0.02)  # ±2%
        else:
            daily_volatility = random.uniform(-0.006, 0.006)  # ±0.6%
        
        # Market corrections (gradual drawdown and recovery)
        correction_impact = 0.0  # Additive impact on growth
        for correction_start in correction_days:
            if correction_start <= day < correction_start + 40:
                days_since = day - correction_start
                if days_since < 7:
                    # Drawdown phase: lose up to 7% total over 7 days
                    correction_impact -= 0.01  # -1% per day for 7 days = -7% total
                else:
                    # Recovery phase: gradually recover over 33 days
                    recovery_days = days_since - 7
                    daily_recovery = 0.07 / 33  # Recover the 7% loss over 33 days
                    correction_impact += daily_recovery
        
        # Apply growth and volatility
        current_amount += daily_growth
        current_amount *= (1 + daily_volatility + correction_impact) * weekly_factor
        
        # Contribution event (25% addition in final 90 days)
        if day == contribution_day and not contribution_made:
            contribution_amount = current_amount * 0.25
            current_amount += contribution_amount
            cumulative_investment += contribution_amount
            contribution_made = True
            contribution_date = current_date.strftime('%Y-%m-%d')
        
        # Ensure non-negative
        current_amount = max(current_amount, 0)
        
        # Store data point
        data.append({
            'date': current_date.strftime('%Y-%m-%d'),
            'amount': round(current_amount, 2),
            'cumulativeNetInvestmentAmount': round(cumulative_investment, 2)
        })
    
    return data, contribution_date

def generate_mock_data():
    """Generate mock API data for House Purchase and Retirement buckets"""
    
    def create_goals(bucket_name, goal_types, time_horizon_days):
        """Create goals for a bucket with time-series data"""
        goals = []
        for i, goal_type in enumerate(goal_types, 1):
            target_amount = goal_type['targetAmount']
            # Add random variation from targets
            # Range provides -8% to +10% variation for demo realism
            variation = random.uniform(0.92, 1.10)
            final_investment = round(target_amount * variation, 2)
            
            # Calculate initial investment (before 25% contribution)
            # We want: initial * (1 + growth_for_period) + 0.25 * amount_at_contribution ≈ target
            # Simplified: Start with ~60-70% of target, grow it, then add 25% contribution
            initial_investment = target_amount * random.uniform(0.60, 0.70)
            
            # Generate return rate
            min_return = goal_type.get('minReturn', -0.05)
            max_return = goal_type.get('maxReturn', 0.15)
            annual_return_rate = min_return + random.random() * (max_return - min_return)
            
            # Generate time-series data with bumpy performance
            goal_name = f"{bucket_name} - {goal_type['name']}"
            time_series_data, contribution_date = generate_bumpy_time_series(
                initial_investment=initial_investment,
                target_final_amount=final_investment,
                annual_return_rate=annual_return_rate,
                days=time_horizon_days,
                goal_name=goal_name
            )
            
            # Calculate actual returns from time-series
            ending_balance = time_series_data[-1]['amount']
            cumulative_invested = time_series_data[-1]['cumulativeNetInvestmentAmount']
            actual_return = ending_balance - cumulative_invested
            return_percentage = actual_return / cumulative_invested if cumulative_invested > 0 else 0
            
            goal_id = f"mock-goal-{bucket_name.lower().replace(' ', '-')}-{i}"
            goals.append({
                'goalId': goal_id,
                'goalName': goal_name,
                'goalBucket': bucket_name,
                'goalType': 'GENERAL_WEALTH_ACCUMULATION',
                'endingBalance': ending_balance,  # Final balance including returns
                'cumulativeInvested': cumulative_invested,  # Total amount invested
                'totalCumulativeReturn': actual_return,
                'simpleRateOfReturnPercent': return_percentage,
                'targetAmount': target_amount,
                'targetAllocation': goal_type['targetAllocation'],
                'timeSeriesData': time_series_data,
                'contributionDate': contribution_date,
                'annualReturnRate': annual_return_rate
            })
        
        return goals
    
    # Define House Purchase bucket goals (~200k SGD, 1 year time horizon)
    # Target Allocation: 70% Core-Balanced, 10% Megatrends, 10% Tech, 10% China
    house_goals = create_goals('House Purchase', [
        {'name': 'Core - Balanced', 'targetAmount': 140000, 'targetAllocation': 70, 'minReturn': 0.05, 'maxReturn': 0.12},
        {'name': 'Megatrends', 'targetAmount': 20000, 'targetAllocation': 10, 'minReturn': 0.03, 'maxReturn': 0.15},
        {'name': 'Tech', 'targetAmount': 20000, 'targetAllocation': 10, 'minReturn': -0.02, 'maxReturn': 0.20},
        {'name': 'China', 'targetAmount': 20000, 'targetAllocation': 10, 'minReturn': -0.08, 'maxReturn': 0.18}
    ], time_horizon_days=365)  # 1 year
    
    # Define Retirement bucket goals (~60k SGD, 2 year time horizon)
    # Target Allocation: 55% Core-Aggressive, 15% Megatrends, 15% Tech, 15% China
    retirement_goals = create_goals('Retirement', [
        {'name': 'Core - Aggressive', 'targetAmount': 33000, 'targetAllocation': 55, 'minReturn': 0.06, 'maxReturn': 0.14},
        {'name': 'Megatrends', 'targetAmount': 9000, 'targetAllocation': 15, 'minReturn': 0.03, 'maxReturn': 0.15},
        {'name': 'Tech', 'targetAmount': 9000, 'targetAllocation': 15, 'minReturn': -0.02, 'maxReturn': 0.20},
        {'name': 'China', 'targetAmount': 9000, 'targetAllocation': 15, 'minReturn': -0.08, 'maxReturn': 0.18}
    ], time_horizon_days=730)  # 2 years
    
    all_goals = house_goals + retirement_goals
    
    # Create API response structures matching the expected format
    performance_data = []
    investible_data = []
    summary_data = []
    performance_time_series = {}  # NEW: Per-goal time-series data
    
    for goal in all_goals:
        # Basic performance data
        performance_data.append({
            'goalId': goal['goalId'],
            'totalCumulativeReturn': {'amount': goal['totalCumulativeReturn']},
            'simpleRateOfReturnPercent': goal['simpleRateOfReturnPercent'],
            'totalInvestmentValue': {'amount': goal['endingBalance']}
        })
        
        # Investible data with target information
        # Note: totalInvestmentAmount in API is misnamed - it's actually ending balance
        investible_data.append({
            'goalId': goal['goalId'],
            'goalName': goal['goalName'],
            'investmentGoalType': goal['goalType'],
            'totalInvestmentAmount': {
                'display': {'amount': goal['endingBalance']}
            },
            'targetAmount': goal['targetAmount'],
            'targetAllocation': goal['targetAllocation']
        })
        
        # Summary data
        summary_data.append({
            'goalId': goal['goalId'],
            'goalName': goal['goalName'],
            'investmentGoalType': goal['goalType']
        })
        
        # Time-series performance data (for charts)
        # Calculate YTD return (assume start of current year)
        current_date = datetime.now()
        start_of_year = datetime(current_date.year, 1, 1)
        days_since_start_of_year = (current_date - start_of_year).days
        # Prorate the annual return to YTD
        ytd_return = goal['simpleRateOfReturnPercent'] * (days_since_start_of_year / 365)
        
        # Calculate annualised IRR (use a slightly different value for realism)
        annualised_irr = goal['simpleRateOfReturnPercent'] * 0.95  # Slightly lower than TWR for realism
        
        # Calculate fees (small percentage of investment for realism)
        access_fee = goal['cumulativeInvested'] * 0.005  # 0.5% access fee
        trailer_fee_rebate = goal['cumulativeInvested'] * 0.002  # 0.2% trailer fee rebate
        
        performance_time_series[goal['goalId']] = {
            'timeSeries': {
                'data': goal['timeSeriesData']
            },
            'returnsTable': {
                'twr': {
                    'allTimeValue': goal['simpleRateOfReturnPercent'],
                    'oneYearValue': goal['simpleRateOfReturnPercent'],
                    'sixMonthValue': goal['simpleRateOfReturnPercent'] * 0.5,
                    'threeMonthValue': goal['simpleRateOfReturnPercent'] * 0.25,
                    'oneMonthValue': goal['simpleRateOfReturnPercent'] * 0.083,
                    'ytdValue': ytd_return,
                    'threeYearValue': goal['simpleRateOfReturnPercent']  # Use same as allTime for demo
                },
                'annualisedIrr': {
                    'allTimeValue': annualised_irr
                }
            },
            'gainOrLossTable': {
                'netInvestment': {
                    'allTimeValue': goal['cumulativeInvested']
                },
                'accessFeeCharged': {
                    'allTimeValue': access_fee
                },
                'trailerFeeRebates': {
                    'allTimeValue': trailer_fee_rebate
                }
            },
            'totalCumulativeReturnPercent': goal['simpleRateOfReturnPercent'] * 100,
            'totalCumulativeReturnAmount': goal['totalCumulativeReturn'],
            'contributionDate': goal['contributionDate'],
            'annualReturnRate': goal['annualReturnRate'],
            'cumulativeInvested': goal['cumulativeInvested']
        }
    
    return {
        'performance': performance_data,
        'investible': investible_data,
        'summary': summary_data,
        'performanceTimeSeries': performance_time_series
    }

def generate_bucket_config_doc(mock_data, output_file):
    """Generate markdown documentation for bucket configuration"""
    
    # Build bucket structure from mock data
    buckets = {}
    for goal in mock_data['investible']:
        bucket = goal['goalName'].split(' - ')[0]
        if bucket not in buckets:
            buckets[bucket] = {
                'goals': [],
                'total_target': 0,
                'total_actual': 0,
                'total_returns': 0,
                'time_horizons': []
            }
        
        # Get performance data
        perf = next(p for p in mock_data['performance'] if p['goalId'] == goal['goalId'])
        perf_ts = mock_data['performanceTimeSeries'].get(goal['goalId'], {})
        
        goal_name = ' - '.join(goal['goalName'].split(' - ')[1:])
        actual = goal['totalInvestmentAmount']['display']['amount']
        returns = perf['totalCumulativeReturn']['amount']
        target_amount = goal.get('targetAmount', 0)
        target_allocation = goal.get('targetAllocation', 0)
        
        # Time-series metadata
        ts_data = perf_ts.get('timeSeries', {}).get('data', [])
        start_date = ts_data[0]['date'] if ts_data else 'N/A'
        end_date = ts_data[-1]['date'] if ts_data else 'N/A'
        contribution_date = perf_ts.get('contributionDate', 'N/A')
        num_days = len(ts_data)
        
        buckets[bucket]['goals'].append({
            'name': goal_name,
            'actual': actual,
            'returns': returns,
            'return_pct': perf['simpleRateOfReturnPercent'] * 100,
            'target_amount': target_amount,
            'target_allocation': target_allocation,
            'start_date': start_date,
            'end_date': end_date,
            'contribution_date': contribution_date,
            'num_days': num_days
        })
        buckets[bucket]['total_actual'] += actual
        buckets[bucket]['total_returns'] += returns
        buckets[bucket]['total_target'] += target_amount
        if num_days not in buckets[bucket]['time_horizons']:
            buckets[bucket]['time_horizons'].append(num_days)
    
    # Generate markdown
    with open(output_file, 'w') as f:
        f.write('# Demo Bucket Configuration\n\n')
        f.write('*Generated on: ' + __import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S') + '*\n\n')
        f.write('This document tracks the bucket and target configuration used in the demo.\n\n')
        f.write('---\n\n')
        
        for bucket_name, bucket_data in sorted(buckets.items()):
            total_actual = bucket_data['total_actual']
            total_returns = bucket_data['total_returns']
            total_target = bucket_data['total_target']
            growth_pct = (total_returns / total_actual * 100) if total_actual > 0 else 0
            time_horizon_days = bucket_data['time_horizons'][0] if bucket_data['time_horizons'] else 0
            time_horizon_years = time_horizon_days / 365
            
            f.write(f'## {bucket_name} Bucket\n\n')
            f.write(f'**Total Target Investment:** ${total_target:,.2f}\n\n')
            f.write(f'**Total Actual Investment:** ${total_actual:,.2f}\n\n')
            f.write(f'**Total Returns:** ${total_returns:,.2f} ({growth_pct:+.2f}%)\n\n')
            f.write(f'**Ending Balance:** ${total_actual + total_returns:,.2f}\n\n')
            f.write(f'**Time Horizon:** {time_horizon_years:.1f} year(s) ({time_horizon_days} days)\n\n')
            
            f.write('### Goals Breakdown\n\n')
            f.write('| Goal | Target | Actual Investment | Returns | Return % | Ending Balance |\n')
            f.write('|------|--------|-------------------|---------|----------|----------------|\n')
            
            for goal in bucket_data['goals']:
                ending = goal['actual'] + goal['returns']
                f.write(f"| {goal['name']} | ${goal['target_amount']:,.2f} | ${goal['actual']:,.2f} | ${goal['returns']:,.2f} | {goal['return_pct']:+.2f}% | ${ending:,.2f} |\n")
            
            f.write('\n### Target Allocations\n\n')
            f.write('| Goal | Target % | Actual % | Target Amount | Actual Amount | Variance |\n')
            f.write('|------|----------|----------|---------------|---------------|----------|\n')
            
            # Calculate actual allocations
            for goal in bucket_data['goals']:
                actual_pct = (goal['actual'] / total_actual * 100) if total_actual > 0 else 0
                target_pct = goal['target_allocation']
                variance_pct = actual_pct - target_pct
                
                f.write(f"| {goal['name']} | {target_pct}% | {actual_pct:.2f}% | ${goal['target_amount']:,.2f} | ${goal['actual']:,.2f} | {variance_pct:+.2f}% |\n")
            
            f.write('\n### Time-Series Performance\n\n')
            f.write('| Goal | Start Date | End Date | Contribution Date | Data Points |\n')
            f.write('|------|------------|----------|-------------------|--------------|\n')
            
            for goal in bucket_data['goals']:
                contrib_display = goal['contribution_date'] if goal['contribution_date'] != 'N/A' else 'None'
                f.write(f"| {goal['name']} | {goal['start_date']} | {goal['end_date']} | {contrib_display} | {goal['num_days']} |\n")
            
            f.write('\n---\n\n')
        
        f.write('## Usage Notes\n\n')
        f.write('- All actual investments have realistic variance from targets (-8% to +10%) for demo realism\n')
        f.write('- Returns are randomized within specified ranges per goal type\n')
        f.write('- Time-series data includes bumpy/realistic market volatility patterns\n')
        f.write('- Each goal has a 25% contribution event in the final 90 days\n')
        f.write('- House Purchase bucket spans 1 year (365 days)\n')
        f.write('- Retirement bucket spans 2 years (730 days)\n')
        f.write('- Regenerate this file whenever running `generate-mock-data.py`\n')
        f.write('- Use this configuration as reference for future demo updates\n')

def main():
    """Generate mock data and save to JSON file"""
    mock_data = generate_mock_data()
    
    # Save to file
    output_file = os.path.join(os.path.dirname(__file__), 'mock-data.json')
    with open(output_file, 'w') as f:
        json.dump(mock_data, f, indent=2)
    
    print(f"Mock data generated and saved to {output_file}")
    print(f"Generated {len(mock_data['performance'])} goals across House Purchase and Retirement buckets")
    
    # Print summary
    print("\nSummary:")
    buckets = {}
    for goal in mock_data['investible']:
        bucket = goal['goalName'].split(' - ')[0]
        if bucket not in buckets:
            buckets[bucket] = {'count': 0, 'ending_balance': 0, 'invested': 0, 'returns': 0}
        buckets[bucket]['count'] += 1
        buckets[bucket]['ending_balance'] += goal['totalInvestmentAmount']['display']['amount']
    
    # Add returns and invested amounts
    for goal in mock_data['performance']:
        goal_name = next(g['goalName'] for g in mock_data['investible'] if g['goalId'] == goal['goalId'])
        bucket = goal_name.split(' - ')[0]
        buckets[bucket]['returns'] += goal['totalCumulativeReturn']['amount']
        
        # Get invested from performance time series
        perf_ts = mock_data['performanceTimeSeries'].get(goal['goalId'], {})
        buckets[bucket]['invested'] += perf_ts.get('cumulativeInvested', 0)
    
    for bucket, data in buckets.items():
        growth_pct = (data['returns'] / data['invested'] * 100) if data['invested'] > 0 else 0
        print(f"  {bucket}: {data['count']} goals, ${data['invested']:,.2f} invested, ${data['returns']:,.2f} returns ({growth_pct:+.2f}%), ${data['ending_balance']:,.2f} ending balance")
    
    # Generate bucket configuration documentation
    config_file = os.path.join(os.path.dirname(__file__), 'BUCKET_CONFIGURATION.md')
    generate_bucket_config_doc(mock_data, config_file)
    print(f"\nBucket configuration saved to {config_file}")

if __name__ == '__main__':
    main()

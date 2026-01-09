#!/usr/bin/env python3
"""
Screenshot generator for Goal Portfolio Viewer
Uses Playwright to open the demo page and capture screenshots
"""

import json
import os
import random

def generate_mock_data():
    """Generate mock API data for Personal and Holiday buckets"""
    
    def create_goals(bucket_name, goal_types):
        """Create goals for a bucket"""
        goals = []
        for i, goal_type in enumerate(goal_types, 1):
            base_amount = goal_type['baseAmount']
            # Add random variation
            investment = round(base_amount * (0.85 + random.random() * 0.30), 2)
            
            # Generate return
            min_return = goal_type.get('minReturn', -0.05)
            max_return = goal_type.get('maxReturn', 0.15)
            return_rate = min_return + random.random() * (max_return - min_return)
            returns = round(investment * return_rate, 2)
            simple_rate = returns / investment if investment != 0 else 0
            
            goal_id = f"mock-goal-{bucket_name.lower()}-{i}"
            goals.append({
                'goalId': goal_id,
                'goalName': f"{bucket_name} - {goal_type['name']}",
                'goalBucket': bucket_name,
                'goalType': 'GENERAL_WEALTH_ACCUMULATION',
                'totalInvestmentAmount': investment,
                'totalCumulativeReturn': returns,
                'simpleRateOfReturnPercent': simple_rate
            })
        
        return goals
    
    # Define Personal bucket goals (larger investments - core-satellite)
    personal_goals = create_goals('Personal', [
        {'name': 'Core', 'baseAmount': 50000, 'minReturn': 0.05, 'maxReturn': 0.12},
        {'name': 'Tech', 'baseAmount': 15000, 'minReturn': -0.02, 'maxReturn': 0.20},
        {'name': 'China', 'baseAmount': 12000, 'minReturn': -0.08, 'maxReturn': 0.18},
        {'name': 'Megatrends', 'baseAmount': 10000, 'minReturn': 0.03, 'maxReturn': 0.15},
        {'name': 'Real Estate', 'baseAmount': 8000, 'minReturn': 0.02, 'maxReturn': 0.10}
    ])
    
    # Define Holiday bucket goals (smaller investments - core-satellite)
    holiday_goals = create_goals('Holiday', [
        {'name': 'Core', 'baseAmount': 20000, 'minReturn': 0.04, 'maxReturn': 0.10},
        {'name': 'Tech', 'baseAmount': 5000, 'minReturn': -0.03, 'maxReturn': 0.18},
        {'name': 'China', 'baseAmount': 4000, 'minReturn': -0.10, 'maxReturn': 0.15},
        {'name': 'Megatrends', 'baseAmount': 3000, 'minReturn': 0.02, 'maxReturn': 0.12},
        {'name': 'Real Estate', 'baseAmount': 3000, 'minReturn': 0.01, 'maxReturn': 0.08}
    ])
    
    all_goals = personal_goals + holiday_goals
    
    # Create API response structures matching the expected format
    performance_data = []
    investible_data = []
    summary_data = []
    
    for goal in all_goals:
        performance_data.append({
            'goalId': goal['goalId'],
            'totalCumulativeReturn': {'amount': goal['totalCumulativeReturn']},
            'simpleRateOfReturnPercent': goal['simpleRateOfReturnPercent']
        })
        
        investible_data.append({
            'goalId': goal['goalId'],
            'goalName': goal['goalName'],
            'investmentGoalType': goal['goalType'],
            'totalInvestmentAmount': {
                'display': {'amount': goal['totalInvestmentAmount']}
            }
        })
        
        summary_data.append({
            'goalId': goal['goalId'],
            'goalName': goal['goalName'],
            'investmentGoalType': goal['goalType']
        })
    
    return {
        'performance': performance_data,
        'investible': investible_data,
        'summary': summary_data
    }

def main():
    """Generate mock data and save to JSON file"""
    mock_data = generate_mock_data()
    
    # Save to file
    output_file = os.path.join(os.path.dirname(__file__), 'mock-data.json')
    with open(output_file, 'w') as f:
        json.dump(mock_data, f, indent=2)
    
    print(f"Mock data generated and saved to {output_file}")
    print(f"Generated {len(mock_data['performance'])} goals across Personal and Holiday buckets")
    
    # Print summary
    print("\nSummary:")
    buckets = {}
    for goal in mock_data['investible']:
        bucket = goal['goalName'].split(' - ')[0]
        if bucket not in buckets:
            buckets[bucket] = {'count': 0, 'total': 0}
        buckets[bucket]['count'] += 1
        buckets[bucket]['total'] += goal['totalInvestmentAmount']['display']['amount']
    
    for bucket, data in buckets.items():
        print(f"  {bucket}: {data['count']} goals, ${data['total']:,.2f} total investment")

if __name__ == '__main__':
    main()

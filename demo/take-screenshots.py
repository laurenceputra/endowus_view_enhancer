#!/usr/bin/env python3
"""
Take screenshots of the Goal Portfolio Viewer demo

This script prepares the demo environment and provides instructions for taking screenshots.
For automated screenshots, use the companion take-screenshots-automated.sh script.
"""

import os
import sys
import subprocess

def prepare_demo():
    """Prepare demo files"""
    demo_dir = os.path.dirname(os.path.abspath(__file__))
    prepare_script = os.path.join(demo_dir, 'prepare-demo.sh')
    
    if os.path.exists(prepare_script):
        print("Preparing demo files...")
        try:
            subprocess.run(['bash', prepare_script], check=True)
        except subprocess.CalledProcessError as e:
            print(f"Warning: Failed to prepare demo files: {e}")
            return False
    return True

def main():
    """Main entry point"""
    # Get paths
    demo_dir = os.path.dirname(os.path.abspath(__file__))
    assets_dir = os.path.join(os.path.dirname(demo_dir), 'assets')
    
    # Ensure assets directory exists
    os.makedirs(assets_dir, exist_ok=True)
    
    # Prepare demo
    prepare_demo()
    
    # Path to the demo HTML file
    demo_html_path = os.path.join(demo_dir, 'demo-clean.html')
    demo_url = f'file://{demo_html_path}'
    
    print("\n" + "="*70)
    print("GOAL PORTFOLIO VIEWER - DEMO SCREENSHOT GUIDE")
    print("="*70)
    print(f"\nDemo page: {demo_url}")
    print(f"Screenshots will be saved to: {assets_dir}")
    
    print("\n" + "-"*70)
    print("AUTOMATED SCREENSHOT INSTRUCTIONS")
    print("-"*70)
    print("\nFor automated screenshots using Playwright, run:")
    print("  bash demo/take-screenshots-automated.sh")
    print("\nThis will capture:")
    print("  1. Summary view (all buckets)")
    print("  2. House Purchase bucket detail view (with scrolling)")
    print("  3. Retirement bucket detail view (with scrolling)")
    
    print("\n" + "-"*70)
    print("MANUAL SCREENSHOT INSTRUCTIONS")
    print("-"*70)
    print("\n1. Start a local web server:")
    print("   cd demo")
    print("   python3 -m http.server 8080")
    print("\n2. Open in browser:")
    print("   http://localhost:8080/demo-clean.html")
    print("\n3. Wait for page to load and click '📊 Portfolio Viewer' button")
    print("\n4. Take screenshots:")
    print("\n   a) Summary View:")
    print(f"      - Take screenshot of default view")
    print(f"      - Save as: {os.path.join(assets_dir, 'screenshot-summary.png')}")
    print("\n   b) House Purchase Detail View:")
    print(f"      - Select 'House Purchase' from dropdown")
    print(f"      - Take screenshot of top section (performance graph)")
    print(f"      - Scroll down to show goals table")
    print(f"      - Take another screenshot showing goals table")
    print(f"      - Save as: {os.path.join(assets_dir, 'screenshot-house-purchase-detail.png')}")
    print("\n   c) Retirement Detail View:")
    print(f"      - Select 'Retirement' from dropdown")
    print(f"      - Take screenshot of top section (performance graph)")
    print(f"      - Scroll down to show goals table")
    print(f"      - Take another screenshot showing goals table")
    print(f"      - Save as: {os.path.join(assets_dir, 'screenshot-retirement-detail.png')}")
    
    print("\n" + "="*70)
    print("\nIMPORTANT: Make sure to scroll and capture the goals table!")
    print("The goals table is below the performance graph and contains")
    print("individual goal breakdowns with investment amounts and returns.")
    print("="*70 + "\n")

if __name__ == '__main__':
    main()

#!/bin/bash
# Automated screenshot capture for Goal Portfolio Viewer demo
# This script uses a simple HTTP server and can be extended with Playwright

set -e

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="$(dirname "$DEMO_DIR")/assets"
DEMO_URL="http://localhost:8765/dashboard/"

echo "Goal Portfolio Viewer - Automated Screenshot Capture"
echo "===================================================="
echo ""
echo "Demo URL: $DEMO_URL"
echo "Assets directory: $ASSETS_DIR"
echo ""

# Ensure assets directory exists
mkdir -p "$ASSETS_DIR"

echo "Start the demo server with: node demo/mock-server.js"
echo ""

echo "Note: For automated screenshots using Playwright:"
echo "  1. Install Playwright: pnpm install"
echo "  2. Install browser: npx playwright install chromium"
echo "  3. Run: node demo/take-screenshots.js"
echo ""
echo "For manual screenshots, run: python3 demo/take-screenshots.py"
echo ""

exit 0

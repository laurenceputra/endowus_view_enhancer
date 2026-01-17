#!/bin/bash
# Automated screenshot capture for Goal Portfolio Viewer demo
# This script uses a simple HTTP server and can be extended with Playwright

set -e

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="$(dirname "$DEMO_DIR")/assets"
DEMO_URL="file://$DEMO_DIR/demo-clean.html"

echo "Goal Portfolio Viewer - Automated Screenshot Capture"
echo "===================================================="
echo ""
echo "Demo URL: $DEMO_URL"
echo "Assets directory: $ASSETS_DIR"
echo ""

# Ensure assets directory exists
mkdir -p "$ASSETS_DIR"

# Prepare demo files
if [ -f "$DEMO_DIR/prepare-demo.sh" ]; then
    echo "Preparing demo files..."
    bash "$DEMO_DIR/prepare-demo.sh"
    echo ""
fi

echo "Note: This script requires Playwright to be installed."
echo "For now, please use the manual screenshot instructions from:"
echo "  python3 take-screenshots.py"
echo ""
echo "Or use the Playwright browser MCP tool for automation."
echo ""

# Future: Add Playwright automation here when available in the environment
# Example:
# playwright codegen "$DEMO_URL"
# Or use node with playwright:
# node take-screenshots.js

exit 0

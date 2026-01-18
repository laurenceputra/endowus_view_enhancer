#!/bin/bash
# Prepare demo files for local testing

set -e

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USERSCRIPT_SRC="$DEMO_DIR/../tampermonkey/goal_portfolio_viewer.user.js"
USERSCRIPT_COPY="$DEMO_DIR/goal_portfolio_viewer.user.js"
USERSCRIPT_DEMO="$DEMO_DIR/goal_portfolio_viewer_demo.user.js"

echo "Preparing demo files..."

# Copy the main userscript
if [ ! -f "$USERSCRIPT_SRC" ]; then
    echo "Error: Source userscript not found at $USERSCRIPT_SRC"
    exit 1
fi

cp "$USERSCRIPT_SRC" "$USERSCRIPT_COPY"
echo "✓ Copied userscript to demo directory"

# Create demo version with shouldShowButton patched
cat "$USERSCRIPT_SRC" | sed 's/function shouldShowButton() {/function shouldShowButton() { if (window.__GPV_DEMO_MODE__) return true;/' > "$USERSCRIPT_DEMO"
echo "✓ Created demo version with demo mode enabled"

echo ""
echo "Demo files prepared successfully!"
echo "You can now open demo-clean.html in a web server"

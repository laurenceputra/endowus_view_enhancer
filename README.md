# Endowus Portfolio Viewer

**The Endowus overlay for Singapore investors who want clear, private, goal-based reporting without spreadsheets or generic trackers.**

![Endowus Portfolio Viewer Screenshot](assets/endowus_view_enhancer_screenshot.png)

---

## Achieve More with Core-Satellite Strategy

If you use Endowus for retirement, education, or emergency savings, this overlay keeps your core-satellite goals organized.  
Group each goal, track total returns, and see exactly how each part of the plan performs—right on the Endowus page.

---

## See Your Asset Allocation at a Glance

See how your goals map across portfolio buckets and investment types.  
Use the view to spot imbalances, then calculate where new investment capital should go.

---

## In-Browser Calculations for Better Planning

All calculations and portfolio breakdowns happen locally in your browser.  
The overlay adds instant summaries and details so you can plan next steps without exports or spreadsheets.

---

## Your Privacy Stays Intact

- Local-only processing: your data never leaves your browser.
- No downloads, uploads, or external servers—fully private.
- Open source and transparent.

---

## Ready to Get Started?

**You'll need Tampermonkey, a free browser extension that runs user scripts on sites like Endowus.**  
Tampermonkey works with Chrome, Firefox, Edge, and most desktop browsers.

1. Install <a href="https://www.tampermonkey.net/">Tampermonkey</a> from your browser's extension/add-on store.
2. Make sure Tampermonkey is enabled and "Allow user scripts" is turned on in its dashboard.
3. Add the script using this link:  
   <a href="https://raw.githubusercontent.com/laurenceputra/endowus_view_enhancer/main/tampermonkey/endowus_portfolio_viewer.user.js">Endowus Portfolio Viewer Script</a>  
   Tampermonkey prompts you—click "Install".
4. Log into <a href="https://app.sg.endowus.com/">Endowus</a>.  
   If the 📊 Portfolio Viewer button doesn't show, refresh and check that Tampermonkey and the script are enabled.

---

## Naming Tips for Maximum Clarity

To make bucket grouping work, name your goals like this:
```
Retirement - CPF Core
Retirement - Satellite Growth
Education - Child Fund
Emergency - SRS Reserve
```
Goals with matching starting words are grouped, so your buckets reflect your strategy.

---

## Made for Singapore Endowus Users

- Built for Singapore Endowus users managing CPF, SRS, cash, and multi-goal accounts
- Positioned for core-satellite investing, not generic portfolio tracking
- Your investment data always stays with you

---

## Development and Testing

### For Contributors

This project keeps all logic in ONE place while enabling comprehensive testing. The userscript conditionally exports functions for testing without affecting browser execution.

#### Project Structure

```
endowus_view_enhancer/
├── tampermonkey/
│   └── endowus_portfolio_viewer.user.js  # All logic + conditional exports
├── __tests__/
│   └── utils.test.js                      # Unit tests (imports from userscript)
└── .github/
    └── workflows/
        └── ci.yml                          # GitHub Actions CI
```

**Key Pattern**: The userscript contains all logic functions inline. At the bottom, it conditionally exports them when running in Node.js (`if (typeof module !== 'undefined')`), allowing tests to import the REAL implementation. No code duplication anywhere.

#### Running Tests Locally

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

#### Continuous Integration

Tests run automatically on every pull request and push to main via GitHub Actions. The CI workflow tests on both Node.js 18.x and 20.x.

#### Adding New Tests

When adding new pure functions to the userscript:

1. Add the function in `tampermonkey/endowus_portfolio_viewer.user.js` (before the browser-only section)
2. Add it to the conditional exports at the bottom of the userscript
3. Write comprehensive tests in `__tests__/utils.test.js`
4. Ensure tests cover edge cases and error conditions

**No duplication needed!** Tests import directly from the userscript.

---

**Give it a try and keep your Endowus goals simple, visible, and private.**

For feedback or help, <a href="https://github.com/laurenceputra/endowus_view_enhancer/issues">open an issue</a>.

MIT License

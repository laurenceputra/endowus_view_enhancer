# Endowus Portfolio Viewer

**Visualize your Endowus investments by custom buckets for better portfolio organization**

## The Problem

Managing multiple financial goals on Endowus can be overwhelming when you have different investment strategies across various life objectives. Whether you're saving for retirement, your children's education, or an emergency fund, tracking performance across these different "buckets" requires manually calculating totals and returns.

## The Solution

Endowus Portfolio Viewer automatically organizes your portfolio into custom buckets, providing instant insights into:
- Total investment amounts per bucket
- Cumulative returns and growth percentages
- Detailed breakdowns by goal type (Investment, Cash, etc.)
- Individual goal performance within each bucket

Perfect for investors using strategies like Core + Satellite across multiple life goals.

## Key Features

- 🎯 **Smart Bucket Organization** - Automatically groups goals by naming convention
- 📊 **Real-time Analytics** - View total investments, returns, and growth percentages at a glance
- 🎨 **Modern Interface** - Beautiful, gradient-based UI with smooth animations
- 🌐 **Cross-Browser Support** - Works in any browser supported by Tampermonkey
- 🔒 **Private & Secure** - All processing happens locally in your browser
- ⚡ **Easy Installation** - One-click install via Tampermonkey

## Installation

### Step 1: Install Tampermonkey

First, install the Tampermonkey browser extension from [https://www.tampermonkey.net/](https://www.tampermonkey.net/)

*Alternative: You can also use [Violentmonkey](https://violentmonkey.github.io/)*

### Step 2: Install the Script

**Option A - One-Click Install (Recommended)**

Click here to install: [Install Endowus Portfolio Viewer](https://raw.githubusercontent.com/laurenceputra/endowus_view_enhancer/main/tampermonkey/endowus_portfolio_viewer.user.js)

Tampermonkey will open automatically and ask you to confirm the installation. Click "Install" to proceed.

**Option B - Manual Installation**

1. Open the Tampermonkey dashboard (click the Tampermonkey icon → Dashboard)
2. Click "Create a new script" (the + icon)
3. Copy the contents of [`endowus_portfolio_viewer.user.js`](https://github.com/laurenceputra/endowus_view_enhancer/blob/main/tampermonkey/endowus_portfolio_viewer.user.js)
4. Paste into the editor
5. Save (Ctrl+S or Cmd+S)

### Step 3: Verify Installation

1. Navigate to [https://app.sg.endowus.com/](https://app.sg.endowus.com/)
2. Log in to your account
3. Look for the "📊 Portfolio Viewer" button in the bottom-right corner

If you see the button, you're all set! 🎉

## Getting Started

### Organize Your Goals

For the best experience, name your Endowus goals using this format:

```
<Bucket Name> - <Goal Description>
```

**Examples:**
- `Retirement - Core Portfolio`
- `Retirement - Satellite Growth`
- `Education - Child University Fund`
- `Emergency - 6 Month Reserve`

The script automatically groups all goals that start with the same bucket name.

### View Your Portfolio

1. **Log into Endowus** at [https://app.sg.endowus.com/](https://app.sg.endowus.com/)
2. **Wait for the page to load** - The script automatically captures data in the background
3. **Click "📊 Portfolio Viewer"** - The button appears in the bottom-right corner
4. **Explore your data**:
   - **Summary View**: See all buckets at a glance with totals and returns
   - **Detail View**: Select a specific bucket to see individual goal breakdowns

### What You'll See

For each bucket and goal, the viewer displays:
- **Total Investment** - Your total invested capital
- **Cumulative Return** - Total profit or loss (color-coded: green for gains, red for losses)
- **Growth %** - Percentage return on investment
- **Goal Breakdown** - Individual goals with specific metrics
- **% of Goal Type** - What percentage each goal represents

## Troubleshooting

**Button not appearing?**
- Ensure Tampermonkey is enabled
- Check that the script is enabled in the Tampermonkey dashboard
- Refresh the Endowus page

**No data showing?**
- Wait for the Endowus page to fully load
- Navigate through your portfolio to trigger API calls
- Verify your goals follow the naming convention (`Bucket - Goal Name`)

**Other issues?**
- Check the browser console for errors (press F12)
- Try clearing your browser cache
- Disable other extensions that might conflict

## Technical Documentation

For developers and contributors:
- **[TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md)** - Architecture, API interception, data processing, and advanced development guide

## Privacy & Security

- ✅ All data processing happens locally in your browser
- ✅ No data is sent to external servers
- ✅ The script only reads API responses, doesn't modify requests
- ✅ No access to login credentials
- ✅ Fully open source and auditable

## Updates

The script automatically checks for updates. When a new version is available:
1. Tampermonkey will notify you
2. Click "Update" to install the latest version
3. Refresh the Endowus page

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes and test thoroughly
4. Submit a pull request

For technical details, see [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md).

## Support

Having issues or suggestions?
1. Check the Troubleshooting section above
2. Review the [Technical Design](TECHNICAL_DESIGN.md) for advanced topics
3. [Open an issue](https://github.com/laurenceputra/endowus_view_enhancer/issues) on GitHub with:
   - Browser name and version
   - Tampermonkey version
   - Description of the problem
   - Any error messages from the console

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
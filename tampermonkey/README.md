# Endowus Portfolio Viewer - Tampermonkey Script

A modern Tampermonkey userscript that provides an enhanced portfolio viewing experience for Endowus users. This script allows you to organize and visualize your Endowus portfolio by custom buckets with a beautiful, modern interface.

## Features

### 🎯 Core Functionality
- **Portfolio Bucket Organization**: Group your Endowus goals by buckets (e.g., "Retirement", "Education", "Emergency")
- **Real-time Data Interception**: Automatically captures portfolio data using monkey patching techniques
- **Comprehensive Analytics**: View total investments, cumulative returns, and growth percentages
- **Multi-level Views**: Toggle between summary view and detailed bucket views

### 🎨 Modern UX Design
- **Beautiful Gradient UI**: Modern purple gradient theme with smooth animations
- **Responsive Design**: Adapts to different screen sizes
- **Interactive Elements**: Hover effects, smooth transitions, and intuitive controls
- **Clean Typography**: Uses system fonts for optimal readability
- **Color-coded Returns**: Positive returns in green, negative in red for quick insights

### 🔧 Technical Features
- **API Interception**: Monkey patches both `fetch` and `XMLHttpRequest` to capture API responses
- **Non-blocking**: Runs seamlessly alongside Endowus's native functionality
- **Efficient Data Processing**: Merges data from multiple API endpoints intelligently
- **Auto-updates**: Configured to check for script updates automatically

## Installation

### Prerequisites
- A userscript manager extension installed in your browser:
  - [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Safari, Edge, Opera)
  - [Violentmonkey](https://violentmonkey.github.io/) (Chrome, Firefox, Edge)
  - [Greasemonkey](https://www.greasespot.net/) (Firefox only)

### Installation Steps

1. **Install a Userscript Manager**
   - Install Tampermonkey (recommended) from your browser's extension store
   
2. **Install the Script**
   - Option A: Click [here](https://raw.githubusercontent.com/laurenceputra/endowus_view_enhancer/main/tampermonkey/endowus_portfolio_viewer.user.js) to install directly
   - Option B: 
     1. Open Tampermonkey dashboard
     2. Click "Create a new script"
     3. Copy the contents of `endowus_portfolio_viewer.user.js`
     4. Paste into the editor
     5. Save (Ctrl+S or Cmd+S)

3. **Verify Installation**
   - Navigate to [https://app.sg.endowus.com/](https://app.sg.endowus.com/)
   - You should see a "📊 Portfolio Viewer" button in the top-right corner

## Usage

### Basic Usage

1. **Log into Endowus**: Navigate to your Endowus portfolio at https://app.sg.endowus.com/
2. **Wait for Data**: Allow the page to fully load (the script will automatically intercept API calls)
3. **Open Portfolio Viewer**: Click the "📊 Portfolio Viewer" button in the top-right corner
4. **Explore Your Portfolio**: 
   - View the summary to see all buckets at a glance
   - Select individual buckets from the dropdown to see detailed breakdowns

### Goal Naming Convention

To use the bucket feature, name your Endowus goals following this format:

```
<Bucket Name> - <Goal Description>
```

**Examples:**
- `Retirement - Core Portfolio`
- `Retirement - Satellite Growth`
- `Education - Child University Fund`
- `Emergency - 6 Month Reserve`

The script will automatically group all goals starting with the same bucket name.

### Understanding the Views

#### Summary View
- Shows all buckets with their totals, returns, and growth percentages
- Displays breakdown by goal type (Investment, Cash, etc.) within each bucket
- Perfect for a quick overview of your entire portfolio

#### Bucket Detail View
- Select a specific bucket from the dropdown
- See detailed information about each goal within that bucket
- View individual goal performance metrics
- Compare goals within the same bucket

### Data Displayed

For each bucket/goal, you'll see:
- **Total Investment Amount**: Your total invested capital
- **Cumulative Return**: Total profit or loss
- **Growth %**: Percentage return on investment
- **Goal Breakdown**: Individual goals with their specific metrics
- **% of Goal Type**: What percentage each goal represents within its type

## How It Works

### API Interception

The script uses monkey patching to intercept API responses from Endowus:

1. **Fetch API Patching**: Wraps the native `fetch` function to capture responses
2. **XMLHttpRequest Patching**: Intercepts XHR requests for compatibility
3. **Data Capture**: Automatically stores data from three key endpoints:
   - `/v1/goals/performance` - Performance metrics
   - `/v2/goals/investible` - Investment details
   - `/v1/goals` - Goal summaries

### Data Processing

1. **Merging**: Combines data from all three endpoints based on goal IDs
2. **Bucket Extraction**: Parses goal names to determine bucket grouping
3. **Aggregation**: Calculates totals, returns, and percentages for each bucket
4. **Rendering**: Displays data in an organized, visually appealing format

### Modern UI Components

- **Gradient Headers**: Eye-catching purple gradients for visual hierarchy
- **Card-based Layout**: Clean cards for bucket information
- **Interactive Tables**: Sortable, hoverable table rows
- **Smooth Animations**: Fade-in effects and smooth transitions
- **Responsive Controls**: Dropdown selector for easy navigation

## Comparison with Firefox Addon

### Advantages of Tampermonkey Version

✅ **Cross-browser Support**: Works on Chrome, Firefox, Edge, Safari, Opera  
✅ **Modern UI**: Completely redesigned interface with contemporary styling  
✅ **Easy Installation**: No need to enable developer mode or load extensions  
✅ **Auto-updates**: Automatically checks for script updates  
✅ **Portable**: Easy to share and install via URL  

### Key Differences

| Feature | Firefox Addon | Tampermonkey Script |
|---------|--------------|---------------------|
| Browser Support | Firefox only | All major browsers |
| Installation | Manual addon loading | One-click install |
| UI Design | Basic styling | Modern gradient design |
| Updates | Manual | Automatic |
| Interception Method | WebRequest API | Monkey Patching |

### Feature Parity

Both versions provide identical core functionality:
- ✅ API data interception
- ✅ Portfolio bucket organization
- ✅ Summary and detail views
- ✅ Return calculations and percentages
- ✅ Goal type categorization

## Troubleshooting

### Button Not Appearing
- Ensure Tampermonkey is enabled
- Check that the script is enabled in Tampermonkey dashboard
- Refresh the Endowus page
- Check browser console for errors (F12)

### No Data / Alert Message
- Wait for the Endowus page to fully load
- Navigate through your portfolio sections to trigger API calls
- Check that you're logged into Endowus
- Verify that your goals follow the naming convention

### Styling Issues
- Clear browser cache
- Disable other extensions that might conflict
- Try a different browser

### Script Not Running
- Verify script is installed correctly in Tampermonkey
- Check that the match pattern includes the Endowus URL
- Ensure Tampermonkey has permissions for the Endowus domain

## Development

### File Structure
```
tampermonkey/
├── endowus_portfolio_viewer.user.js  # Main script file
└── README.md                          # This file
```

### Modifying the Script

To modify the script for your needs:

1. Open Tampermonkey dashboard
2. Click on the script name to edit
3. Make your changes
4. Save (Ctrl+S or Cmd+S)
5. Refresh the Endowus page to see changes

### Key Functions

- `mergeAPIResponses()`: Processes and merges API data
- `renderSummaryView()`: Renders the summary view
- `renderBucketView()`: Renders detailed bucket view
- `injectStyles()`: Adds modern CSS styling
- `showOverlay()`: Creates and displays the modal

## Privacy & Security

- **Local Processing**: All data processing happens in your browser
- **No External Calls**: The script doesn't send data to any external servers
- **Read-only**: Script only reads API responses, doesn't modify requests
- **No Credentials**: Script doesn't access or store login credentials
- **Open Source**: Source code is fully transparent and auditable

## Updates

The script is configured with auto-update URLs. When a new version is released:
1. Tampermonkey will detect it automatically
2. You'll be prompted to update
3. Click "Update" to install the latest version

Alternatively, check for updates manually:
1. Open Tampermonkey dashboard
2. Click "Last updated" column
3. Click "Check for updates"

## License

This project is licensed under the MIT License - see the LICENSE file in the repository for details.

## Support

If you encounter issues or have suggestions:
1. Check the Troubleshooting section above
2. Review existing issues on GitHub
3. Open a new issue with detailed information about your problem

## Contributing

Contributions are welcome! To contribute:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Changelog

### Version 2.0.0
- Initial Tampermonkey release
- Complete rewrite from Firefox addon
- Modern UI with gradient design
- Cross-browser compatibility via monkey patching
- Enhanced animations and transitions
- Improved data visualization
- Auto-update functionality

## Acknowledgments

- Based on the original Firefox addon for Endowus portfolio viewing
- Inspired by modern web design principles
- Built for the Endowus user community

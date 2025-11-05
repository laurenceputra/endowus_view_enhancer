# Quick Installation Guide

## One-Click Install (Recommended)

1. **Install Tampermonkey** (if you haven't already)
   - [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
   - [Safari App Store](https://apps.apple.com/us/app/tampermonkey/id1482490089)

2. **Click to Install Script**
   
   Click this link to install: [Install Endowus Portfolio Viewer](https://raw.githubusercontent.com/laurenceputra/endowus_view_enhancer/main/tampermonkey/endowus_portfolio_viewer.user.js)
   
   Tampermonkey will open and ask you to confirm the installation.

3. **Verify Installation**
   - Navigate to [https://app.sg.endowus.com/](https://app.sg.endowus.com/)
   - Log in to your account
   - You should see a "📊 Portfolio Viewer" button in the top-right corner

## Manual Installation

If the one-click install doesn't work:

1. **Copy the Script**
   - Go to the [script file](https://github.com/laurenceputra/endowus_view_enhancer/blob/main/tampermonkey/endowus_portfolio_viewer.user.js)
   - Click "Raw" button
   - Copy all the code (Ctrl+A, Ctrl+C)

2. **Create New Script in Tampermonkey**
   - Click the Tampermonkey icon in your browser
   - Select "Create a new script..."
   - Delete the default template
   - Paste the copied code
   - Save (Ctrl+S or Cmd+S)

3. **Enable the Script**
   - Make sure the script is enabled in Tampermonkey dashboard
   - The toggle should be green/on

## Usage

1. **Navigate to Endowus**
   - Go to [https://app.sg.endowus.com/](https://app.sg.endowus.com/)
   - Log in to your account

2. **Wait for Data to Load**
   - Let the Endowus page fully load
   - The script will automatically intercept API calls
   - This happens in the background

3. **Open Portfolio Viewer**
   - Click the "📊 Portfolio Viewer" button in the top-right
   - The modern interface will open as a modal overlay

4. **Organize Your Goals**
   - For best results, name your Endowus goals in this format:
     ```
     BucketName - Goal Description
     ```
   - Example: `Retirement - Core Portfolio`
   - Example: `Education - University Fund`
   - The script will automatically group by the first word (bucket name)

## Troubleshooting

### Button Not Appearing
- Refresh the page
- Check Tampermonkey is enabled
- Verify the script is enabled in Tampermonkey dashboard
- Check browser console for errors (F12)

### No Data / "Please wait" Message
- Wait for the page to fully load
- Navigate around your portfolio to trigger API calls
- Ensure you're logged into Endowus
- Check that your goals follow the naming convention

### Script Not Working After Update
- Clear browser cache
- Disable and re-enable the script
- Reinstall the script if needed

## Updates

The script is configured to check for updates automatically. When a new version is available:

1. Tampermonkey will notify you
2. Click "Update" to install the latest version
3. Refresh the Endowus page

To manually check for updates:
1. Open Tampermonkey dashboard
2. Click on "Last updated" column
3. Click "Check for updates"

## Support

For issues or questions:
- Check the [README](README.md) for detailed information
- Review [Feature Comparison](FEATURE_COMPARISON.md) for capabilities
- Open an issue on GitHub with:
  - Browser name and version
  - Tampermonkey version
  - Description of the problem
  - Any error messages from console

## Security & Privacy

- ✅ All processing happens locally in your browser
- ✅ No data is sent to external servers
- ✅ Script only reads API responses, doesn't modify requests
- ✅ No access to login credentials
- ✅ Open source - code is fully transparent

## Next Steps

After installation:
- Read the [full README](README.md) for all features
- Check [Feature Comparison](FEATURE_COMPARISON.md) to see what's new
- Organize your goals with proper bucket naming
- Explore both Summary and Detail views

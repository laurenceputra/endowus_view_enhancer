# endowus_portfolio_viewer

This is a Firefox extension to allow users to have another approach to visualise their Endowus Portfolios, especially if they have multiple goals across multiple buckets.

## Project Structure

```
endowus_portfolio_viewer
├── src
│   ├── background.js      # Background script for the add-on
│   ├── content.js        # Content script that interacts with web pages
│   └── manifest.json     # Configuration file for the add-on
└── README.md             # Documentation for the project
```

## Installation

1. Clone the repository or download the source code.
2. Open Firefox and navigate to `about:debugging`.
3. Click on "This Firefox" in the sidebar.
4. Click on "Load Temporary Add-on".
5. Select the `manifest.json` file located in the `src` directory.

## Usage

A Firefox extension to allow users to group their Endowus portfolio by specific buckets and view the total value of each bucket. For example, users could potentially group their portfolio into kid's education bucket, with a core + satellite strategy, while at the same time having their own separate retirement bucket with a different core + satellite strategy. This extension will allow users to view their portfolio in a more organized manner.

The Endowus Goals should be named in the following format - `<Bucket> - <Goal Name>`. 

## Development

- To modify the background script, edit `src/background.js`.
- To modify the content script, edit `src/content.js`.
- Update the `src/manifest.json` file for any changes in permissions or add-on details.

## License

This project is licensed under the MIT License.
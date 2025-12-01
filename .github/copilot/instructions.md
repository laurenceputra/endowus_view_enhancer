# GitHub Copilot Instructions for Endowus Portfolio Viewer

## Project Overview

Endowus Portfolio Viewer is a Tampermonkey userscript that enhances the Endowus investment platform by providing custom portfolio visualization and organization by "buckets". The script intercepts API calls using monkey patching, processes investment data client-side, and displays a modern UI overlay.

## Key Technologies

- **Runtime**: Browser (Tampermonkey/Greasemonkey)
- **Language**: Vanilla JavaScript (ES6+)
- **Architecture**: Single-file userscript with API interception
- **Styling**: Inline CSS with gradient design system
- **Data Flow**: Intercept → Process → Visualize

## Code Style Guidelines

### JavaScript

- Use ES6+ features (arrow functions, destructuring, template literals)
- Prefer `const` over `let`, avoid `var`
- Use descriptive variable names (e.g., `mergedInvestmentData`, not `data`)
- Add comments for complex logic, especially data transformations
- 2-space indentation
- Single quotes for strings

### Naming Conventions

- **Functions**: camelCase, descriptive verbs (e.g., `extractBucket`, `renderSummaryView`)
- **Constants**: UPPER_SNAKE_CASE for configuration (e.g., `API_ENDPOINTS`)
- **Variables**: camelCase (e.g., `apiData`, `bucketName`)
- **CSS Classes**: kebab-case with prefix (e.g., `portfolio-viewer-button`)

### Security Best Practices

- **Never** use `eval()` or `Function()` constructor
- Sanitize all user-generated content before rendering
- Use `textContent` instead of `innerHTML` for user data
- Process all data locally - no external API calls
- Don't log sensitive financial data to console in production

### API Interception

- Always clone responses before reading them
- Handle JSON parsing errors gracefully
- Check URL patterns carefully to avoid false matches
- Store original functions before monkey patching
- Use both Fetch and XMLHttpRequest interception for compatibility

### Data Processing

- Validate data existence before processing
- Use reduce for aggregations
- Format money consistently with `toLocaleString`
- Color-code returns: green for positive, red for negative
- Group data hierarchically: Bucket → Goal Type → Individual Goals

### UI/UX Guidelines

- Use the gradient design system: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Add smooth transitions (300ms) for interactive elements
- Ensure mobile responsiveness (though primarily desktop-focused)
- Provide loading states and error messages
- Use backdrop blur for modal overlays
- Animate entries with `fadeIn` and `slideUp` keyframes

### Performance Considerations

- Minimize DOM manipulations - batch HTML generation
- Use event delegation where possible
- Debounce expensive operations
- Avoid unnecessary re-renders
- Cache processed data when appropriate

## Important Architecture Notes

### Data Flow

1. **Interception**: Monkey patch `fetch()` and `XMLHttpRequest` to capture API responses
2. **Storage**: Store three data sources: performance, investible, summary
3. **Merging**: Combine data by goal ID to create complete goal objects
4. **Bucketing**: Extract bucket names from goal titles (format: "Bucket - Goal Name")
5. **Aggregation**: Calculate totals, returns, and percentages at bucket and goal-type levels
6. **Rendering**: Generate HTML dynamically based on selected view (Summary or Detail)

### Critical Endpoints

- `/v1/goals/performance` - Returns cumulative returns and growth percentages
- `/v2/goals/investible` - Returns investment amounts and goal types
- `/v1/goals` - Returns goal names and metadata

### Bucket Naming Convention

Goals must follow the format: `<Bucket Name> - <Goal Description>`

Example: `"Retirement - Core Portfolio"` → Bucket: `"Retirement"`

### View Modes

- **Summary View**: Shows all buckets with aggregated totals
- **Detail View**: Shows individual goals within a selected bucket, grouped by goal type

## Testing Guidance

- Test with real Endowus data when possible
- Create mock data for edge cases (empty data, single goal, negative returns)
- Verify calculations manually for accuracy
- Check cross-browser compatibility (Chrome, Firefox, Edge)
- Test with different goal naming patterns
- Ensure data privacy - no data leaves the browser

## Common Tasks

### Adding a New Calculated Field

1. Add calculation in data processing section
2. Update merge logic to include the field
3. Update rendering functions to display the field
4. Add appropriate formatting helper if needed

### Modifying UI Layout

1. Update the rendering function (e.g., `renderSummaryView`)
2. Adjust CSS in `injectStyles` function
3. Test with various screen sizes
4. Ensure animations remain smooth

### Debugging API Issues

1. Enable debug logging: `const DEBUG = true;`
2. Check console for intercepted API calls
3. Verify URL patterns match current endpoints
4. Inspect `apiData` object for completeness
5. Navigate through Endowus to trigger all API calls

## Don't Modify Unless Necessary

- Userscript metadata block (version, namespace, etc.)
- Core monkey patching logic (fetch/XHR interception)
- Money formatting logic (maintains consistency)
- Bucket extraction logic (affects all existing users)

## Documentation

When making significant changes:

- Update TECHNICAL_DESIGN.md with architectural changes
- Update README.md if user-facing features change
- Add inline comments for complex algorithms
- Increment version number following semantic versioning

## Additional Context

This is a **client-side only** solution - all processing happens in the browser. Users' financial data never leaves their machine, which is a core privacy feature. Maintain this principle in all modifications.

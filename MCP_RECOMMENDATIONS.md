# Model Context Protocol (MCP) Recommendations

This document outlines recommended MCP servers that can enhance the development experience for the Endowus Portfolio Viewer project.

## Overview

Model Context Protocol (MCP) servers provide additional context and capabilities to AI assistants like GitHub Copilot. These recommendations are tailored to the specific needs of this browser extension project.

## Recommended MCP Servers

### 1. Filesystem MCP Server ⭐ Essential

**Purpose**: Enhanced file system operations and code search

**Benefits for this project**:
- Fast code search across the userscript
- Pattern matching for JavaScript functions
- Better file navigation
- Quick access to documentation files

**Configuration**: See `mcp-config.json`

**Use Cases**:
- Finding specific functions in the large single-file userscript
- Searching for API endpoint references
- Locating calculation logic
- Finding CSS styles

---

### 2. GitHub MCP Server ⭐ Essential

**Purpose**: Direct GitHub repository interaction

**Benefits for this project**:
- Query issues and PRs
- Search for similar bugs
- Review commit history
- Check workflow status
- Search code across repository history

**Configuration**: See `mcp-config.json`

**Use Cases**:
- Finding related issues when debugging
- Reviewing historical changes to financial calculations
- Checking CI/CD status
- Searching for security-related commits

---

### 3. Browser Automation MCP Server 🔧 Recommended

**Purpose**: Automated browser testing via Playwright/Puppeteer

**Benefits for this project**:
- Automated testing of the Tampermonkey script
- Screenshot generation for documentation
- E2E testing workflows
- Performance profiling

**Configuration**: See `mcp-config.json`

**Use Cases**:
- Testing the script automatically on Endowus website
- Generating screenshots for PRs
- Performance benchmarking
- Regression testing

**Note**: Requires authentication to Endowus, use with caution

---

### 4. Memory MCP Server 💡 Helpful

**Purpose**: Persistent memory across conversations

**Benefits for this project**:
- Remember project-specific patterns
- Store common debugging solutions
- Track known edge cases
- Maintain context about architecture decisions

**Configuration**: See `mcp-config.json`

**Use Cases**:
- Remembering bucket naming convention edge cases
- Storing financial calculation verification steps
- Tracking browser-specific quirks
- Maintaining security checklist

---

### 5. Sequential Thinking MCP Server 🧠 Helpful

**Purpose**: Enhanced reasoning for complex problems

**Benefits for this project**:
- Better debugging of financial calculations
- Improved architecture planning
- More thorough code reviews
- Better test case generation

**Configuration**: See `mcp-config.json`

**Use Cases**:
- Debugging complex data merging logic
- Planning architectural changes
- Analyzing performance bottlenecks
- Reasoning through edge cases

---

### 6. Web Search MCP Server 📚 Optional

**Purpose**: Real-time web search capabilities

**Benefits for this project**:
- Look up Tampermonkey API documentation
- Search for security best practices
- Find browser compatibility information
- Research financial calculation standards

**Configuration**: See `mcp-config.json`

**Use Cases**:
- Checking latest Tampermonkey features
- Looking up XSS prevention techniques
- Finding browser API documentation
- Researching financial calculation precision

---

### 7. NPM MCP Server 📦 Optional

**Purpose**: Search and query NPM packages

**Benefits for this project**:
- Evaluate charting libraries for future features
- Research testing frameworks
- Find utility libraries for calculations
- Check for security vulnerabilities in dependencies

**Configuration**: See `mcp-config.json`

**Use Cases**:
- Finding lightweight charting libraries
- Researching date formatting libraries
- Checking for CSV export utilities
- Evaluating testing tools

---

## Not Recommended

### Database MCPs
❌ Not needed - this project has no database

### Kubernetes/Docker MCPs
❌ Not needed - this is a browser extension with no infrastructure

### Slack/Email MCPs
❌ Not needed - project communication happens via GitHub

---

## Installation Guide

### Prerequisites

1. **Install Node.js** (v18 or higher)
2. **Install GitHub CLI** (for GitHub MCP)
   ```bash
   # macOS
   brew install gh
   
   # Windows
   winget install GitHub.cli
   
   # Linux
   curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
   ```

3. **Authenticate GitHub CLI**
   ```bash
   gh auth login
   ```

### Installing MCP Servers

#### Option 1: Using the provided config (Recommended)

Copy the `mcp-config.json` to your Copilot settings directory and restart your IDE.

#### Option 2: Manual installation

```bash
# Install filesystem server
npm install -g @modelcontextprotocol/server-filesystem

# Install GitHub server  
npm install -g @modelcontextprotocol/server-github

# Install browser automation server
npm install -g @modelcontextprotocol/server-playwright

# Install memory server
npm install -g @modelcontextprotocol/server-memory

# Install sequential thinking server
npm install -g @modelcontextprotocol/server-sequential-thinking
```

---

## Configuration

See `mcp-config.json` for the complete configuration file.

Key configuration notes:

1. **Filesystem server**: Configured to read from repository root
2. **GitHub server**: Requires GitHub token with repo access
3. **Browser server**: Needs Playwright browsers installed
4. **Memory server**: Stores data in project `.mcp-memory` directory

---

## Usage Examples

### Using Filesystem MCP

```
@mcp-filesystem search for "extractBucket" function
@mcp-filesystem find all money formatting functions
@mcp-filesystem show me where growth percentage is calculated
```

### Using GitHub MCP

```
@mcp-github show recent issues about calculations
@mcp-github find PRs that modified API interception
@mcp-github search commits for "security"
```

### Using Browser Automation MCP

```
@mcp-browser navigate to app.sg.endowus.com and take a screenshot
@mcp-browser test the portfolio viewer button appears
@mcp-browser measure page load performance
```

### Using Memory MCP

```
@mcp-memory store: bucket naming convention is "Bucket - Goal"
@mcp-memory recall: what are the known edge cases for calculations?
@mcp-memory save: Chrome v120 has rendering issue with gradient
```

---

## Security Considerations

### GitHub Token
- Store in environment variable, not in config
- Use token with minimal required permissions
- Rotate regularly
- Never commit to repository

### Browser Automation
- Only use with test accounts
- Don't store credentials in scripts
- Be aware of rate limiting
- Respect Endowus terms of service

### Memory Storage
- Add `.mcp-memory/` to `.gitignore`
- Don't store sensitive financial data
- Review stored data periodically
- Clear memory when switching projects

---

## Troubleshooting

### MCP Server Not Connecting

1. Check Node.js version: `node --version` (should be v18+)
2. Verify server installation: `npm list -g`
3. Check GitHub CLI authentication: `gh auth status`
4. Restart IDE/Copilot
5. Check server logs in Copilot output panel

### Filesystem Server Issues

- Ensure read permissions on repository directory
- Check paths are absolute, not relative
- Verify allowed directories in config

### GitHub Server Issues

- Verify token has correct permissions
- Check rate limiting: `gh api rate_limit`
- Ensure repository access is granted

### Browser Server Issues

- Install Playwright browsers: `npx playwright install`
- Check browser automation is allowed on target site
- Verify network connectivity

---

## Performance Considerations

- **Filesystem searches**: Fast, use liberally
- **GitHub API calls**: Slow, rate-limited
- **Browser automation**: Very slow, use sparingly
- **Memory operations**: Fast, use as needed

---

## Maintenance

### Monthly
- Update MCP server packages
- Review stored memory data
- Check for deprecated features
- Rotate GitHub tokens

### Per Release
- Test critical MCPs still work
- Update configurations if needed
- Document new use cases

---

## Future Considerations

As the project grows, consider adding:

1. **Testing MCP**: For automated test generation
2. **Documentation MCP**: For generating/updating docs
3. **Analytics MCP**: For tracking usage patterns
4. **Custom MCP**: Project-specific tooling

---

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [GitHub MCP Server](https://github.com/modelcontextprotocol/servers)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Building Custom MCPs](https://modelcontextprotocol.io/docs/building)

---

## Support

Questions about MCP setup?
1. Check MCP documentation
2. Review GitHub Copilot documentation
3. Open an issue in this repository
4. Check the MCP Discord community

---

*Last updated: December 2025*

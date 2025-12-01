# MCP Configuration for Endowus Portfolio Viewer

This directory contains configuration for Model Context Protocol (MCP) servers to enhance the development experience.

## Quick Start

1. **Copy the configuration**:
   ```bash
   # For VS Code with GitHub Copilot
   cp mcp-config.json ~/.config/github-copilot/mcp-settings.json
   
   # Or use the config directly in your IDE's MCP settings
   ```

2. **Set up environment variables**:
   ```bash
   # Add to your .bashrc, .zshrc, or .env file
   export GITHUB_TOKEN="your_github_personal_access_token"
   ```

3. **Restart your IDE**

## Configuration Files

- **`mcp-config.json`**: Main MCP server configuration
- **`MCP_RECOMMENDATIONS.md`**: Detailed guide on MCPs and usage
- **`.mcp-memory/`**: Memory storage (gitignored)

## Enabled MCPs

### Essential (Enabled by Default)
- ✅ **Filesystem**: Code search and navigation
- ✅ **GitHub**: Issue, PR, and commit search
- ✅ **Memory**: Persistent context storage
- ✅ **Sequential Thinking**: Enhanced reasoning

### Optional (Disabled by Default)
- 🔧 **Browser Automation**: For automated testing
- 📚 **Web Search**: For documentation lookup
- 📦 **NPM**: For package research

## Usage Examples

### Ask Copilot with MCP context:
```
"Using the filesystem MCP, find all functions that calculate returns"
"Search GitHub for issues related to API interception"
"Store in memory: bucket format is 'Name - Description'"
"Use sequential thinking to debug this calculation issue"
```

## Environment Setup

Create a `.env.local` file (gitignored):
```bash
# Required
GITHUB_TOKEN=ghp_your_token_here

# Optional
BRAVE_API_KEY=your_brave_api_key
```

## Troubleshooting

**MCPs not connecting?**
- Check Node.js version (need v18+)
- Verify environment variables are set
- Restart IDE after configuration changes
- Check GitHub CLI authentication: `gh auth status`

**GitHub MCP issues?**
- Create token: https://github.com/settings/tokens
- Permissions needed: `repo`, `read:org`
- Check rate limits: `gh api rate_limit`

**Browser automation not working?**
- Install browsers: `npx playwright install`
- Enable in config: set `"enabled": true`

## Security Notes

⚠️ **Never commit**:
- GitHub tokens
- API keys
- `.mcp-memory/` contents (add to .gitignore)

✅ **Best practices**:
- Use environment variables for secrets
- Rotate tokens regularly
- Use minimal required permissions
- Review memory storage periodically

## More Information

See `MCP_RECOMMENDATIONS.md` for detailed documentation on:
- Each MCP server's capabilities
- Installation instructions
- Usage examples
- Performance considerations
- Troubleshooting guide

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [GitHub Copilot MCP Guide](https://docs.github.com/copilot/mcp)
- [MCP Server Repository](https://github.com/modelcontextprotocol/servers)

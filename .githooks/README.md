# Hooks Installation Guide

This directory contains Git hooks that help maintain code quality.

## Installation

To enable these hooks, run:

```bash
# Set Git to use .githooks directory
git config core.hooksPath .githooks
```

## Available Hooks

### pre-commit

Runs before each commit to ensure:
- ✅ ESLint passes (no linting errors)
- ✅ Jest tests pass (all tests green)
- ⚠️  No console.log in production code (warning only)
- ✅ Version consistency (userscript matches package.json)

## Skipping Hooks (Not Recommended)

If you need to skip hooks temporarily:

```bash
git commit --no-verify -m "Your message"
```

**Warning:** Only skip hooks if you have a good reason. The hooks exist to catch issues early.

## Troubleshooting

### Hook not running
- Check if hooks are enabled: `git config core.hooksPath`
- Should show: `.githooks`
- If not set: `git config core.hooksPath .githooks`

### Hook fails with permission error
```bash
chmod +x .githooks/pre-commit
```

### Tests take too long
Consider running tests in watch mode during development:
```bash
npm run test:watch
```

Then commit when ready.

## Customization

You can modify hooks in this directory. Changes apply immediately (no reinstallation needed).

## CI/CD

GitHub Actions runs the same checks on push. Local hooks help catch issues before pushing.

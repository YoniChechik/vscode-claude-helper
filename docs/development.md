# Development Guide

Quick reference for developing and testing Git Changes extension.

## Repository Structure

This is a VS Code extension that provides a tree view showing git changes compared to origin/main.

```
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── gitChangesTreeProvider.ts # Tree view data provider
│   ├── gitContentProvider.ts     # Provides git file content for diffs
│   ├── gitWatcher.ts             # Watches for git/file changes
│   └── utils/
│       └── logger.ts             # Logging utility
├── out/                          # Compiled TypeScript output
└── package.json                  # VS Code extension config
```

## Development Workflow

### Modifying the Extension

```bash
# 1. Edit TypeScript code
vim src/extension.ts

# 2. Compile and package
npm run compile
npx @vscode/vsce package

# 3. Install extension
code --install-extension git-changes-*.vsix --force

# 4. Reload VS Code window
# Press Ctrl+Shift+P -> "Developer: Reload Window"
```

**Quick compile & reload:**
```bash
npm run compile && npx @vscode/vsce package && code --install-extension git-changes-*.vsix --force
# Then reload VS Code window (Ctrl+Shift+P -> Reload Window)
```

## Debugging

### View Extension Logs

**In VS Code:**
- Press `Ctrl+Shift+P` -> `Git Changes: Show Logs`
- Or: `Ctrl+Shift+U` -> Select "Git Changes" from dropdown

### Common Issues

**Extension not activating:**
- Ensure workspace folder is open
- Ensure the workspace is a git repository with an origin/main branch
- Look at Developer Tools: `Help` -> `Toggle Developer Tools`

**Tree view not showing changes:**
- Check that origin/main branch exists
- Run `git fetch origin` to ensure remote refs are up to date

## Useful Commands

```bash
# Compile TypeScript
npm run compile

# Watch mode (auto-compile)
npm run watch

# Package extension
npx @vscode/vsce package

# List files in package
npx @vscode/vsce ls
```

## Publishing

See [publishing.md](publishing.md) for release instructions.

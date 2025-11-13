# Development Guide

Quick reference for developing and testing Claude Helper.

## Repository Structure

This is a VS Code extension that:
- Listens on an available HTTP port (starting from 3456) for commands
- Executes VS Code/GitLens commands
- Can be controlled via curl or HTTP requests
- Supports multiple VS Code windows by dynamically assigning ports

```
├── src/
│   ├── extension.ts           # Main extension logic
│   └── portListener.ts        # HTTP server for commands
├── out/                       # Compiled TypeScript output
└── package.json               # VS Code extension config
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
code --install-extension claude-helper-*.vsix --force

# 4. Reload VS Code window
# Press Ctrl+Shift+P → "Developer: Reload Window"

# 5. Test with curl (from Claude Helper terminal with $CLAUDE_HELPER_PORT set)
curl -X POST http://localhost:$CLAUDE_HELPER_PORT \
  -H "Content-Type: application/json" \
  -d '{"command":"ping","args":["Extension updated!"]}'
```

**Quick compile & reload:**
```bash
npm run compile && npx @vscode/vsce package && code --install-extension claude-helper-*.vsix --force
# Then reload VS Code window (Ctrl+Shift+P → Reload Window)
```

## Debugging

### View Extension Logs

**In VS Code:**
- Press `Ctrl+Shift+P` → `Claude Helper: Show Logs`
- Or: `Ctrl+Shift+U` → Select "Claude Helper" from dropdown

**Check log file:**
```bash
cat .claude-helper.log
```

### Common Issues

**Multiple VS Code windows:**
- Each window automatically gets its own port (3456, 3457, 3458, etc.)
- Use Claude Helper terminal to get the correct `$CLAUDE_HELPER_PORT` for that window

**Extension not activating:**
- Ensure workspace folder is open
- Check GitLens extension is installed
- Look at Developer Tools: `Help` → `Toggle Developer Tools`

**curl connection refused:**
- VS Code must be running with the extension activated
- Check logs for "HTTP listener started on http://127.0.0.1:XXXX"
- Make sure to use `$CLAUDE_HELPER_PORT` environment variable from Claude Helper terminal

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

# Test with curl (use $CLAUDE_HELPER_PORT from Claude Helper terminal)
curl -X POST http://localhost:$CLAUDE_HELPER_PORT \
  -H "Content-Type: application/json" \
  -d '{"command":"ping","args":["Test"]}'
```

## Publishing

See [publishing.md](publishing.md) for release instructions.

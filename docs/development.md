# Development Guide

Quick reference for developing and testing Claude Helper.

## Repository Structure

This is a VS Code extension that:
- Listens on HTTP port 3456 for commands
- Executes VS Code/GitLens commands
- Can be controlled via curl or HTTP requests

```
├── src/
│   ├── extension.ts           # Main extension logic
│   └── portListener.ts        # HTTP server for commands
├── out/                       # Compiled TypeScript output
└── package.json               # VS Code extension config
```

## Testing with curl

The extension listens on `http://localhost:3456` when VS Code is running. Test commands directly:

```bash
# Send a notification
curl -X POST http://localhost:3456 \
  -H "Content-Type: application/json" \
  -d '{"command":"ping","args":["Hello from curl!"]}'

# Set terminal title
curl -X POST http://localhost:3456 \
  -H "Content-Type: application/json" \
  -d '{"command":"setTerminalTitle","args":["My Terminal"]}'

# Compare git references
curl -X POST http://localhost:3456 \
  -H "Content-Type: application/json" \
  -d '{"command":"compareReferences","args":["main","HEAD"]}'

# Clear comparisons
curl -X POST http://localhost:3456 \
  -H "Content-Type: application/json" \
  -d '{"command":"clearComparisons","args":[]}'
```

Available commands:
- `ping` - Show notification with optional message
- `pingTerminalTitle` - Show notification with current terminal title
- `setTerminalTitle` - Change terminal title
- `compareReferences` - Compare two git refs
- `compareHead` - Compare HEAD with another ref
- `clearComparisons` - Clear GitLens comparisons

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

# 5. Test with curl
curl -X POST http://localhost:3456 \
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

**Port 3456 already in use:**
- Another VS Code instance is running the extension
- Close other VS Code windows or change the port in `src/extension.ts:77`

**Extension not activating:**
- Ensure workspace folder is open
- Check GitLens extension is installed
- Look at Developer Tools: `Help` → `Toggle Developer Tools`

**curl connection refused:**
- VS Code must be running with the extension activated
- Check logs for "HTTP listener started on http://127.0.0.1:3456"

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

# Test with curl
curl -X POST http://localhost:3456 \
  -H "Content-Type: application/json" \
  -d '{"command":"ping","args":["Test"]}'
```

## Publishing

See [publishing.md](publishing.md) for release instructions.

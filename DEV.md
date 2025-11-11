# Development Guide

Quick reference for developing and testing GitLens CLI Bridge.

## Two Components

This project has **two separate components** that need to be reinstalled independently:

1. **VS Code Extension** (`src/extension.ts` → `out/extension.js`)
   - Runs inside VS Code
   - Listens for CLI commands and executes GitLens commands
   - **Reinstall after:** Changing `src/extension.ts`

2. **CLI Tool** (`gitlens_cli_bridge/cli.py`)
   - Python script installed via `uv tool install`
   - Writes command files for the extension to process
   - **Reinstall after:** Changing `gitlens_cli_bridge/cli.py`

## Force Reinstall Extension

### Method 1: Quick Reinstall (Recommended for active development)

```bash
# Compile, package, and force install in one go
npm run compile && npx @vscode/vsce package && code --install-extension gitlens-cli-bridge-1.0.0.vsix --force
```

Then in VS Code:
- Press `Ctrl+Shift+P` → `Developer: Reload Window`

### Method 2: Clean Reinstall

```bash
# 1. Uninstall
code --uninstall-extension gitlens-cli-bridge

# 2. Compile and package
npm run compile
npx @vscode/vsce package

# 3. Install
code --install-extension gitlens-cli-bridge-1.0.0.vsix

# 4. Reload VS Code
# Press Ctrl+Shift+P → "Developer: Reload Window"
```

### Method 3: Development Mode (F5)

Best for rapid iteration:

1. Open project in VS Code
2. Press `F5` to launch Extension Development Host
3. Make code changes
4. In the Extension Development Host window: Press `Ctrl+R` to reload

## Force Reinstall CLI Tool

### Using uv (Recommended)

```bash
# Reinstall from local source
uv tool install --force .

# Or reinstall from PyPI (when published)
uv tool upgrade gitlens-cli-bridge
```

### Using pip (Alternative)

```bash
# Uninstall old version
pip uninstall gitlens-cli-bridge -y

# Install from local source
pip install .
```

### When to Reinstall CLI Tool

You **need** to reinstall the CLI tool when:
- ✅ You modify `gitlens_cli_bridge/cli.py`
- ✅ You modify `pyproject.toml` (CLI dependencies/metadata)

You **don't need** to reinstall when:
- ❌ You modify `src/extension.ts` (only reload VS Code)
- ❌ You modify extension `package.json` (only reinstall extension)

## Quick Test Workflow

### When Modifying Extension (TypeScript)

```bash
# 1. Make changes to extension code
vim src/extension.ts

# 2. Compile and reinstall extension
npm run compile
npx @vscode/vsce package && code --install-extension gitlens-cli-bridge-1.0.0.vsix --force

# 3. Reload VS Code window
# Ctrl+Shift+P → "Developer: Reload Window"

# 4. Test CLI
glcli clear

# 5. Check logs (if debugging)
# Ctrl+Shift+P → "GitLens CLI Bridge: Show Logs"
```

### When Modifying CLI (Python)

```bash
# 1. Make changes to CLI code
vim gitlens_cli_bridge/cli.py

# 2. Reinstall CLI tool
uv tool install --force .

# 3. Test CLI directly
glcli clear
glcli compare main HEAD

# 4. Check result (if debugging)
cat .gitlens-cli-result
```

## Debugging

###View Extension Logs

**In VS Code (REQUIRED for debugging):**
Since the extension runs in VS Code, you MUST view logs from within VS Code:

1. Open VS Code with your workspace
2. Press `Ctrl+Shift+P` → `GitLens CLI Bridge: Show Logs`
3. Or: `Ctrl+Shift+U` → Select "GitLens CLI Bridge" from dropdown

The logs will show:
- Which commands are being tried
- Which command succeeded (✓) or failed (✗)
- Detailed error messages

**From CLI (limited):**
The CLI will attempt to print logs if available:
```bash
glcli clear
# Should show:
# --- Extension Logs ---
# [timestamp] log messages...
# --- End Logs ---
```

**Note:** If running in a container/remote environment, the `code` command may open VS Code on your host machine. The extension logs will only be visible in that VS Code instance, not in the terminal.

### Check if Extension is Active

```bash
# In VS Code, you should see notification:
# "GitLens CLI Bridge activated - check Output panel"

# Or check installed extensions:
# Ctrl+Shift+P → "Extensions: Show Installed Extensions"
# Search for "GitLens CLI Bridge"
```

### Debug Extension in Development Mode

1. Set breakpoints in `src/extension.ts`
2. Press `F5` to launch Extension Development Host
3. Use the CLI in a terminal
4. Breakpoints will be hit in the main VS Code window

### Common Issues

**Extension not activating:**
- Check that you have a workspace folder open
- Check extension dependencies (GitLens must be installed)
- Look at Developer Tools console: `Help` → `Toggle Developer Tools`

**CLI timeout:**
- Ensure VS Code is open with the workspace
- Check that the extension is activated (see notification)
- Verify `.gitlens-cli` file is created in workspace root

**Commands not working:**
- Check the logs for specific error messages
- Verify GitLens extension is installed and active
- Try running GitLens commands manually from Command Palette

## File Structure

```
├── src/
│   └── extension.ts           # VS Code extension (TypeScript)
├── gitlens_cli_bridge/
│   └── cli.py                 # Python CLI tool
├── out/                       # Compiled TypeScript output
├── package.json               # Extension config
├── pyproject.toml             # Python package config
└── DEV.md                     # This file
```

## Useful Commands

```bash
# Compile TypeScript
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Package extension
npx @vscode/vsce package

# List files in package
npx @vscode/vsce ls

# Install CLI tool locally
uv tool install --force .

# Test CLI
glcli compare main HEAD
glcli compare-head origin/main
glcli clear
glcli --help
```

## Publishing

See [PUBLISHING.md](PUBLISHING.md) for detailed publishing instructions.

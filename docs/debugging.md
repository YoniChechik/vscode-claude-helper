# Debugging Claude Helper

Guide for debugging both the VS Code extension and CLI tool.

## Extension Debugging

### View Logs in VS Code

The extension logs all operations to help with debugging.

**Method 1: Output Panel**
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: `Claude Helper: Show Logs`
3. Or press `Ctrl+Shift+U` and select "Claude Helper" from dropdown

**Method 2: Log File**
- Location: `.claude-helper.log` in your workspace root
- View in terminal: `cat .claude-helper.log`

### Debug with Breakpoints

1. Open the project in VS Code
2. Set breakpoints in `src/extension.ts`
3. Press `F5` to launch Extension Development Host
4. Run CLI commands in a terminal
5. Breakpoints will be hit in the main VS Code window

### Check Extension Status

```bash
# See if extension is installed
code --list-extensions | grep claude-helper

# Check activation
# Should see: "Claude Helper activated" notification when VS Code starts
```

## CLI Tool Debugging

### Enable Verbose Output

The CLI tool writes debug information to `.claude-helper-result`:

```bash
# Run command
ch ping

# Check result
cat .claude-helper-result
```

### Check CLI Installation

```bash
# Verify CLI is installed
which ch
which claude-helper

# Check version
ch --help
```

### Test CLI Communication

```bash
# Simple test
ch ping

# Should show:
# ✓ Ping! Notification shown in VS Code
```

## Common Issues

### Extension Not Activating

**Symptoms:** No activation notification, commands don't work

**Check:**
1. Workspace folder is open (extension requires a workspace)
2. GitLens extension is installed (required dependency)
3. Developer Tools console: `Help` → `Toggle Developer Tools`

### CLI Timeout

**Symptoms:** `Timeout waiting for result from VS Code extension`

**Check:**
1. VS Code is open with the workspace
2. Extension is activated (check for notification)
3. `.claude-helper` file is created in workspace root
4. File permissions allow writing to workspace

### Commands Not Working

**Check logs for errors:**
```bash
# In VS Code
Ctrl+Shift+P → Claude Helper: Show Logs

# Look for error messages
```

**Verify GitLens:**
```bash
# For compare commands, ensure GitLens is active
code --list-extensions | grep gitlens
```

## Development Mode

### Hot Reload

When developing, use watch mode for automatic recompilation:

```bash
# Terminal 1: Watch TypeScript
npm run watch

# Terminal 2: Test changes
# Reload Extension Development Host: Ctrl+R
```

### Clean Reinstall

If changes aren't applying:

```bash
# Extension
npm run compile
npx @vscode/vsce package
code --install-extension claude-helper-1.0.0.vsix --force
# Then: Ctrl+Shift+P → Developer: Reload Window

# CLI Tool
uv cache clean
uv tool uninstall claude-helper
uv tool install .
```

## Remote Development (Containers/SSH/WSL)

**Important:** The extension runs in the remote environment, not on your local machine.

- **Platform detection:** Reports the remote OS (e.g., Linux in container)
- **File operations:** Occur in the remote filesystem
- **VS Code UI:** Runs on local machine (Windows/Mac/Linux)

### Verify Context

```bash
# In remote terminal
echo $VSCODE_REMOTE

# Check where extension is running
# Logs show: "Claude Helper is now active"
```

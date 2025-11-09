# Git Diff Viewer Extension - Development Guide

## What This Extension Does

A VS Code extension that displays all files that differ between your current HEAD and origin/main in a dedicated sidebar panel. Click any file to open a side-by-side diff view.

## Project Structure

```
vscode-git-diff-extension/
├── src/
│   ├── extension.ts          # Main entry point, registers commands
│   ├── gitDiffProvider.ts    # Tree view provider, git diff logic
├── out/                       # Compiled JavaScript output
├── package.json               # Extension manifest and configuration
├── tsconfig.json             # TypeScript compiler settings
└── LICENSE                   # MIT License
```

## Key Features

- **Custom Sidebar Icon**: Git-compare icon in the activity bar
- **Tree View**: Lists all changed files with status indicators
- **Color-Coded Icons**: Different colors for Modified/Added/Deleted/Renamed files
- **Click to Diff**: Opens side-by-side comparison of HEAD vs origin/main
- **Refresh Button**: Updates the file list
- **Output Logging**: Debug logs in Output panel

## Development Workflow

### Initial Setup

```bash
cd /root/vscode-git-diff-extension
npm install
```

### Fast Development Cycle

1. **Start watch mode** (auto-compiles on save):
```bash
npm run watch
```

2. **Open extension folder**:
```bash
code .
```

3. **Launch extension** (press `F5` or Run → Start Debugging)
   - Opens "Extension Development Host" window

4. **Make changes** to TypeScript files

5. **Reload extension**: Press `Ctrl+R` in Extension Development Host window
   - No need to close/reopen VS Code!

### Viewing Logs

1. In Extension Development Host window: View → Output
2. Select "Git Diff Viewer" from dropdown
3. See detailed logs when clicking files

## How It Works

### Git Diff Detection

`gitDiffProvider.ts` executes:
```bash
git fetch origin main
git diff --name-status HEAD origin/main
```

Parses output to extract:
- File paths
- Status (M=Modified, A=Added, D=Deleted, R=Renamed)

### Opening Diffs

`extension.ts` uses VS Code's built-in git extension API:
```typescript
vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title)
```

Creates git scheme URIs pointing to specific refs (origin/main, HEAD).

## Manual Installation

### Package Extension

```bash
npm install -g @vscode/vsce
vsce package
```

Creates `git-diff-viewer-0.0.1.vsix`

### Install in VS Code

```bash
code --install-extension git-diff-viewer-0.0.1.vsix --force
```

Then: Cmd+Shift+P → "Reload Window"

## Extension Configuration

### Activity Bar Icon

```json
"viewsContainers": {
  "activitybar": [{
    "id": "gitDiffContainer",
    "icon": "$(git-compare)"
  }]
}
```

### Tree View

```json
"views": {
  "gitDiffContainer": [{
    "id": "gitDiffExplorer",
    "name": "Git Diff (HEAD vs origin/main)"
  }]
}
```

## Troubleshooting

### "Editor could not be opened" Error

Check Output panel logs. Common issues:
- Git extension not loaded
- Invalid git URI scheme
- File doesn't exist in origin/main

### Files Not Showing

- Ensure you're in a git repository
- Check that origin/main exists
- Click refresh button to update

### Extension Not Activating

- Check activation events in package.json
- Look for errors in Developer Tools (Help → Toggle Developer Tools)

## Tech Stack

- **TypeScript**: Type-safe JavaScript
- **VS Code API**: Extension host APIs
- **Git CLI**: Direct git commands via child_process
- **VS Code Git Extension**: For diff rendering

## Future Enhancements

- [ ] Support other base branches (not just origin/main)
- [ ] Group files by directory
- [ ] Show diff statistics (additions/deletions)
- [ ] Context menu actions (open file, copy path)
- [ ] Settings to customize base branch
- [ ] Show uncommitted changes separately

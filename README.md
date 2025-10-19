# Git Diff Viewer Extension

A VS Code extension that displays git diff files between your current HEAD and origin/main in a tree view.

## Features

- View all changed files between HEAD and origin/main
- Color-coded status indicators (Modified, Added, Deleted, Renamed)
- Click any file to open a side-by-side diff view
- Refresh button to update the diff list

## Installation

1. Install dependencies:
```bash
cd vscode-git-diff-extension
npm install
```

2. Compile the extension:
```bash
npm run compile
```

3. Open the extension folder in VS Code:
```bash
code .
```

4. Press `F5` to launch the extension in a new VS Code window

## Usage

1. Open a git repository in VS Code
2. Look for "Git Diff (HEAD vs origin/main)" panel in the Explorer sidebar
3. The panel will automatically populate with files that differ between HEAD and origin/main
4. Click any file to see the diff
5. Use the refresh button (top-right) to update the list

## Development

- Compile: `npm run compile`
- Watch mode: `npm run watch`
- Package: `vsce package`

## Requirements

- Git must be installed and accessible in PATH
- Repository must have an origin/main branch

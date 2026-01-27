# Git Changes View

A minimal VS Code extension that shows changed files compared to origin/main in a live-updating tree view.

## Features

- Tree view in the activity bar showing all files changed vs origin/main
- Status icons indicate file state (added, modified, deleted, renamed)
- Double-click any file to open a split diff view
- Live updates when git state changes (commits, checkouts, etc.)
- Full directory hierarchy preserved

## Installation

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=YoniChechik.git-changes-view)

Or install from source:
```bash
npm install
npm run compile
```

## Usage

1. Open a git repository in VS Code
2. Click the Git Changes icon in the activity bar
3. View all files changed compared to origin/main
4. Double-click a file to see the diff

## Commands

- **Git Changes: Refresh** - Manually refresh the tree view
- **Git Changes: Show Logs** - Open the output panel

## Requirements

- VS Code 1.75.0 or later
- A git repository with origin/main branch

## License

MIT

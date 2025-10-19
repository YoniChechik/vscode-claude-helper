# Git Diff Viewer

A powerful VS Code extension that helps you visualize and compare git changes across branches, worktrees, and commits with a clean, organized tree view.

## Features

✨ **Flexible Comparison**
- Compare any two branches, tags, or commits
- Support for git worktrees - view changes across multiple working directories
- Compare working tree changes against any remote or local branch

🌳 **Smart Tree View**
- **Tree Mode**: View files organized by directory structure
- **List Mode**: View all files in a flat list
- Collapsible worktree sections for multi-worktree repositories
- Auto-refresh every second to stay up-to-date

🎨 **Clean Interface**
- Color-coded status indicators (Modified, Added, Deleted)
- Simple, uncluttered file display
- Click any file to open side-by-side diff
- Intuitive icons and visual feedback

⚡ **Powerful Features**
- Two-stage comparison target selection
- Includes untracked files in comparisons
- Support for both origin/main and origin/master
- Automatic git fetch to ensure latest remote state

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Git Diff Viewer"
4. Click Install

## Usage

### Basic Usage

1. Open a git repository in VS Code
2. Look for the "Git Diff" icon in the Activity Bar (left sidebar)
3. View your changes organized by worktree and directory
4. Click any file to see the diff

### Changing Comparison Target

1. Click the comparison icon in the view toolbar
2. **Step 1**: Select source (Working Tree, HEAD, or worktree HEAD)
3. **Step 2**: Select target (any branch, tag, or remote)
4. View changes between your selected source and target

### Toggle View Mode

Click the tree/list icon to switch between:
- **Tree View**: Files organized by folder structure
- **List View**: All files in a flat list

## Requirements

- Git must be installed and accessible in PATH

## Known Issues

None at this time. Please report issues on [GitHub](https://github.com/YoniChechik/vscode-git-diff-extension/issues).

## Release Notes

### 0.6.0

- **Modularized codebase**: Split into gitOperations, treeItems, and treeBuilder modules
- **Simplified UI**: Cleaner titles and status display
- **Improved maintainability**: Reduced code duplication

### 0.5.x

- Added worktree support with hierarchical tree view
- Two-stage comparison target selection
- Tree/List view toggle
- Auto-refresh every 1 second
- Support for untracked files
- Cross-platform compatibility (Windows, Mac, Linux)

### 0.0.1

- Initial release
- Basic git diff viewing between HEAD and origin/main

## Contributing

Contributions are welcome! Please visit the [GitHub repository](https://github.com/YoniChechik/vscode-git-diff-extension) to report issues or submit pull requests.

## License

MIT License - see LICENSE.txt for details

---

**Enjoy comparing your git changes!** 🚀

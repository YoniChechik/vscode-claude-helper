import * as vscode from 'vscode';

export class WorktreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly worktreePath: string,
        public readonly branch: string,
        public readonly isMain: boolean
    ) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.tooltip = `${branch} - ${worktreePath}`;
        this.description = branch;
        this.iconPath = new vscode.ThemeIcon(isMain ? 'repo' : 'git-branch');
        this.contextValue = 'worktree';
        console.log(`[WorktreeItem] Created: label="${label}", path="${worktreePath}", branch="${branch}", isMain=${isMain}`);
    }
}

export class FolderItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly fullPath: string,
        public readonly worktreePath: string,
        public readonly children: (FolderItem | DiffFileItem)[]
    ) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.tooltip = fullPath;
        this.iconPath = vscode.ThemeIcon.Folder;
        this.contextValue = 'folder';
    }
}

export class DiffFileItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly relativePath: string,
        public readonly absolutePath: string,
        public readonly status: string,
        public readonly gitState: string,
        public readonly worktreePath: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `${status}: ${relativePath}`;
        this.description = status;
        this.iconPath = this.getIconForStatus(status);
        this.contextValue = 'diffFile';
        this.command = {
            command: 'gitDiffExplorer.openDiff',
            title: 'Open Diff',
            arguments: [this]
        };
        console.log(`[DiffFileItem] Created: label="${label}", path="${relativePath}", status="${status}", gitState="${gitState}", worktree="${worktreePath}"`);
    }

    private getIconForStatus(status: string): vscode.ThemeIcon {
        switch (status.charAt(0)) {
            case 'M':
                return new vscode.ThemeIcon('diff-modified', new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'));
            case 'A':
                return new vscode.ThemeIcon('diff-added', new vscode.ThemeColor('gitDecoration.addedResourceForeground'));
            case 'D':
                return new vscode.ThemeIcon('diff-removed', new vscode.ThemeColor('gitDecoration.deletedResourceForeground'));
            case 'R':
                return new vscode.ThemeIcon('diff-renamed', new vscode.ThemeColor('gitDecoration.renamedResourceForeground'));
            default:
                return new vscode.ThemeIcon('diff');
        }
    }
}

export type TreeItem = WorktreeItem | FolderItem | DiffFileItem;
export type ViewMode = 'tree' | 'list';

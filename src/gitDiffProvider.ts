import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class DiffFileItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly relativePath: string,
        public readonly status: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `${status}: ${relativePath}`;
        this.description = status;
        this.iconPath = this.getIconForStatus(status);
        this.command = {
            command: 'gitDiffExplorer.openDiff',
            title: 'Open Diff',
            arguments: [this]
        };
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

export class GitDiffProvider implements vscode.TreeDataProvider<DiffFileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DiffFileItem | undefined | void> = new vscode.EventEmitter<DiffFileItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<DiffFileItem | undefined | void> = this._onDidChangeTreeData.event;

    private diffFiles: DiffFileItem[] = [];

    constructor() {
        this.loadDiffFiles();
    }

    refresh(): void {
        this.loadDiffFiles();
    }

    getTreeItem(element: DiffFileItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DiffFileItem): Thenable<DiffFileItem[]> {
        if (element) {
            return Promise.resolve([]);
        }
        return Promise.resolve(this.diffFiles);
    }

    private async loadDiffFiles(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            this.diffFiles = [];
            this._onDidChangeTreeData.fire();
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;

        try {
            // First fetch to ensure we have latest origin/main
            try {
                await execAsync('git fetch origin main', { cwd: workspaceRoot });
            } catch (fetchError) {
                console.error('Failed to fetch origin/main:', fetchError);
            }

            // Get diff between HEAD and origin/main
            const { stdout } = await execAsync(
                'git diff --name-status HEAD origin/main',
                { cwd: workspaceRoot }
            );

            const files = stdout
                .trim()
                .split('\n')
                .filter(line => line.length > 0)
                .map(line => {
                    const parts = line.split('\t');
                    const status = parts[0];
                    const filePath = parts[1];
                    const fileName = filePath.split('/').pop() || filePath;

                    const statusText = this.getStatusText(status);

                    return new DiffFileItem(
                        fileName,
                        filePath,
                        statusText,
                        vscode.TreeItemCollapsibleState.None
                    );
                });

            this.diffFiles = files;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to get git diff: ${errorMessage}`);
            this.diffFiles = [];
        }

        this._onDidChangeTreeData.fire();
    }

    private getStatusText(status: string): string {
        switch (status.charAt(0)) {
            case 'M':
                return 'Modified';
            case 'A':
                return 'Added';
            case 'D':
                return 'Deleted';
            case 'R':
                return 'Renamed';
            case 'C':
                return 'Copied';
            case 'U':
                return 'Unmerged';
            default:
                return status;
        }
    }
}

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
        console.log(`[DiffFileItem] Created: label="${label}", path="${relativePath}", status="${status}"`);
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
    public defaultBranch: string = 'master';

    constructor() {
        this.loadDiffFiles();
    }

    public getDefaultBranch(): string {
        return this.defaultBranch;
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
            // Detect the default branch (main or master)
            try {
                const { stdout: branchOutput } = await execAsync(
                    'git symbolic-ref refs/remotes/origin/HEAD',
                    { cwd: workspaceRoot }
                );
                // Extract branch name from refs/remotes/origin/main or refs/remotes/origin/master
                this.defaultBranch = branchOutput.trim().split('/').pop() || 'main';
            } catch (branchError) {
                // If symbolic-ref fails, try to detect if origin/master exists
                try {
                    await execAsync('git rev-parse --verify origin/master', { cwd: workspaceRoot });
                    this.defaultBranch = 'master';
                } catch {
                    // Fallback to main
                    this.defaultBranch = 'main';
                }
            }

            // First fetch to ensure we have latest origin branch
            try {
                await execAsync(`git fetch origin ${this.defaultBranch}`, { cwd: workspaceRoot });
            } catch (fetchError) {
                console.error(`Failed to fetch origin/${this.defaultBranch}:`, fetchError);
            }

            // Get uncommitted changes (working directory + staged)
            console.log('[GitDiffProvider] Getting local changes...');
            const { stdout: localChanges } = await execAsync(
                'git diff --name-status HEAD',
                { cwd: workspaceRoot }
            );
            console.log(`[GitDiffProvider] Local changes:\n${localChanges || '(empty)'}`);

            // Get untracked files
            console.log('[GitDiffProvider] Getting untracked files...');
            const { stdout: untrackedFiles } = await execAsync(
                'git ls-files --others --exclude-standard',
                { cwd: workspaceRoot }
            );
            console.log(`[GitDiffProvider] Untracked files:\n${untrackedFiles || '(empty)'}`);

            // Format untracked files as "A" (added) status
            const formattedUntracked = untrackedFiles
                .trim()
                .split('\n')
                .filter(line => line.length > 0)
                .map(file => `A\t${file}`)
                .join('\n');
            console.log(`[GitDiffProvider] Formatted untracked:\n${formattedUntracked || '(empty)'}`);

            // Get diff between HEAD and origin/defaultBranch
            console.log(`[GitDiffProvider] Getting remote changes vs origin/${this.defaultBranch}...`);
            const { stdout: remoteChanges } = await execAsync(
                `git diff --name-status HEAD origin/${this.defaultBranch}`,
                { cwd: workspaceRoot }
            );
            console.log(`[GitDiffProvider] Remote changes:\n${remoteChanges || '(empty)'}`);

            // Combine all diffs, removing duplicates
            const allChanges = (localChanges + '\n' + formattedUntracked + '\n' + remoteChanges).trim();
            console.log(`[GitDiffProvider] All combined changes:\n${allChanges}`);
            const fileMap = new Map<string, { status: string, filePath: string }>();

            allChanges
                .split('\n')
                .filter(line => line.length > 0)
                .forEach(line => {
                    const parts = line.split('\t');
                    const status = parts[0];
                    const filePath = parts[1];
                    console.log(`[GitDiffProvider] Processing line: status="${status}", filePath="${filePath}"`);

                    // Keep the first occurrence (local changes take priority)
                    if (!fileMap.has(filePath)) {
                        fileMap.set(filePath, { status, filePath });
                        console.log(`[GitDiffProvider] Added to map: ${filePath}`);
                    } else {
                        console.log(`[GitDiffProvider] Skipped duplicate: ${filePath}`);
                    }
                });

            console.log(`[GitDiffProvider] Creating DiffFileItem objects from ${fileMap.size} files...`);
            const files = Array.from(fileMap.values()).map(({ status, filePath }) => {
                const fileName = filePath.split('/').pop() || filePath;
                const statusText = this.getStatusText(status);
                console.log(`[GitDiffProvider] Mapping: status="${status}" -> statusText="${statusText}", file="${fileName}"`);

                return new DiffFileItem(
                    fileName,
                    filePath,
                    statusText,
                    vscode.TreeItemCollapsibleState.None
                );
            });

            console.log(`[GitDiffProvider] Total files loaded: ${files.length}`);
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

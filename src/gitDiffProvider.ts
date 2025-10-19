import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Represents a git worktree (root level collapsible item)
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

// Represents a file with changes
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
        this.tooltip = `${status} (${gitState}): ${relativePath}`;
        this.description = `${status} • ${gitState}`;
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

type TreeItem = WorktreeItem | DiffFileItem;

export class GitDiffProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event;

    private worktrees: WorktreeItem[] = [];
    private worktreeFiles: Map<string, DiffFileItem[]> = new Map();
    public defaultBranch = 'master';

    constructor() {
        this.loadWorktreesAndFiles();
    }

    public getDefaultBranch(): string {
        return this.defaultBranch;
    }

    refresh(): void {
        this.loadWorktreesAndFiles();
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        if (!element) {
            // Root level - return worktrees
            return Promise.resolve(this.worktrees);
        }

        if (element instanceof WorktreeItem) {
            // Return files for this worktree
            const files = this.worktreeFiles.get(element.worktreePath) || [];
            return Promise.resolve(files);
        }

        // Files don't have children
        return Promise.resolve([]);
    }

    private async loadWorktreesAndFiles(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            this.worktrees = [];
            this.worktreeFiles.clear();
            this._onDidChangeTreeData.fire();
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;

        try {
            // Get list of all worktrees
            console.log('[GitDiffProvider] Getting worktree list...');
            const { stdout: worktreeList } = await execAsync(
                'git worktree list --porcelain',
                { cwd: workspaceRoot }
            );
            console.log(`[GitDiffProvider] Worktree list:\n${worktreeList}`);

            // Parse worktree list
            const worktreeData: { path: string; branch: string; isMain: boolean }[] = [];
            const lines = worktreeList.trim().split('\n');
            let currentWorktree: { path?: string; branch?: string; isMain?: boolean } = {};

            for (const line of lines) {
                if (line.startsWith('worktree ')) {
                    if (currentWorktree.path) {
                        worktreeData.push({
                            path: currentWorktree.path,
                            branch: currentWorktree.branch || 'unknown',
                            isMain: currentWorktree.isMain || false
                        });
                    }
                    currentWorktree = { path: line.substring(9), isMain: false };
                } else if (line.startsWith('branch ')) {
                    currentWorktree.branch = line.substring(7).split('/').pop() || 'unknown';
                } else if (line.startsWith('HEAD ')) {
                    // This is the main worktree if it matches workspace root
                    if (currentWorktree.path === workspaceRoot) {
                        currentWorktree.isMain = true;
                    }
                }
            }
            // Add the last worktree
            if (currentWorktree.path) {
                worktreeData.push({
                    path: currentWorktree.path,
                    branch: currentWorktree.branch || 'unknown',
                    isMain: currentWorktree.isMain || false
                });
            }

            // Sort so main worktree is first
            worktreeData.sort((a, b) => {
                if (a.isMain) { return -1; }
                if (b.isMain) { return 1; }
                return a.path.localeCompare(b.path);
            });

            console.log(`[GitDiffProvider] Found ${worktreeData.length} worktrees`);

            // Create worktree items
            this.worktrees = worktreeData.map(wt => {
                const label = wt.isMain ? '📁 Current Directory' : `🌿 ${wt.path.split(/[/\\]/).pop() || 'worktree'}`;
                return new WorktreeItem(label, wt.path, wt.branch, wt.isMain);
            });

            // Load files for each worktree
            this.worktreeFiles.clear();
            for (const wtData of worktreeData) {
                const files = await this.loadFilesForWorktree(wtData.path);
                this.worktreeFiles.set(wtData.path, files);
            }

            this._onDidChangeTreeData.fire();
        } catch (error) {
            console.error('[GitDiffProvider] Error loading worktrees:', error);
            this.worktrees = [];
            this.worktreeFiles.clear();
            this._onDidChangeTreeData.fire();
        }
    }

    private async loadFilesForWorktree(workspaceRoot: string): Promise<DiffFileItem[]> {

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

            // Get git porcelain status to determine file states
            console.log('[GitDiffProvider] Getting git status (porcelain)...');
            const { stdout: porcelainStatus } = await execAsync(
                'git status --porcelain',
                { cwd: workspaceRoot }
            );
            console.log(`[GitDiffProvider] Porcelain status:\n${porcelainStatus || '(empty)'}`);

            // Parse porcelain status to get git state for each file
            const gitStateMap = new Map<string, string>();
            porcelainStatus
                .trim()
                .split('\n')
                .filter(line => line.length > 0)
                .forEach(line => {
                    const statusCode = line.substring(0, 2);
                    const filePath = line.substring(3);

                    let gitState = 'Unknown';
                    if (statusCode === '??') {
                        gitState = 'Untracked';
                    } else if (statusCode === 'M ') {
                        gitState = 'Staged';
                    } else if (statusCode === ' M') {
                        gitState = 'Unstaged';
                    } else if (statusCode === 'MM') {
                        gitState = 'Staged+Unstaged';
                    } else if (statusCode === 'A ') {
                        gitState = 'Staged';
                    } else if (statusCode === 'AM') {
                        gitState = 'Staged+Unstaged';
                    } else if (statusCode === 'D ') {
                        gitState = 'Staged (Deleted)';
                    } else if (statusCode === ' D') {
                        gitState = 'Unstaged (Deleted)';
                    } else if (statusCode === 'R ') {
                        gitState = 'Staged (Renamed)';
                    } else if (statusCode === 'C ') {
                        gitState = 'Staged (Copied)';
                    }

                    console.log(`[GitDiffProvider] Git state: "${filePath}" -> "${gitState}" (code: "${statusCode}")`);
                    gitStateMap.set(filePath, gitState);
                });

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
                const gitState = gitStateMap.get(filePath) || 'Committed';
                const absolutePath = `${workspaceRoot}/${filePath}`.replace(/\\/g, '/');
                console.log(`[GitDiffProvider] Mapping: status="${status}" -> statusText="${statusText}", gitState="${gitState}", file="${fileName}"`);

                return new DiffFileItem(
                    fileName,
                    filePath,
                    absolutePath,
                    statusText,
                    gitState,
                    workspaceRoot,
                    vscode.TreeItemCollapsibleState.None
                );
            });

            console.log(`[GitDiffProvider] Total files loaded for worktree: ${files.length}`);
            return files;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Failed to get git diff for worktree ${workspaceRoot}: ${errorMessage}`);
            return [];
        }
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

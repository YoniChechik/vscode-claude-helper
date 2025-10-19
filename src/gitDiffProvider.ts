import * as vscode from 'vscode';
import { WorktreeItem, FolderItem, DiffFileItem, TreeItem, ViewMode } from './treeItems';
import { GitOperations } from './gitOperations';
import { TreeBuilder } from './treeBuilder';

export { WorktreeItem, FolderItem, DiffFileItem };

export class GitDiffProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event;

    private worktrees: WorktreeItem[] = [];
    private worktreeFiles: Map<string, DiffFileItem[]> = new Map();
    private worktreeTrees: Map<string, (FolderItem | DiffFileItem)[]> = new Map();
    private defaultBranch = 'master';
    private comparisonTarget: string | null = null;
    private viewMode: ViewMode = 'tree';

    private gitOps = new GitOperations();
    private treeBuilder = new TreeBuilder();

    constructor() {
        this.loadWorktreesAndFiles();
    }

    public getDefaultBranch(): string {
        return this.defaultBranch;
    }

    public getComparisonTarget(): string {
        return this.comparisonTarget || `origin/${this.defaultBranch}`;
    }

    public setComparisonTarget(target: string): void {
        this.comparisonTarget = target;
    }

    public getViewMode(): ViewMode {
        return this.viewMode;
    }

    public toggleViewMode(): void {
        this.viewMode = this.viewMode === 'tree' ? 'list' : 'tree';
        this.refresh();
    }

    refresh(): void {
        this.loadWorktreesAndFiles();
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TreeItem): Promise<TreeItem[]> {
        if (!element) {
            return this.worktrees;
        }

        if (element instanceof WorktreeItem) {
            if (this.viewMode === 'list') {
                return this.worktreeFiles.get(element.worktreePath) || [];
            } else {
                return this.worktreeTrees.get(element.worktreePath) || [];
            }
        }

        if (element instanceof FolderItem) {
            return element.children;
        }

        return [];
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
            console.log('[GitDiffProvider] Getting worktree list...');
            const worktreeData = await this.gitOps.getWorktrees(workspaceRoot);
            console.log(`[GitDiffProvider] Found ${worktreeData.length} worktrees`);

            this.worktrees = worktreeData.map(wt => {
                const label = wt.isMain ? wt.branch : (wt.path.split(/[/\\]/).pop() || 'worktree');
                return new WorktreeItem(label, wt.path, wt.branch, wt.isMain);
            });

            this.worktreeFiles.clear();
            this.worktreeTrees.clear();
            for (const wtData of worktreeData) {
                const files = await this.loadFilesForWorktree(wtData.path);
                this.worktreeFiles.set(wtData.path, files);
                const tree = this.treeBuilder.buildDirectoryTree(files, wtData.path);
                this.worktreeTrees.set(wtData.path, tree);
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
            this.defaultBranch = await this.gitOps.detectDefaultBranch(workspaceRoot);
            await this.gitOps.fetchOrigin(workspaceRoot, this.defaultBranch);

            console.log('[GitDiffProvider] Getting local changes...');
            const localChanges = await this.gitOps.getLocalChanges(workspaceRoot);
            console.log(`[GitDiffProvider] Local changes:\n${localChanges || '(empty)'}`);

            console.log('[GitDiffProvider] Getting untracked files...');
            const untrackedFiles = await this.gitOps.getUntrackedFiles(workspaceRoot);
            console.log(`[GitDiffProvider] Untracked files:\n${untrackedFiles.join('\n') || '(empty)'}`);

            const formattedUntracked = untrackedFiles.map(file => `A\t${file}`).join('\n');

            const comparisonTarget = this.getComparisonTarget();
            console.log(`[GitDiffProvider] Getting remote changes vs ${comparisonTarget}...`);
            const remoteChanges = await this.gitOps.getRemoteChanges(workspaceRoot, comparisonTarget);
            console.log(`[GitDiffProvider] Remote changes:\n${remoteChanges || '(empty)'}`);

            const allChanges = (localChanges + '\n' + formattedUntracked + '\n' + remoteChanges).trim();
            const fileMap = new Map<string, { status: string, filePath: string }>();

            allChanges
                .split('\n')
                .filter(line => line.length > 0)
                .forEach(line => {
                    const parts = line.split('\t');
                    const status = parts[0];
                    const filePath = parts[1];

                    if (!fileMap.has(filePath)) {
                        fileMap.set(filePath, { status, filePath });
                    }
                });

            const files = Array.from(fileMap.values())
                .filter(({ status }) => status !== 'D')
                .map(({ status, filePath }) => {
                    const fileName = filePath.split('/').pop() || filePath;
                    const statusText = this.getStatusText(status);
                    const absolutePath = `${workspaceRoot}/${filePath}`.replace(/\\/g, '/');

                    return new DiffFileItem(
                        fileName,
                        filePath,
                        absolutePath,
                        statusText,
                        '',
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
                return 'Modified';
            case 'C':
                return 'Added';
            case 'U':
                return 'Modified';
            default:
                return 'Modified';
        }
    }
}

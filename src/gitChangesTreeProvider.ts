import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from './utils/logger';

export class GitChangeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly resourceUri?: vscode.Uri,
        public readonly status?: _FileStatus,
        public readonly oldPath?: string,
        public readonly isDirectory: boolean = false,
        public readonly state?: _FileState
    ) {
        super(label, collapsibleState);

        if (!isDirectory && status && resourceUri) {
            this.contextValue = 'gitChangeFile';
            this.command = {
                command: 'git-changes.openDiff',
                title: 'Open Diff',
                arguments: [this]
            };
            this.tooltip = this._getTooltip(status, oldPath, state);
        } else if (isDirectory) {
            this.contextValue = 'gitChangeDirectory';
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }

    private _getTooltip(status: _FileStatus, oldPath?: string, state?: _FileState): string {
        const stateStr = state ? ` [${state}]` : '';
        if (status === 'renamed' && oldPath) {
            return `Renamed from ${oldPath}${stateStr}`;
        }
        return status.charAt(0).toUpperCase() + status.slice(1) + stateStr;
    }
}

export class GitChangesTreeProvider implements vscode.TreeDataProvider<GitChangeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<GitChangeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private treeRoot: _TreeNode | null = null;

    constructor(
        private workspaceRoot: string,
        private logger: Logger
    ) {}

    refresh(): void {
        this.treeRoot = null;
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: GitChangeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: GitChangeItem): Promise<GitChangeItem[]> {
        if (!this.treeRoot) {
            await this._buildTree();
        }

        if (!this.treeRoot) {
            return [];
        }

        if (!element) {
            return this._getChildItems(this.treeRoot);
        }

        if (!element.resourceUri) {
            return [];
        }

        const node = this._findNode(this.treeRoot, element.resourceUri.fsPath);
        if (!node) {
            return [];
        }
        return this._getChildItems(node);
    }

    private _getChildItems(node: _TreeNode): GitChangeItem[] {
        const items: GitChangeItem[] = [];

        const sortedChildren = Array.from(node.children.values()).sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        for (const child of sortedChildren) {
            const collapsibleState = child.isDirectory
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None;

            const uri = vscode.Uri.file(child.fullPath);
            const label = child.isDirectory
                ? child.name
                : this._formatLabel(child.name, child.status, child.state);

            items.push(new GitChangeItem(
                label,
                collapsibleState,
                uri,
                child.status,
                child.oldPath,
                child.isDirectory,
                child.state
            ));
        }

        return items;
    }

    private _formatLabel(name: string, status?: _FileStatus, state?: _FileState): string {
        if (!status) {
            return name;
        }
        const statusLetter = this._getStatusLetter(status);
        const stateStr = state ? ` [${state}]` : '';
        return `${statusLetter}${stateStr} ${name}`;
    }

    private _getStatusLetter(status: _FileStatus): string {
        switch (status) {
            case 'added':
                return 'A';
            case 'deleted':
                return 'D';
            case 'modified':
                return 'M';
            case 'renamed':
                return 'R';
        }
    }

    private _findNode(root: _TreeNode, targetPath: string): _TreeNode | null {
        if (root.fullPath === targetPath) {
            return root;
        }

        for (const child of root.children.values()) {
            const found = this._findNode(child, targetPath);
            if (found) {
                return found;
            }
        }

        return null;
    }

    private async _buildTree(): Promise<void> {
        const changes = await this._getGitChanges();

        this.treeRoot = {
            name: '',
            fullPath: this.workspaceRoot,
            isDirectory: true,
            children: new Map()
        };

        for (const change of changes) {
            this._addToTree(change);
        }
    }

    private _addToTree(change: _GitChange): void {
        if (!this.treeRoot) {
            return;
        }
        const parts = change.path.split('/');
        let currentNode = this.treeRoot;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLastPart = i === parts.length - 1;
            const fullPath = path.join(this.workspaceRoot, ...parts.slice(0, i + 1));

            if (!currentNode.children.has(part)) {
                currentNode.children.set(part, {
                    name: part,
                    fullPath,
                    isDirectory: !isLastPart,
                    status: isLastPart ? change.status : undefined,
                    oldPath: isLastPart ? change.oldPath : undefined,
                    state: isLastPart ? change.state : undefined,
                    children: new Map()
                });
            }

            const nextNode = currentNode.children.get(part);
            if (!nextNode) {
                return;
            }
            currentNode = nextNode;
        }
    }

    private async _getGitChanges(): Promise<_GitChange[]> {
        const [originDiff, unstagedChanges, stagedChanges, hasUnpushed] = await Promise.all([
            this._getOriginDiff(),
            this._getUnstagedChanges(),
            this._getStagedChanges(),
            this._hasUnpushedCommits()
        ]);

        const changes: _GitChange[] = [];

        for (const [filePath, parsed] of originDiff) {
            let state: _FileState;
            if (unstagedChanges.has(filePath)) {
                state = 'unstaged';
            } else if (stagedChanges.has(filePath)) {
                state = 'staged';
            } else {
                state = 'unpushed';
            }

            changes.push({
                status: parsed.status,
                path: filePath,
                oldPath: parsed.oldPath,
                state
            });
        }

        this.logger.log(`Found ${changes.length} changed files`);
        return changes;
    }

    private async _getOriginDiff(): Promise<Map<string, { status: _FileStatus; oldPath?: string }>> {
        const { stdout } = await _execAsync(
            'git diff --name-status origin/main',
            { cwd: this.workspaceRoot }
        );

        const changes = new Map<string, { status: _FileStatus; oldPath?: string }>();

        for (const line of stdout.trim().split('\n')) {
            if (!line) {
                continue;
            }

            const parsed = this._parseGitStatusLine(line);
            if (parsed) {
                changes.set(parsed.path, { status: parsed.status, oldPath: parsed.oldPath });
            }
        }

        return changes;
    }

    private async _getUnstagedChanges(): Promise<Map<string, _FileStatus>> {
        const { stdout } = await _execAsync(
            'git diff --name-status',
            { cwd: this.workspaceRoot }
        );

        const changes = new Map<string, _FileStatus>();

        for (const line of stdout.trim().split('\n')) {
            if (!line) {
                continue;
            }

            const parsed = this._parseGitStatusLine(line);
            if (parsed) {
                changes.set(parsed.path, parsed.status);
            }
        }

        return changes;
    }

    private async _getStagedChanges(): Promise<Map<string, _FileStatus>> {
        const { stdout } = await _execAsync(
            'git diff --cached --name-status',
            { cwd: this.workspaceRoot }
        );

        const changes = new Map<string, _FileStatus>();

        for (const line of stdout.trim().split('\n')) {
            if (!line) {
                continue;
            }

            const parsed = this._parseGitStatusLine(line);
            if (parsed) {
                changes.set(parsed.path, parsed.status);
            }
        }

        return changes;
    }

    private async _hasUnpushedCommits(): Promise<boolean> {
        const { stdout } = await _execAsync(
            'git log origin/main..HEAD --oneline',
            { cwd: this.workspaceRoot }
        );

        return stdout.trim().length > 0;
    }

    private _parseGitStatusLine(line: string): { status: _FileStatus; path: string; oldPath?: string } | null {
        const parts = line.split('\t');
        if (parts.length < 2) {
            return null;
        }

        const statusCode = parts[0];
        const filePath = parts[1];

        if (statusCode.startsWith('R')) {
            const oldPath = filePath;
            const newPath = parts[2];
            return {
                status: 'renamed',
                path: newPath,
                oldPath
            };
        }

        let status: _FileStatus;
        switch (statusCode) {
            case 'A':
                status = 'added';
                break;
            case 'D':
                status = 'deleted';
                break;
            case 'M':
                status = 'modified';
                break;
            default:
                this.logger.log(`Unknown status code: ${statusCode}`);
                status = 'modified';
        }

        return { status, path: filePath };
    }
}

const _execAsync = promisify(exec);

type _FileStatus = 'added' | 'deleted' | 'modified' | 'renamed';
type _FileState = 'unstaged' | 'staged' | 'unpushed';

interface _GitChange {
    status: _FileStatus;
    path: string;
    oldPath?: string;
    state: _FileState;
}

interface _TreeNode {
    name: string;
    fullPath: string;
    isDirectory: boolean;
    status?: _FileStatus;
    oldPath?: string;
    state?: _FileState;
    children: Map<string, _TreeNode>;
}

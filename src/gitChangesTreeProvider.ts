import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from './utils/logger';

const execAsync = promisify(exec);

type FileStatus = 'added' | 'deleted' | 'modified' | 'renamed';

interface GitChange {
    status: FileStatus;
    path: string;
    oldPath?: string;
}

interface TreeNode {
    name: string;
    fullPath: string;
    isDirectory: boolean;
    status?: FileStatus;
    oldPath?: string;
    children: Map<string, TreeNode>;
}

export class GitChangeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly resourceUri?: vscode.Uri,
        public readonly status?: FileStatus,
        public readonly oldPath?: string,
        public readonly isDirectory: boolean = false
    ) {
        super(label, collapsibleState);

        if (!isDirectory && status && resourceUri) {
            this.iconPath = this.getStatusIcon(status);
            this.contextValue = 'gitChangeFile';
            this.command = {
                command: 'git-changes.openDiff',
                title: 'Open Diff',
                arguments: [this]
            };
            this.tooltip = this.getTooltip(status, oldPath);
        } else if (isDirectory) {
            this.contextValue = 'gitChangeDirectory';
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }

    private getStatusIcon(status: FileStatus): vscode.ThemeIcon {
        switch (status) {
            case 'added':
                return new vscode.ThemeIcon('diff-added', new vscode.ThemeColor('gitDecoration.addedResourceForeground'));
            case 'deleted':
                return new vscode.ThemeIcon('diff-removed', new vscode.ThemeColor('gitDecoration.deletedResourceForeground'));
            case 'modified':
                return new vscode.ThemeIcon('diff-modified', new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'));
            case 'renamed':
                return new vscode.ThemeIcon('diff-renamed', new vscode.ThemeColor('gitDecoration.renamedResourceForeground'));
        }
    }

    private getTooltip(status: FileStatus, oldPath?: string): string {
        if (status === 'renamed' && oldPath) {
            return `Renamed from ${oldPath}`;
        }
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
}

export class GitChangesTreeProvider implements vscode.TreeDataProvider<GitChangeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<GitChangeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private treeRoot: TreeNode | null = null;

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
        if (!this.workspaceRoot) {
            return [];
        }

        if (!this.treeRoot) {
            await this.buildTree();
        }

        if (!this.treeRoot) {
            return [];
        }

        if (!element) {
            return this.getChildItems(this.treeRoot);
        }

        const node = this.findNode(this.treeRoot, element.resourceUri?.fsPath || '');
        if (!node) {
            return [];
        }

        return this.getChildItems(node);
    }

    private getChildItems(node: TreeNode): GitChangeItem[] {
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

            items.push(new GitChangeItem(
                child.name,
                collapsibleState,
                uri,
                child.status,
                child.oldPath,
                child.isDirectory
            ));
        }

        return items;
    }

    private findNode(root: TreeNode, targetPath: string): TreeNode | null {
        if (root.fullPath === targetPath) {
            return root;
        }

        for (const child of root.children.values()) {
            const found = this.findNode(child, targetPath);
            if (found) {
                return found;
            }
        }

        return null;
    }

    private async buildTree(): Promise<void> {
        const changes = await this.getGitChanges();

        this.treeRoot = {
            name: '',
            fullPath: this.workspaceRoot,
            isDirectory: true,
            children: new Map()
        };

        for (const change of changes) {
            this.addToTree(change);
        }
    }

    private addToTree(change: GitChange): void {
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
                    children: new Map()
                });
            }

            const nextNode = currentNode.children.get(part);
            if (nextNode) {
                currentNode = nextNode;
            }
        }
    }

    private async getGitChanges(): Promise<GitChange[]> {
        try {
            const { stdout } = await execAsync(
                'git diff --name-status origin/main',
                { cwd: this.workspaceRoot }
            );

            const changes: GitChange[] = [];

            for (const line of stdout.trim().split('\n')) {
                if (!line) {
                    continue;
                }

                const parsed = this.parseGitStatusLine(line);
                if (parsed) {
                    changes.push(parsed);
                }
            }

            this.logger.log(`Found ${changes.length} changed files`);
            return changes;
        } catch (error) {
            this.logger.log(`Error getting git changes: ${error}`);
            return [];
        }
    }

    private parseGitStatusLine(line: string): GitChange | null {
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

        let status: FileStatus;
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

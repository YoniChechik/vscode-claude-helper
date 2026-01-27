import * as vscode from 'vscode';
import * as path from 'path';

export class GitWatcher implements vscode.Disposable {
    private debounceTimer: NodeJS.Timeout | undefined;
    private readonly debounceMs = 300;
    private readonly disposables: vscode.Disposable[] = [];

    constructor(
        private workspaceRoot: string,
        private onRefresh: () => void
    ) {}

    start(): void {
        const gitDir = path.join(this.workspaceRoot, '.git');

        const patterns = [
            new vscode.RelativePattern(gitDir, 'index'),
            new vscode.RelativePattern(gitDir, 'HEAD'),
            new vscode.RelativePattern(gitDir, 'refs/**/*'),
            new vscode.RelativePattern(gitDir, 'FETCH_HEAD'),
            new vscode.RelativePattern(gitDir, 'ORIG_HEAD')
        ];

        for (const pattern of patterns) {
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);
            watcher.onDidChange(() => this._debouncedRefresh());
            watcher.onDidCreate(() => this._debouncedRefresh());
            watcher.onDidDelete(() => this._debouncedRefresh());
            this.disposables.push(watcher);
        }

        const workspaceWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(this.workspaceRoot, '{*,**/{src,lib,test,tests}/**/*}'),
            false,
            false,
            false
        );
        workspaceWatcher.onDidChange(() => this._debouncedRefresh());
        workspaceWatcher.onDidCreate(() => this._debouncedRefresh());
        workspaceWatcher.onDidDelete(() => this._debouncedRefresh());
        this.disposables.push(workspaceWatcher);
    }

    private _debouncedRefresh(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.onRefresh();
        }, this.debounceMs);
    }

    dispose(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}

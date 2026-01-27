import * as vscode from 'vscode';
import * as path from 'path';

export class GitWatcher {
    private debounceTimer: NodeJS.Timeout | undefined;
    private readonly debounceMs = 300;

    constructor(
        private workspaceRoot: string,
        private onRefresh: () => void
    ) {}

    start(): vscode.Disposable[] {
        const gitDir = path.join(this.workspaceRoot, '.git');

        const patterns = [
            new vscode.RelativePattern(gitDir, 'index'),
            new vscode.RelativePattern(gitDir, 'HEAD'),
            new vscode.RelativePattern(gitDir, 'refs/**/*'),
            new vscode.RelativePattern(gitDir, 'FETCH_HEAD'),
            new vscode.RelativePattern(gitDir, 'ORIG_HEAD')
        ];

        const disposables: vscode.Disposable[] = [];

        for (const pattern of patterns) {
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);
            watcher.onDidChange(() => this._debouncedRefresh());
            watcher.onDidCreate(() => this._debouncedRefresh());
            watcher.onDidDelete(() => this._debouncedRefresh());
            disposables.push(watcher);
        }

        const workspaceWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(this.workspaceRoot, '**/*')
        );
        workspaceWatcher.onDidChange(() => this._debouncedRefresh());
        workspaceWatcher.onDidCreate(() => this._debouncedRefresh());
        workspaceWatcher.onDidDelete(() => this._debouncedRefresh());
        disposables.push(workspaceWatcher);

        return disposables;
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
    }
}

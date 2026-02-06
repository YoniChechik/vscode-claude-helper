import * as vscode from 'vscode';

export type FileStatus = 'added' | 'deleted' | 'modified' | 'renamed';

export class GitFileDecorationProvider implements vscode.FileDecorationProvider {
    private _decorations = new Map<string, FileStatus>();
    private _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

    provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
        if (uri.scheme !== 'git-changes-tree') {
            return undefined;
        }

        const status = this._decorations.get(uri.toString());
        if (!status) {
            return undefined;
        }

        return new vscode.FileDecoration(
            undefined,
            undefined,
            new vscode.ThemeColor(STATUS_TO_COLOR[status])
        );
    }

    updateDecorations(entries: Map<string, FileStatus>): void {
        this._decorations = entries;
        this._onDidChangeFileDecorations.fire(undefined);
    }
}

export const STATUS_TO_COLOR: Record<FileStatus, string> = {
    added: 'gitDecoration.addedResourceForeground',
    deleted: 'gitDecoration.deletedResourceForeground',
    modified: 'gitDecoration.modifiedResourceForeground',
    renamed: 'gitDecoration.renamedResourceForeground',
};

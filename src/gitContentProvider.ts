import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GitContentProvider implements vscode.TextDocumentContentProvider {
    constructor(private workspaceRoot: string) {}

    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        const filePath = uri.path;
        const ref = new URLSearchParams(uri.query).get('ref') || 'origin/main';

        const { stdout } = await execAsync(
            `git show "${ref}:${filePath}"`,
            { cwd: this.workspaceRoot, maxBuffer: 10 * 1024 * 1024 }
        );
        return stdout;
    }
}

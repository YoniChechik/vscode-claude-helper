import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class GitContentProvider implements vscode.TextDocumentContentProvider {
    constructor(private workspaceRoot: string) {}

    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        const filePath = uri.path;
        const ref = new URLSearchParams(uri.query).get('ref');
        if (!ref) {
            throw new Error('Missing ref parameter in URI query');
        }

        const { stdout } = await execFileAsync(
            'git',
            ['show', `${ref}:${filePath}`],
            { cwd: this.workspaceRoot, maxBuffer: 10 * 1024 * 1024 }
        );
        return stdout;
    }
}

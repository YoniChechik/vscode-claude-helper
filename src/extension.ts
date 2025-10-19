import * as vscode from 'vscode';
import { GitDiffProvider, DiffFileItem } from './gitDiffProvider';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Git Diff Viewer');
    outputChannel.appendLine('Git Diff Viewer extension activated');

    const gitDiffProvider = new GitDiffProvider();

    vscode.window.registerTreeDataProvider('gitDiffExplorer', gitDiffProvider);

    vscode.commands.registerCommand('gitDiffExplorer.refresh', () => {
        outputChannel.appendLine('Refresh command triggered');
        gitDiffProvider.refresh();
    });

    vscode.commands.registerCommand('gitDiffExplorer.openDiff', async (item: DiffFileItem) => {
        outputChannel.appendLine('=== Open Diff Command ===');
        outputChannel.appendLine(`Item label: ${item?.label}, path: ${item?.relativePath}`);

        if (!item) {
            outputChannel.appendLine('ERROR: No item provided');
            return;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            outputChannel.appendLine('ERROR: No workspace folder open');
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }
        outputChannel.appendLine(`Workspace root: ${workspaceFolders[0].uri.fsPath}`);

        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) {
            outputChannel.appendLine('ERROR: Git extension not found');
            vscode.window.showErrorMessage('Git extension not found');
            return;
        }
        outputChannel.appendLine('Git extension found');

        const git = gitExtension.exports.getAPI(1);
        const repo = git.repositories[0];
        if (!repo) {
            outputChannel.appendLine('ERROR: No git repository found');
            vscode.window.showErrorMessage('No git repository found');
            return;
        }
        outputChannel.appendLine(`Git repository: ${repo.rootUri.fsPath}`);

        const workspaceRoot = workspaceFolders[0].uri;
        const title = `${item.label} (HEAD ↔ origin/main)`;

        try {
            const fileUri = vscode.Uri.joinPath(workspaceRoot, item.relativePath);
            outputChannel.appendLine(`File URI: ${fileUri.toString()}`);

            const leftUri = fileUri.with({
                scheme: 'git',
                path: fileUri.path,
                query: `ref=origin/main`
            });
            const rightUri = fileUri.with({
                scheme: 'git',
                path: fileUri.path,
                query: `ref=HEAD`
            });

            outputChannel.appendLine(`Left URI: ${leftUri.toString()}`);
            outputChannel.appendLine(`Right URI: ${rightUri.toString()}`);
            outputChannel.appendLine(`Title: ${title}`);

            // Use VS Code's built-in git diff
            await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
            outputChannel.appendLine('Diff command executed successfully');
        } catch (error) {
            outputChannel.appendLine(`ERROR: ${error}`);
            vscode.window.showErrorMessage(`Failed to open diff: ${error}`);
        }
    });

    outputChannel.appendLine('All commands registered');
}

export function deactivate() {}

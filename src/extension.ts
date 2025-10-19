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
        outputChannel.appendLine('=================================================');
        outputChannel.appendLine('=== Open Diff Command TRIGGERED ===');
        outputChannel.appendLine('=================================================');
        outputChannel.show(); // Force show the output channel

        outputChannel.appendLine(`[DEBUG] Item received: ${JSON.stringify({
            label: item?.label,
            relativePath: item?.relativePath,
            status: item?.status,
            tooltip: item?.tooltip,
            description: item?.description
        }, null, 2)}`);

        if (!item) {
            outputChannel.appendLine('[ERROR] No item provided');
            return;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            outputChannel.appendLine('[ERROR] No workspace folder open');
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri;
        outputChannel.appendLine(`[DEBUG] Workspace root: ${workspaceRoot.fsPath}`);

        const fileUri = vscode.Uri.joinPath(workspaceRoot, item.relativePath);
        outputChannel.appendLine(`[DEBUG] File URI constructed: ${fileUri.toString()}`);
        outputChannel.appendLine(`[DEBUG] File URI fsPath: ${fileUri.fsPath}`);

        const defaultBranch = gitDiffProvider.getDefaultBranch();
        outputChannel.appendLine(`[DEBUG] Default branch: ${defaultBranch}`);

        outputChannel.appendLine(`[DEBUG] Checking status: "${item.status}"`);
        outputChannel.appendLine(`[DEBUG] Status length: ${item.status.length}`);
        outputChannel.appendLine(`[DEBUG] Status char codes: ${Array.from(item.status).map(c => c.charCodeAt(0)).join(', ')}`);

        try {
            // For Added (untracked) files, just open the file
            if (item.status === 'Added') {
                outputChannel.appendLine('[BRANCH] Status is "Added" - opening file directly');
                await vscode.commands.executeCommand('vscode.open', fileUri);
                outputChannel.appendLine('[SUCCESS] File opened successfully');
                return;
            } else {
                outputChannel.appendLine(`[BRANCH] Status is NOT "Added" (it is "${item.status}")`);
            }

            // For Deleted files, show the HEAD version
            if (item.status === 'Deleted') {
                outputChannel.appendLine('[BRANCH] Status is "Deleted" - opening from HEAD');
                const headUri = vscode.Uri.file(fileUri.fsPath).with({
                    scheme: 'git',
                    query: 'HEAD'
                });
                outputChannel.appendLine(`[DEBUG] Head URI: ${headUri.toString()}`);
                await vscode.commands.executeCommand('vscode.open', headUri);
                outputChannel.appendLine('[SUCCESS] Deleted file opened successfully');
                return;
            } else {
                outputChannel.appendLine(`[BRANCH] Status is NOT "Deleted" (it is "${item.status}")`);
            }

            // For Modified files, show diff
            outputChannel.appendLine('[BRANCH] Assuming Modified - opening diff');
            const title = `${item.label} (HEAD ↔ Working Tree)`;

            // Get the Git extension to access repositories
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (!gitExtension) {
                outputChannel.appendLine('[ERROR] Git extension not found');
                vscode.window.showErrorMessage('Git extension not found');
                return;
            }

            await gitExtension.activate();
            const git = gitExtension.exports.getAPI(1);
            const repo = git.repositories[0];

            if (!repo) {
                outputChannel.appendLine('[ERROR] No git repository found');
                vscode.window.showErrorMessage('No git repository found');
                return;
            }

            outputChannel.appendLine(`[DEBUG] Git repo URI: ${repo.rootUri.toString()}`);
            outputChannel.appendLine(`[DEBUG] Platform: ${process.platform}`);

            // Use Git API's toGitUri method for cross-platform compatibility
            // This method is available in the Git extension API and handles platform differences
            let headUri: vscode.Uri;

            try {
                // Method 1: Try using the repository's toGitUri if available
                if (typeof repo.toGitUri === 'function') {
                    outputChannel.appendLine('[DEBUG] Using repo.toGitUri method');
                    headUri = await repo.toGitUri(fileUri, 'HEAD');
                } else {
                    outputChannel.appendLine('[DEBUG] repo.toGitUri not available, using manual URI construction');
                    // Method 2: Construct git URI manually with proper cross-platform path handling
                    // Use forward slashes for the path (works on all platforms)
                    const relativePath = fileUri.fsPath.replace(workspaceRoot.fsPath, '').replace(/\\/g, '/');
                    outputChannel.appendLine(`[DEBUG] Relative path: ${relativePath}`);

                    headUri = fileUri.with({
                        scheme: 'git',
                        path: fileUri.path,
                        query: JSON.stringify({
                            path: fileUri.fsPath,
                            ref: 'HEAD'
                        })
                    });
                }
            } catch (error) {
                outputChannel.appendLine(`[ERROR] Failed to create git URI: ${error}`);
                throw error;
            }

            outputChannel.appendLine(`[DEBUG] Creating diff with:`);
            outputChannel.appendLine(`  Left (HEAD): ${headUri.toString()}`);
            outputChannel.appendLine(`  Left fsPath: ${headUri.fsPath}`);
            outputChannel.appendLine(`  Left scheme: ${headUri.scheme}`);
            outputChannel.appendLine(`  Left query: ${headUri.query}`);
            outputChannel.appendLine(`  Left path: ${headUri.path}`);
            outputChannel.appendLine(`  Right (Working): ${fileUri.toString()}`);
            outputChannel.appendLine(`  Right fsPath: ${fileUri.fsPath}`);
            outputChannel.appendLine(`  Right scheme: ${fileUri.scheme}`);
            outputChannel.appendLine(`  Title: ${title}`);

            outputChannel.appendLine('[DEBUG] Executing vscode.diff command...');
            await vscode.commands.executeCommand('vscode.diff', headUri, fileUri, title);
            outputChannel.appendLine('[SUCCESS] Diff command executed successfully');
        } catch (error) {
            outputChannel.appendLine('[ERROR] ===================');
            outputChannel.appendLine(`[ERROR] ${error}`);
            outputChannel.appendLine(`[ERROR] Stack: ${error instanceof Error ? error.stack : 'N/A'}`);
            outputChannel.appendLine('[ERROR] ===================');
            vscode.window.showErrorMessage(`Failed to open diff: ${error}`);
        }
    });

    outputChannel.appendLine('All commands registered');
}

export function deactivate() {}

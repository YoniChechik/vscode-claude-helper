import * as vscode from 'vscode';
import { GitDiffProvider, DiffFileItem } from './gitDiffProvider';
import { GitOperations } from './gitOperations';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const gitOps = new GitOperations();

let outputChannel: vscode.OutputChannel;
let autoRefreshTimer: NodeJS.Timeout | undefined;

// Empty file content provider for showing diffs against empty files
class EmptyFileContentProvider implements vscode.TextDocumentContentProvider {
    provideTextDocumentContent(_uri: vscode.Uri): string {
        return ''; // Always return empty content
    }
}

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Git Diff Viewer');
    outputChannel.appendLine('Git Diff Viewer extension activated');

    // Register empty file content provider
    const emptyContentProvider = new EmptyFileContentProvider();
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider('empty', emptyContentProvider)
    );
    outputChannel.appendLine('Empty content provider registered');

    const gitDiffProvider = new GitDiffProvider();

    vscode.window.registerTreeDataProvider('gitDiffExplorer', gitDiffProvider);

    vscode.commands.registerCommand('gitDiffExplorer.refresh', () => {
        outputChannel.appendLine('Refresh command triggered (manual)');
        gitDiffProvider.refresh();
    });

    vscode.commands.registerCommand('gitDiffExplorer.toggleViewMode', () => {
        gitDiffProvider.toggleViewMode();
        const newMode = gitDiffProvider.getViewMode();
        outputChannel.appendLine(`View mode toggled to: ${newMode}`);
        vscode.window.showInformationMessage(`View mode: ${newMode === 'tree' ? 'Tree' : 'List'}`);
    });

    // Auto-refresh every 1 second
    outputChannel.appendLine('Starting auto-refresh timer (1 second interval)');
    autoRefreshTimer = setInterval(() => {
        gitDiffProvider.refresh();
    }, 1000);
    outputChannel.appendLine('Auto-refresh timer started');

    vscode.commands.registerCommand('gitDiffExplorer.openDiff', async (item: DiffFileItem) => {
        outputChannel.appendLine('=================================================');
        outputChannel.appendLine('=== Open Diff Command TRIGGERED ===');
        outputChannel.appendLine('=================================================');
        outputChannel.show();

        outputChannel.appendLine(`Item: ${item.label}`);
        outputChannel.appendLine(`Status: ${item.status}`);
        outputChannel.appendLine(`Path: ${item.relativePath}`);
        outputChannel.appendLine(`Git state: ${item.gitState}`);

        if (!item) {
            const error = 'ERROR: No item provided';
            outputChannel.appendLine(error);
            vscode.window.showErrorMessage(error);
            throw new Error(error);
        }

        const fileUri = vscode.Uri.file(item.absolutePath);
        const comparisonTarget = gitDiffProvider.getComparisonTarget();
        outputChannel.appendLine(`Comparison target: ${comparisonTarget}`);

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            const error = 'ERROR: No workspace folder open';
            outputChannel.appendLine(error);
            vscode.window.showErrorMessage(error);
            throw new Error(error);
        }

        // ADDED FILES: Show diff from empty to working tree
        if (item.status === 'Added') {
            outputChannel.appendLine('Opening ADDED file diff: empty → working tree');

            const emptyUri = fileUri.with({ scheme: 'empty' });
            const title = `${item.label} (New ↔ Working Tree)`;

            outputChannel.appendLine(`  Left: ${emptyUri.toString()}`);
            outputChannel.appendLine(`  Right: ${fileUri.toString()}`);

            await vscode.commands.executeCommand('vscode.diff', emptyUri, fileUri, title);
            outputChannel.appendLine('SUCCESS');
            return;
        }

        // DELETED FILES: Show diff from HEAD to empty
        if (item.status === 'Deleted') {
            outputChannel.appendLine('Opening DELETED file diff: HEAD → empty');
            outputChannel.appendLine(`Running: git show HEAD:"${item.relativePath}"`);

            const { stdout } = await execAsync(`git show HEAD:"${item.relativePath}"`, {
                cwd: workspaceFolders[0].uri.fsPath
            });

            outputChannel.appendLine(`Git show succeeded, bytes: ${stdout.length}`);

            const ext = item.relativePath.split('.').pop()?.toLowerCase();
            const languageMap: { [key: string]: string } = {
                'js': 'javascript', 'ts': 'typescript', 'json': 'json',
                'md': 'markdown', 'py': 'python', 'html': 'html',
                'css': 'css', 'bat': 'bat', 'sh': 'shellscript'
            };
            const language = languageMap[ext || ''] || 'plaintext';

            const tempDoc = await vscode.workspace.openTextDocument({
                content: stdout,
                language: language
            });

            const emptyUri = fileUri.with({ scheme: 'empty' });
            const title = `${item.label} (HEAD ↔ Deleted)`;

            outputChannel.appendLine(`  Left: ${tempDoc.uri.toString()}`);
            outputChannel.appendLine(`  Right: ${emptyUri.toString()}`);

            await vscode.commands.executeCommand('vscode.diff', tempDoc.uri, emptyUri, title);
            outputChannel.appendLine('SUCCESS');
            return;
        }

        // MODIFIED FILES: Check if file exists in comparison target first
        outputChannel.appendLine(`Opening MODIFIED file diff: checking if exists in ${comparisonTarget}...`);

        let fileExistsInTarget = false;
        try {
            await execAsync(`git cat-file -e ${comparisonTarget}:"${item.relativePath}"`, {
                cwd: workspaceFolders[0].uri.fsPath
            });
            fileExistsInTarget = true;
            outputChannel.appendLine(`File EXISTS in ${comparisonTarget} → showing normal diff`);
        } catch (checkError) {
            fileExistsInTarget = false;
            outputChannel.appendLine(`File DOES NOT EXIST in ${comparisonTarget} → treating as new file`);
        }

        if (fileExistsInTarget) {
            // File exists in comparison target - show normal diff
            const originUri = fileUri.with({
                scheme: 'git',
                path: fileUri.path,
                query: JSON.stringify({
                    path: fileUri.fsPath,
                    ref: comparisonTarget
                })
            });

            const title = `${item.label} (${comparisonTarget} ↔ Working Tree)`;

            outputChannel.appendLine(`  Left: ${originUri.toString()}`);
            outputChannel.appendLine(`  Right: ${fileUri.toString()}`);

            await vscode.commands.executeCommand('vscode.diff', originUri, fileUri, title);
            outputChannel.appendLine('SUCCESS');
        } else {
            // File doesn't exist in comparison target - show as new file (empty → working tree)
            const emptyUri = fileUri.with({ scheme: 'empty' });
            const title = `${item.label} (New file ↔ Working Tree)`;

            outputChannel.appendLine(`  Left: ${emptyUri.toString()}`);
            outputChannel.appendLine(`  Right: ${fileUri.toString()}`);

            await vscode.commands.executeCommand('vscode.diff', emptyUri, fileUri, title);
            outputChannel.appendLine('SUCCESS (shown as new file)');
        }
    });

    vscode.commands.registerCommand('gitDiffExplorer.changeComparisonTarget', async () => {
        outputChannel.appendLine('Change comparison target command triggered');

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;

        interface RefPickItem extends vscode.QuickPickItem {
            ref: string;
            type: 'working-tree' | 'head' | 'local' | 'remote' | 'tag' | 'worktree-head';
            worktreePath?: string;
        }

        // STAGE 1: Choose SOURCE
        outputChannel.appendLine('STAGE 1: Choose source');

        const sourceItems: RefPickItem[] = [];

        // Add Working Tree option
        sourceItems.push({
            label: '$(file-directory) Working Tree',
            description: 'Current uncommitted changes',
            ref: 'WORKING_TREE',
            type: 'working-tree'
        });

        // Add HEAD option
        sourceItems.push({
            label: '$(git-commit) HEAD',
            description: 'Current commit',
            ref: 'HEAD',
            type: 'head'
        });

        // Get all worktrees and add their HEADs
        try {
            const worktrees = await gitOps.getWorktrees(workspaceRoot);
            for (const wt of worktrees) {
                if (!wt.isMain) {
                    const wtName = wt.path.split(/[/\\]/).pop() || 'worktree';
                    sourceItems.push({
                        label: `$(git-branch) ${wtName} HEAD`,
                        description: `Worktree: ${wt.branch}`,
                        ref: 'HEAD',
                        type: 'worktree-head',
                        worktreePath: wt.path
                    });
                }
            }
        } catch (error) {
            outputChannel.appendLine(`Could not load worktrees: ${error}`);
        }

        const source = await vscode.window.showQuickPick(sourceItems, {
            placeHolder: 'Select source (what to compare FROM)',
            title: 'Step 1/2: Choose Source'
        });

        if (!source) {
            return; // User cancelled
        }

        outputChannel.appendLine(`Selected source: ${source.label}`);

        // STAGE 2: Choose TARGET
        outputChannel.appendLine('STAGE 2: Choose target');

        const targetItems: RefPickItem[] = [];

        const branches = await gitOps.getAllBranches(workspaceRoot);

        branches.remote.forEach(branch => {
            targetItems.push({
                label: `$(cloud) ${branch}`,
                description: 'remote branch',
                ref: branch,
                type: 'remote'
            });
        });

        branches.local.forEach(branch => {
            targetItems.push({
                label: `$(git-branch) ${branch}`,
                description: 'local branch',
                ref: branch,
                type: 'local'
            });
        });

        const tags = await gitOps.getAllTags(workspaceRoot);
        tags.forEach(tag => {
            targetItems.push({
                label: `$(tag) ${tag}`,
                description: 'tag',
                ref: tag,
                type: 'tag'
            });
        });

        const target = await vscode.window.showQuickPick(targetItems, {
            placeHolder: 'Select target (what to compare TO)',
            title: 'Step 2/2: Choose Target'
        });

        if (!target) {
            return; // User cancelled
        }

        outputChannel.appendLine(`Selected target: ${target.label}`);

        // Set comparison target (always the target for now, source is assumed to be HEAD/working tree)
        gitDiffProvider.setComparisonTarget(target.ref);
        gitDiffProvider.refresh();

        const message = `Now comparing: ${source.label} → ${target.label}`;
        outputChannel.appendLine(message);
        vscode.window.showInformationMessage(message);
    });

    outputChannel.appendLine('All commands registered');
}

export function deactivate() {
    // Extension cleanup on deactivation
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = undefined;
        outputChannel.appendLine('Auto-refresh timer stopped');
    }
}

import * as vscode from 'vscode';
import * as path from 'path';
import { GitChangesTreeProvider, GitChangeItem } from './gitChangesTreeProvider';
import { GitWatcher } from './gitWatcher';
import { GitContentProvider } from './gitContentProvider';
import { GitFileDecorationProvider } from './gitFileDecorationProvider';
import { Logger } from './utils/logger';

let logger: Logger;

export async function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('Git Changes');
    context.subscriptions.push(outputChannel);
    logger = new Logger(outputChannel);

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        logger.log('No workspace folder found');
        return;
    }

    logger.log('Git Changes extension activated');

    context.subscriptions.push(
        vscode.commands.registerCommand('git-changes.showLogs', () => {
            outputChannel.show();
        })
    );

    const gitContentProvider = new GitContentProvider(workspaceRoot);
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider('git-changes', gitContentProvider)
    );

    const decorationProvider = new GitFileDecorationProvider();
    context.subscriptions.push(
        vscode.window.registerFileDecorationProvider(decorationProvider)
    );

    const treeProvider = new GitChangesTreeProvider(workspaceRoot, logger);
    treeProvider.onTreeBuilt = (statuses) => decorationProvider.updateDecorations(statuses);

    const treeView = vscode.window.createTreeView('gitChangesView', {
        treeDataProvider: treeProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);

    context.subscriptions.push(
        vscode.commands.registerCommand('git-changes.refresh', () => {
            logger.log('Manual refresh triggered');
            treeProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('git-changes.openDiff', async (item: GitChangeItem) => {
            await _openDiff(item, workspaceRoot);
        })
    );

    const gitWatcher = new GitWatcher(workspaceRoot, () => treeProvider.refresh());
    gitWatcher.start();
    context.subscriptions.push(gitWatcher);

    treeProvider.refresh();
}

async function _openDiff(item: GitChangeItem, workspaceRoot: string): Promise<void> {
    if (!item.resourceUri) {
        return;
    }

    const filePath = item.resourceUri.scheme === 'git-changes-tree'
        ? item.resourceUri.path
        : item.resourceUri.fsPath;
    const relativePath = path.relative(workspaceRoot, filePath);
    const fileUri = vscode.Uri.file(filePath);

    switch (item.status) {
        case 'modified': {
            const leftUri = vscode.Uri.parse(`git-changes:${relativePath}?ref=origin/main`);
            await vscode.commands.executeCommand(
                'vscode.diff',
                leftUri,
                fileUri,
                `${relativePath} (origin/main <-> Working Tree)`
            );
            break;
        }
        case 'added': {
            await vscode.commands.executeCommand('vscode.open', fileUri);
            break;
        }
        case 'deleted': {
            const leftUri = vscode.Uri.parse(`git-changes:${relativePath}?ref=origin/main`);
            await vscode.commands.executeCommand('vscode.open', leftUri);
            break;
        }
        case 'renamed': {
            const oldPath = item.oldPath || relativePath;
            const leftUri = vscode.Uri.parse(`git-changes:${oldPath}?ref=origin/main`);
            await vscode.commands.executeCommand(
                'vscode.diff',
                leftUri,
                fileUri,
                `${oldPath} -> ${relativePath}`
            );
            break;
        }
    }
}

export function deactivate(): void {
    // Extension cleanup handled by VS Code via subscriptions
}

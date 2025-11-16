import * as vscode from 'vscode';
import * as path from 'path';
import { CliResult } from './registry';
import { createSuccessResult, createErrorResult, handleCommandError } from '../utils/results';

export async function executeCompareReferences(
    args: string[],
    logger?: (msg: string) => void
): Promise<CliResult> {
    if (args.length < 2) {
        return createErrorResult('compareReferences requires 2-3 arguments: <ref1> <ref2> [submodule_path]');
    }

    const [ref1, ref2, submodulePath] = args;

    logger?.(`compareReferences: ref1="${ref1}", ref2="${ref2}", submodule="${submodulePath || 'main'}"`);

    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return createErrorResult('No workspace folder found');
        }

        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        const git = gitExtension?.getAPI(1);

        if (!git || git.repositories.length === 0) {
            return createErrorResult('No Git repository found');
        }

        // Find target repository (main or submodule)
        const targetRepo = submodulePath
            ? findSubmoduleRepository(git, workspaceFolder, submodulePath, logger)
            : git.repositories[0];

        if (!targetRepo) {
            return createErrorResult(`Submodule not found: ${submodulePath}. Ensure it's initialized.`);
        }

        logger?.(`Using repository: ${targetRepo.rootUri.fsPath}`);

        // Clear previous comparisons from GitLens Search & Compare view
        logger?.('Clearing previous comparisons...');
        await vscode.commands.executeCommand('gitlens.views.searchAndCompare.clear');

        // Set GitLens context by opening a file from the target repository
        await setRepositoryContext(targetRepo, logger);

        // Execute appropriate GitLens comparison command
        const isWorkingTreeComparison = !ref1 || !ref2;
        const refToCompare = ref1 || ref2;
        const repoLabel = submodulePath ? ` in submodule ${submodulePath}` : '';

        if (isWorkingTreeComparison) {
            logger?.(`Calling gitlens.compareWorkingWith: ${refToCompare}`);

            await vscode.commands.executeCommand('gitlens.compareWorkingWith', {
                ref2: refToCompare
            });

            return createSuccessResult(`Opened GitLens comparison: working tree ↔ ${refToCompare}${repoLabel}`);
        } else {
            logger?.(`Calling gitlens.compareWith: ${ref1} ↔ ${ref2}`);

            await vscode.commands.executeCommand('gitlens.compareWith', {
                ref1: ref1,
                ref2: ref2
            });

            return createSuccessResult(`Opened GitLens comparison: ${ref1} ↔ ${ref2}${repoLabel}`);
        }

    } catch (error) {
        return handleCommandError(error);
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

function findSubmoduleRepository(
    git: any,
    workspaceFolder: vscode.WorkspaceFolder,
    submodulePath: string,
    logger?: (msg: string) => void
): any {
    const submoduleFullPath = path.join(workspaceFolder.uri.fsPath, submodulePath);
    logger?.(`Looking for submodule at: ${submoduleFullPath}`);

    const repo = git.repositories.find((r: any) => r.rootUri.fsPath === submoduleFullPath);

    if (!repo) {
        logger?.(`Available repositories: ${git.repositories.map((r: any) => r.rootUri.fsPath).join(', ')}`);
    }

    return repo;
}

async function setRepositoryContext(
    targetRepo: any,
    logger?: (msg: string) => void
): Promise<void> {
    // Find a suitable file to open (prefer text files)
    const files = await vscode.workspace.fs.readDirectory(targetRepo.rootUri);
    const textFile = files.find(([name, type]) =>
        type === vscode.FileType.File &&
        (name.endsWith('.md') || name.endsWith('.txt') || name === 'README' || name === '.gitmodules')
    );

    if (textFile) {
        const fileUri = vscode.Uri.joinPath(targetRepo.rootUri, textFile[0]);
        logger?.(`Opening ${textFile[0]} to set context`);

        await vscode.window.showTextDocument(fileUri, {
            preview: false,
            preserveFocus: false
        });

        // Allow time for GitLens to recognize the context
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

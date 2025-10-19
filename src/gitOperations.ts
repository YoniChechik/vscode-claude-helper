import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface WorktreeInfo {
    path: string;
    branch: string;
    isMain: boolean;
}

export interface FileChange {
    status: string;
    filePath: string;
}

export class GitOperations {
    private defaultBranch: string = 'main';

    async detectDefaultBranch(cwd: string): Promise<string> {
        try {
            const { stdout } = await execAsync('git symbolic-ref refs/remotes/origin/HEAD', { cwd });
            this.defaultBranch = stdout.trim().split('/').pop() || 'main';
        } catch {
            try {
                await execAsync('git rev-parse --verify origin/master', { cwd });
                this.defaultBranch = 'master';
            } catch {
                this.defaultBranch = 'main';
            }
        }
        return this.defaultBranch;
    }

    async fetchOrigin(cwd: string, branch: string): Promise<void> {
        try {
            await execAsync(`git fetch origin ${branch}`, { cwd });
        } catch (error) {
            console.error(`Failed to fetch origin/${branch}:`, error);
        }
    }

    async getWorktrees(cwd: string): Promise<WorktreeInfo[]> {
        const { stdout } = await execAsync('git worktree list --porcelain', { cwd });
        const lines = stdout.trim().split('\n');
        const worktrees: WorktreeInfo[] = [];
        let currentWorktree: Partial<WorktreeInfo> = {};

        for (const line of lines) {
            if (line.startsWith('worktree ')) {
                if (currentWorktree.path) {
                    worktrees.push(currentWorktree as WorktreeInfo);
                }
                currentWorktree = { path: line.substring(9), isMain: false };
            } else if (line.startsWith('branch ')) {
                const fullBranch = line.substring(7);
                currentWorktree.branch = fullBranch.split('/').pop() || 'unknown';
            } else if (line.startsWith('HEAD ')) {
                currentWorktree.branch = line.substring(5).substring(0, 7);
            }
        }

        if (currentWorktree.path) {
            worktrees.push(currentWorktree as WorktreeInfo);
        }

        if (worktrees.length > 0) {
            worktrees[0].isMain = true;
        }

        return worktrees;
    }

    async getCurrentBranch(cwd: string): Promise<string> {
        try {
            const { stdout } = await execAsync('git branch --show-current', { cwd });
            return stdout.trim() || 'detached';
        } catch {
            return 'unknown';
        }
    }

    async getLocalChanges(cwd: string): Promise<string> {
        const { stdout } = await execAsync('git diff --name-status HEAD', { cwd });
        return stdout;
    }

    async getUntrackedFiles(cwd: string): Promise<string[]> {
        const { stdout } = await execAsync('git ls-files --others --exclude-standard', { cwd });
        return stdout.trim().split('\n').filter(line => line.length > 0);
    }

    async getRemoteChanges(cwd: string, comparisonTarget: string): Promise<string> {
        const { stdout } = await execAsync(`git diff --name-status HEAD ${comparisonTarget}`, { cwd });
        return stdout;
    }

    async fileExistsInRef(cwd: string, ref: string, filePath: string): Promise<boolean> {
        try {
            await execAsync(`git cat-file -e ${ref}:"${filePath}"`, { cwd });
            return true;
        } catch {
            return false;
        }
    }

    async getFileContentFromRef(cwd: string, ref: string, filePath: string): Promise<string> {
        const { stdout } = await execAsync(`git show ${ref}:"${filePath}"`, { cwd });
        return stdout;
    }

    async getAllBranches(cwd: string): Promise<{ remote: string[]; local: string[] }> {
        const { stdout: remoteBranches } = await execAsync('git branch -r --format=%(refname:short)', { cwd });
        const { stdout: localBranches } = await execAsync('git branch --format=%(refname:short)', { cwd });

        return {
            remote: remoteBranches.trim().split('\n').filter(b => b.length > 0),
            local: localBranches.trim().split('\n').filter(b => b.length > 0)
        };
    }

    async getAllTags(cwd: string): Promise<string[]> {
        const { stdout } = await execAsync('git tag', { cwd });
        return stdout.trim().split('\n').filter(tag => tag.length > 0);
    }
}

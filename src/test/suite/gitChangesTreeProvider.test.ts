import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { GitChangesTreeProvider, GitChangeItem } from '../../gitChangesTreeProvider';
import { Logger } from '../../utils/logger';

suite('GitChangesTreeProvider Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockLogger: sinon.SinonStubbedInstance<Logger>;

    setup(() => {
        sandbox = sinon.createSandbox();
        mockLogger = sandbox.createStubInstance(Logger);
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('GitChangeItem', () => {
        test('should create a file item with correct properties', () => {
            const uri = vscode.Uri.file('/workspace/src/test.ts');
            const item = new GitChangeItem(
                'test.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'modified',
                undefined,
                false
            );

            assert.strictEqual(item.label, 'test.ts');
            assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
            assert.strictEqual(item.resourceUri?.fsPath, uri.fsPath);
            assert.strictEqual(item.status, 'modified');
            assert.strictEqual(item.isDirectory, false);
            assert.strictEqual(item.contextValue, 'gitChangeFile');
            assert.ok(item.command);
            assert.strictEqual(item.command?.command, 'git-changes.openDiff');
        });

        test('should create a directory item with correct properties', () => {
            const uri = vscode.Uri.file('/workspace/src');
            const item = new GitChangeItem(
                'src',
                vscode.TreeItemCollapsibleState.Expanded,
                uri,
                undefined,
                undefined,
                true
            );

            assert.strictEqual(item.label, 'src');
            assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
            assert.strictEqual(item.isDirectory, true);
            assert.strictEqual(item.contextValue, 'gitChangeDirectory');
            assert.strictEqual(item.command, undefined);
        });

        test('should create added file with correct status', () => {
            const uri = vscode.Uri.file('/workspace/new-file.ts');
            const item = new GitChangeItem(
                'new-file.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'added',
                undefined,
                false
            );

            assert.strictEqual(item.status, 'added');
        });

        test('should create deleted file with correct status', () => {
            const uri = vscode.Uri.file('/workspace/deleted-file.ts');
            const item = new GitChangeItem(
                'deleted-file.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'deleted',
                undefined,
                false
            );

            assert.strictEqual(item.status, 'deleted');
        });

        test('should create renamed file with oldPath', () => {
            const uri = vscode.Uri.file('/workspace/new-name.ts');
            const item = new GitChangeItem(
                'new-name.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'renamed',
                'old-name.ts',
                false
            );

            assert.strictEqual(item.status, 'renamed');
            assert.strictEqual(item.oldPath, 'old-name.ts');
        });

        test('should format label for modified unstaged file', () => {
            const uri = vscode.Uri.file('/workspace/test.ts');
            const item = new GitChangeItem(
                'M [unstaged] test.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'modified',
                undefined,
                false,
                'unstaged'
            );

            assert.strictEqual(item.label, 'M [unstaged] test.ts');
        });

        test('should format label for added staged file', () => {
            const uri = vscode.Uri.file('/workspace/new-file.ts');
            const item = new GitChangeItem(
                'A [staged] new-file.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'added',
                undefined,
                false,
                'staged'
            );

            assert.strictEqual(item.label, 'A [staged] new-file.ts');
        });

        test('should format label for committed file with no state', () => {
            const uri = vscode.Uri.file('/workspace/deleted-file.ts');
            const item = new GitChangeItem(
                'deleted-file.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'deleted',
                undefined,
                false
            );

            assert.strictEqual(item.label, 'deleted-file.ts');
            assert.strictEqual(item.state, undefined);
        });

        test('should format label for renamed staged file', () => {
            const uri = vscode.Uri.file('/workspace/new-name.ts');
            const item = new GitChangeItem(
                'R [staged] new-name.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'renamed',
                'old-name.ts',
                false,
                'staged'
            );

            assert.strictEqual(item.label, 'R [staged] new-name.ts');
        });

        test('should have colored file ThemeIcon for file items', () => {
            const uri = vscode.Uri.file('/workspace/test.ts');
            const item = new GitChangeItem(
                'M [unstaged] test.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'modified',
                undefined,
                false,
                'unstaged'
            );

            assert.ok(item.iconPath instanceof vscode.ThemeIcon);
            assert.strictEqual((item.iconPath as vscode.ThemeIcon).id, 'file');
        });

        test('should have folder ThemeIcon for directory items', () => {
            const uri = vscode.Uri.file('/workspace/src');
            const item = new GitChangeItem(
                'src',
                vscode.TreeItemCollapsibleState.Expanded,
                uri,
                undefined,
                undefined,
                true
            );

            assert.ok(item.iconPath instanceof vscode.ThemeIcon);
            assert.strictEqual((item.iconPath as vscode.ThemeIcon).id, 'folder');
        });

        test('should have colored folder ThemeIcon for directory with uniform status', () => {
            const uri = vscode.Uri.parse('git-changes-tree:/workspace/src');
            const item = new GitChangeItem(
                'src',
                vscode.TreeItemCollapsibleState.Expanded,
                uri,
                'added',
                undefined,
                true
            );

            assert.ok(item.iconPath instanceof vscode.ThemeIcon);
            assert.strictEqual((item.iconPath as vscode.ThemeIcon).id, 'folder');
            assert.ok((item.iconPath as vscode.ThemeIcon).color);
        });

        test('should have plain folder ThemeIcon for directory with no status', () => {
            const uri = vscode.Uri.parse('git-changes-tree:/workspace/src');
            const item = new GitChangeItem(
                'src',
                vscode.TreeItemCollapsibleState.Expanded,
                uri,
                undefined,
                undefined,
                true
            );

            assert.ok(item.iconPath instanceof vscode.ThemeIcon);
            assert.strictEqual((item.iconPath as vscode.ThemeIcon).id, 'folder');
            assert.strictEqual((item.iconPath as vscode.ThemeIcon).color, undefined);
        });

        test('should use git-changes-tree URI scheme for directory items', () => {
            const uri = vscode.Uri.parse('git-changes-tree:/workspace/src');
            const item = new GitChangeItem(
                'src',
                vscode.TreeItemCollapsibleState.Expanded,
                uri,
                'added',
                undefined,
                true
            );

            assert.strictEqual(item.resourceUri!.scheme, 'git-changes-tree');
            assert.strictEqual(item.resourceUri!.path, '/workspace/src');
        });

        test('should correctly set state property to unstaged', () => {
            const uri = vscode.Uri.file('/workspace/test.ts');
            const item = new GitChangeItem(
                'M [unstaged] test.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'modified',
                undefined,
                false,
                'unstaged'
            );

            assert.strictEqual(item.state, 'unstaged');
        });

        test('should correctly set state property to staged', () => {
            const uri = vscode.Uri.file('/workspace/test.ts');
            const item = new GitChangeItem(
                'A [staged] test.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'added',
                undefined,
                false,
                'staged'
            );

            assert.strictEqual(item.state, 'staged');
        });

        test('should have undefined state for committed file', () => {
            const uri = vscode.Uri.file('/workspace/test.ts');
            const item = new GitChangeItem(
                'test.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'deleted',
                undefined,
                false
            );

            assert.strictEqual(item.state, undefined);
        });

        test('should correctly set state property to unpushed', () => {
            const uri = vscode.Uri.file('/workspace/test.ts');
            const item = new GitChangeItem(
                'test.ts [unpushed]',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'modified',
                undefined,
                false,
                'unpushed'
            );

            assert.strictEqual(item.state, 'unpushed');
        });

        test('should have undefined state when not provided', () => {
            const uri = vscode.Uri.file('/workspace/test.ts');
            const item = new GitChangeItem(
                'test.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'modified',
                undefined,
                false
            );

            assert.strictEqual(item.state, undefined);
        });
    });

    suite('GitChangesTreeProvider', () => {
        test('should create provider with workspace root', () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            assert.ok(provider);
        });

        test('should return TreeItem from getTreeItem', () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            const uri = vscode.Uri.file('/workspace/test.ts');
            const item = new GitChangeItem(
                'test.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'modified',
                undefined,
                false
            );

            const result = provider.getTreeItem(item);
            assert.strictEqual(result, item);
        });

        test('should have onDidChangeTreeData event', () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            assert.ok(provider.onDidChangeTreeData);
        });

        test('should fire event on refresh', () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            let eventFired = false;

            provider.onDidChangeTreeData(() => {
                eventFired = true;
            });

            provider.refresh();
            assert.strictEqual(eventFired, true);
        });
    });

    suite('Directory status computation', () => {
        function _stubGitChanges(
            provider: GitChangesTreeProvider,
            changes: { status: string; path: string; oldPath?: string; state?: string }[]
        ): void {
            sandbox.stub(provider as any, '_getGitChanges').resolves(changes);
        }

        test('should color directory when all children are deleted', async () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            _stubGitChanges(provider, [
                { status: 'deleted', path: 'src/a.ts' },
                { status: 'deleted', path: 'src/b.ts' },
            ]);

            let statuses: Map<string, string> | undefined;
            provider.onTreeBuilt = (s) => { statuses = s; };

            await provider.getChildren();

            assert.ok(statuses);
            assert.strictEqual(statuses!.get('git-changes-tree:/workspace/src'), 'deleted');
        });

        test('should color directory when all children are added', async () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            _stubGitChanges(provider, [
                { status: 'added', path: 'lib/x.ts' },
                { status: 'added', path: 'lib/y.ts' },
            ]);

            let statuses: Map<string, string> | undefined;
            provider.onTreeBuilt = (s) => { statuses = s; };

            await provider.getChildren();

            assert.ok(statuses);
            assert.strictEqual(statuses!.get('git-changes-tree:/workspace/lib'), 'added');
        });

        test('should color directory when all children are modified', async () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            _stubGitChanges(provider, [
                { status: 'modified', path: 'src/a.ts' },
                { status: 'modified', path: 'src/b.ts' },
            ]);

            let statuses: Map<string, string> | undefined;
            provider.onTreeBuilt = (s) => { statuses = s; };

            await provider.getChildren();

            assert.ok(statuses);
            assert.strictEqual(statuses!.get('git-changes-tree:/workspace/src'), 'modified');
        });

        test('should not color directory when children have mixed statuses', async () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            _stubGitChanges(provider, [
                { status: 'deleted', path: 'src/a.ts' },
                { status: 'modified', path: 'src/b.ts' },
            ]);

            let statuses: Map<string, string> | undefined;
            provider.onTreeBuilt = (s) => { statuses = s; };

            await provider.getChildren();

            assert.ok(statuses);
            assert.strictEqual(statuses!.has('git-changes-tree:/workspace/src'), false);
        });

        test('should color nested directories when all descendants are deleted', async () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            _stubGitChanges(provider, [
                { status: 'deleted', path: 'src/sub/a.ts' },
                { status: 'deleted', path: 'src/sub/b.ts' },
            ]);

            let statuses: Map<string, string> | undefined;
            provider.onTreeBuilt = (s) => { statuses = s; };

            await provider.getChildren();

            assert.ok(statuses);
            assert.strictEqual(statuses!.get('git-changes-tree:/workspace/src/sub'), 'deleted');
            assert.strictEqual(statuses!.get('git-changes-tree:/workspace/src'), 'deleted');
        });

        test('should color parent directory when nested dirs all share same status', async () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            _stubGitChanges(provider, [
                { status: 'deleted', path: 'src/a/x.ts' },
                { status: 'deleted', path: 'src/b/y.ts' },
            ]);

            let statuses: Map<string, string> | undefined;
            provider.onTreeBuilt = (s) => { statuses = s; };

            await provider.getChildren();

            assert.ok(statuses);
            assert.strictEqual(statuses!.get('git-changes-tree:/workspace/src/a'), 'deleted');
            assert.strictEqual(statuses!.get('git-changes-tree:/workspace/src/b'), 'deleted');
            assert.strictEqual(statuses!.get('git-changes-tree:/workspace/src'), 'deleted');
        });

        test('should return directory tree item with deleted status', async () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            _stubGitChanges(provider, [
                { status: 'deleted', path: 'src/a.ts' },
                { status: 'deleted', path: 'src/b.ts' },
            ]);

            const rootChildren = await provider.getChildren();
            assert.strictEqual(rootChildren.length, 1);

            const dirItem = rootChildren[0];
            assert.strictEqual(dirItem.label, 'src');
            assert.strictEqual(dirItem.isDirectory, true);
            assert.strictEqual(dirItem.status, 'deleted');
            assert.ok(dirItem.iconPath instanceof vscode.ThemeIcon);
            assert.strictEqual((dirItem.iconPath as vscode.ThemeIcon).id, 'folder');
            assert.ok((dirItem.iconPath as vscode.ThemeIcon).color);
        });

        test('should return directory tree item with no status for mixed children', async () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            _stubGitChanges(provider, [
                { status: 'deleted', path: 'src/a.ts' },
                { status: 'added', path: 'src/b.ts' },
            ]);

            const rootChildren = await provider.getChildren();
            assert.strictEqual(rootChildren.length, 1);

            const dirItem = rootChildren[0];
            assert.strictEqual(dirItem.label, 'src');
            assert.strictEqual(dirItem.isDirectory, true);
            assert.strictEqual(dirItem.status, undefined);
        });

        test('should color directory with mix of direct and nested deleted files', async () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            _stubGitChanges(provider, [
                { status: 'deleted', path: 'src/a.ts' },
                { status: 'deleted', path: 'src/sub/b.ts' },
                { status: 'deleted', path: 'src/sub/c.ts' },
            ]);

            let statuses: Map<string, string> | undefined;
            provider.onTreeBuilt = (s) => { statuses = s; };

            const rootChildren = await provider.getChildren();

            assert.ok(statuses);
            assert.strictEqual(statuses!.get('git-changes-tree:/workspace/src/sub'), 'deleted');
            assert.strictEqual(statuses!.get('git-changes-tree:/workspace/src'), 'deleted');

            const dirItem = rootChildren[0];
            assert.strictEqual(dirItem.status, 'deleted');
        });

        test('should handle directory with only subdirectories containing deleted files', async () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            _stubGitChanges(provider, [
                { status: 'deleted', path: 'src/a/file1.ts' },
                { status: 'deleted', path: 'src/b/file2.ts' },
                { status: 'deleted', path: 'src/c/d/file3.ts' },
            ]);

            let statuses: Map<string, string> | undefined;
            provider.onTreeBuilt = (s) => { statuses = s; };

            await provider.getChildren();

            assert.ok(statuses);
            assert.strictEqual(statuses!.get('git-changes-tree:/workspace/src'), 'deleted');
        });

        test('should return deleted file children when expanding deleted directory', async () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            _stubGitChanges(provider, [
                { status: 'deleted', path: 'src/a.ts' },
                { status: 'deleted', path: 'src/b.ts' },
            ]);

            const rootChildren = await provider.getChildren();
            const dirItem = rootChildren[0];
            assert.strictEqual(dirItem.label, 'src');
            assert.strictEqual(dirItem.status, 'deleted');

            // Simulate expanding the directory (VS Code calls getChildren with the dir item)
            const dirChildren = await provider.getChildren(dirItem);
            assert.strictEqual(dirChildren.length, 2);
            assert.strictEqual(dirChildren[0].status, 'deleted');
            assert.strictEqual(dirChildren[1].status, 'deleted');
        });

        test('should color deleted dir alongside other changes at root', async () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            _stubGitChanges(provider, [
                { status: 'deleted', path: 'removed-dir/a.ts' },
                { status: 'deleted', path: 'removed-dir/b.ts' },
                { status: 'modified', path: 'still-here.ts' },
            ]);

            const rootChildren = await provider.getChildren();

            assert.strictEqual(rootChildren.length, 2);
            const dirItem = rootChildren.find(item => item.label === 'removed-dir');
            const fileItem = rootChildren.find(item => (item.label as string).includes('still-here'));

            assert.ok(dirItem);
            assert.strictEqual(dirItem!.status, 'deleted');
            assert.strictEqual(dirItem!.isDirectory, true);

            assert.ok(fileItem);
            assert.strictEqual(fileItem!.status, 'modified');
        });

        test('should handle deleted dir inside another dir with other changes', async () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            _stubGitChanges(provider, [
                { status: 'deleted', path: 'src/removed/a.ts' },
                { status: 'deleted', path: 'src/removed/b.ts' },
                { status: 'modified', path: 'src/kept.ts' },
            ]);

            let statuses: Map<string, string> | undefined;
            provider.onTreeBuilt = (s) => { statuses = s; };

            await provider.getChildren();

            assert.ok(statuses);
            // removed dir should be deleted
            assert.strictEqual(statuses!.get('git-changes-tree:/workspace/src/removed'), 'deleted');
            // src dir should NOT have a status (mixed: deleted + modified)
            assert.strictEqual(statuses!.has('git-changes-tree:/workspace/src'), false);
        });

        test('should include both directory and file statuses in onTreeBuilt', async () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            _stubGitChanges(provider, [
                { status: 'deleted', path: 'a/x.ts' },
                { status: 'deleted', path: 'a/y.ts' },
                { status: 'added', path: 'b/z.ts' },
            ]);

            let receivedStatuses: Map<string, string> | undefined;
            provider.onTreeBuilt = (s) => { receivedStatuses = s; };

            await provider.getChildren();

            assert.ok(receivedStatuses);
            assert.strictEqual(receivedStatuses!.get('git-changes-tree:/workspace/a'), 'deleted');
            assert.strictEqual(receivedStatuses!.get('git-changes-tree:/workspace/b'), 'added');
            assert.strictEqual(receivedStatuses!.get('git-changes-tree:/workspace/a/x.ts'), 'deleted');
            assert.strictEqual(receivedStatuses!.get('git-changes-tree:/workspace/a/y.ts'), 'deleted');
            assert.strictEqual(receivedStatuses!.get('git-changes-tree:/workspace/b/z.ts'), 'added');
        });

        test('should color deeply nested deleted directory chain', async () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            _stubGitChanges(provider, [
                { status: 'deleted', path: 'a/b/c/d/file.ts' },
            ]);

            let statuses: Map<string, string> | undefined;
            provider.onTreeBuilt = (s) => { statuses = s; };

            await provider.getChildren();

            assert.ok(statuses);
            assert.strictEqual(statuses!.get('git-changes-tree:/workspace/a/b/c/d'), 'deleted');
            assert.strictEqual(statuses!.get('git-changes-tree:/workspace/a/b/c'), 'deleted');
            assert.strictEqual(statuses!.get('git-changes-tree:/workspace/a/b'), 'deleted');
            assert.strictEqual(statuses!.get('git-changes-tree:/workspace/a'), 'deleted');
        });

        test('should color single-file directory as deleted', async () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger);
            _stubGitChanges(provider, [
                { status: 'deleted', path: 'dir/only.ts' },
            ]);

            let statuses: Map<string, string> | undefined;
            provider.onTreeBuilt = (s) => { statuses = s; };

            await provider.getChildren();

            assert.ok(statuses);
            assert.strictEqual(statuses!.get('git-changes-tree:/workspace/dir'), 'deleted');
        });
    });
});

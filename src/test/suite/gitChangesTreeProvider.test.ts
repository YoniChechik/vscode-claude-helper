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

        test('should format label for deleted unpushed file', () => {
            const uri = vscode.Uri.file('/workspace/deleted-file.ts');
            const item = new GitChangeItem(
                'D [unpushed] deleted-file.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'deleted',
                undefined,
                false,
                'unpushed'
            );

            assert.strictEqual(item.label, 'D [unpushed] deleted-file.ts');
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

        test('should correctly set state property to unpushed', () => {
            const uri = vscode.Uri.file('/workspace/test.ts');
            const item = new GitChangeItem(
                'D [unpushed] test.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'deleted',
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
});

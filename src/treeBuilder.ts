import { DiffFileItem, FolderItem } from './treeItems';

export class TreeBuilder {
    buildDirectoryTree(files: DiffFileItem[], worktreePath: string): (FolderItem | DiffFileItem)[] {
        const pathMap = new Map<string, DiffFileItem[]>();

        for (const file of files) {
            const pathParts = file.relativePath.split('/');
            if (pathParts.length === 1) {
                if (!pathMap.has('')) {
                    pathMap.set('', []);
                }
                pathMap.get('')!.push(file);
            } else {
                const firstDir = pathParts[0];
                if (!pathMap.has(firstDir)) {
                    pathMap.set(firstDir, []);
                }
                pathMap.get(firstDir)!.push(file);
            }
        }

        const result: (FolderItem | DiffFileItem)[] = [];
        const rootFiles = pathMap.get('') || [];
        result.push(...rootFiles);

        for (const [dirName, dirFiles] of pathMap.entries()) {
            if (dirName === '') {continue;}
            const folderItem = new FolderItem(dirName, dirName, worktreePath, dirFiles);
            result.push(folderItem);
        }

        return result;
    }
}

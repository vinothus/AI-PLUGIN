export interface FileOperation {
    type: 'create' | 'modify' | 'delete' | 'rename' | 'backup' | 'restore';
    path: string;
    content?: string;
    newPath?: string;
    timestamp: number;
    backupPath?: string;
}
export interface DiffResult {
    hasChanges: boolean;
    additions: number;
    deletions: number;
    diffText: string;
}
export declare class FileSystemManager {
    private operations;
    private backupDir;
    constructor();
    private ensureBackupDirectory;
    private validatePath;
    private generateBackupPath;
    createFile(filePath: string, content?: string): Promise<void>;
    modifyFile(filePath: string, content: string): Promise<void>;
    deleteFile(filePath: string): Promise<void>;
    renameFile(oldPath: string, newPath: string): Promise<void>;
    readFile(filePath: string): Promise<string>;
    fileExists(filePath: string): Promise<boolean>;
    createBackup(filePath: string): Promise<string>;
    restoreBackup(backupPath: string, targetPath?: string): Promise<void>;
    private findOriginalPath;
    showDiff(filePath: string, newContent: string): Promise<DiffResult>;
    batchOperation(operations: Array<{
        type: string;
        path: string;
        content?: string;
        newPath?: string;
    }>): Promise<void>;
    getOperationHistory(): FileOperation[];
    cleanupBackups(olderThanDays?: number): Promise<void>;
}
//# sourceMappingURL=FileSystemManager.d.ts.map
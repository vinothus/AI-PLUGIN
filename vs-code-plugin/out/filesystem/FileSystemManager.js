"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystemManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
class FileSystemManager {
    constructor() {
        this.operations = [];
        this.backupDir = path.join(process.cwd(), '.ai-plugin-backups');
        this.ensureBackupDirectory();
    }
    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }
    validatePath(filePath) {
        // Prevent path traversal attacks
        const normalizedPath = path.normalize(filePath);
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspaceRoot && !normalizedPath.startsWith(workspaceRoot)) {
            throw new Error('Access denied: Path outside workspace');
        }
        // Check for dangerous file extensions
        const dangerousExtensions = ['.exe', '.bat', '.cmd', '.ps1', '.sh', '.dll', '.so'];
        const ext = path.extname(normalizedPath).toLowerCase();
        if (dangerousExtensions.includes(ext)) {
            throw new Error(`Access denied: Dangerous file extension ${ext}`);
        }
    }
    generateBackupPath(originalPath) {
        const timestamp = Date.now();
        const hash = crypto.createHash('md5').update(originalPath).digest('hex').substring(0, 8);
        const fileName = path.basename(originalPath);
        const nameWithoutExt = path.parse(fileName).name;
        const ext = path.parse(fileName).ext;
        return path.join(this.backupDir, `${nameWithoutExt}_${hash}_${timestamp}${ext}`);
    }
    async createFile(filePath, content = '') {
        this.validatePath(filePath);
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, content, 'utf8');
            this.operations.push({
                type: 'create',
                path: filePath,
                content,
                timestamp: Date.now()
            });
        }
        catch (error) {
            throw new Error(`Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async modifyFile(filePath, content) {
        this.validatePath(filePath);
        if (!fs.existsSync(filePath)) {
            throw new Error('File does not exist');
        }
        try {
            // Create backup before modification
            const backupPath = this.generateBackupPath(filePath);
            fs.copyFileSync(filePath, backupPath);
            // Read original content for diff
            const originalContent = fs.readFileSync(filePath, 'utf8');
            // Write new content
            fs.writeFileSync(filePath, content, 'utf8');
            this.operations.push({
                type: 'modify',
                path: filePath,
                content,
                timestamp: Date.now(),
                backupPath
            });
        }
        catch (error) {
            throw new Error(`Failed to modify file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async deleteFile(filePath) {
        this.validatePath(filePath);
        if (!fs.existsSync(filePath)) {
            throw new Error('File does not exist');
        }
        try {
            // Create backup before deletion
            const backupPath = this.generateBackupPath(filePath);
            fs.copyFileSync(filePath, backupPath);
            fs.unlinkSync(filePath);
            this.operations.push({
                type: 'delete',
                path: filePath,
                timestamp: Date.now(),
                backupPath
            });
        }
        catch (error) {
            throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async renameFile(oldPath, newPath) {
        this.validatePath(oldPath);
        this.validatePath(newPath);
        if (!fs.existsSync(oldPath)) {
            throw new Error('Source file does not exist');
        }
        if (fs.existsSync(newPath)) {
            throw new Error('Destination file already exists');
        }
        try {
            fs.renameSync(oldPath, newPath);
            this.operations.push({
                type: 'rename',
                path: oldPath,
                newPath,
                timestamp: Date.now()
            });
        }
        catch (error) {
            throw new Error(`Failed to rename file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async readFile(filePath) {
        this.validatePath(filePath);
        if (!fs.existsSync(filePath)) {
            throw new Error('File does not exist');
        }
        try {
            return fs.readFileSync(filePath, 'utf8');
        }
        catch (error) {
            throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async fileExists(filePath) {
        this.validatePath(filePath);
        return fs.existsSync(filePath);
    }
    async createBackup(filePath) {
        this.validatePath(filePath);
        if (!fs.existsSync(filePath)) {
            throw new Error('File does not exist');
        }
        try {
            const backupPath = this.generateBackupPath(filePath);
            fs.copyFileSync(filePath, backupPath);
            this.operations.push({
                type: 'backup',
                path: filePath,
                timestamp: Date.now(),
                backupPath
            });
            return backupPath;
        }
        catch (error) {
            throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async restoreBackup(backupPath, targetPath) {
        if (!fs.existsSync(backupPath)) {
            throw new Error('Backup file does not exist');
        }
        try {
            const restorePath = targetPath || this.findOriginalPath(backupPath);
            if (!restorePath) {
                throw new Error('Cannot determine original file path');
            }
            fs.copyFileSync(backupPath, restorePath);
            this.operations.push({
                type: 'restore',
                path: restorePath,
                timestamp: Date.now(),
                backupPath
            });
        }
        catch (error) {
            throw new Error(`Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    findOriginalPath(backupPath) {
        // Try to find the original path from operations history
        for (const op of this.operations.reverse()) {
            if (op.backupPath === backupPath) {
                return op.path;
            }
        }
        return null;
    }
    async showDiff(filePath, newContent) {
        this.validatePath(filePath);
        if (!fs.existsSync(filePath)) {
            return {
                hasChanges: true,
                additions: newContent.split('\n').length,
                deletions: 0,
                diffText: `+ ${newContent.split('\n').join('\n+ ')}`
            };
        }
        try {
            const originalContent = fs.readFileSync(filePath, 'utf8');
            const originalLines = originalContent.split('\n');
            const newLines = newContent.split('\n');
            let additions = 0;
            let deletions = 0;
            let diffText = '';
            // Simple diff algorithm
            const maxLength = Math.max(originalLines.length, newLines.length);
            for (let i = 0; i < maxLength; i++) {
                const originalLine = originalLines[i] || '';
                const newLine = newLines[i] || '';
                if (originalLine !== newLine) {
                    if (originalLine) {
                        diffText += `- ${originalLine}\n`;
                        deletions++;
                    }
                    if (newLine) {
                        diffText += `+ ${newLine}\n`;
                        additions++;
                    }
                }
                else {
                    diffText += `  ${originalLine}\n`;
                }
            }
            return {
                hasChanges: additions > 0 || deletions > 0,
                additions,
                deletions,
                diffText: diffText.trim()
            };
        }
        catch (error) {
            throw new Error(`Failed to generate diff: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async batchOperation(operations) {
        const rollbackOperations = [];
        try {
            for (const op of operations) {
                switch (op.type) {
                    case 'create':
                        await this.createFile(op.path, op.content || '');
                        rollbackOperations.unshift({ type: 'delete', path: op.path, timestamp: Date.now() });
                        break;
                    case 'modify':
                        if (op.content) {
                            await this.modifyFile(op.path, op.content);
                        }
                        break;
                    case 'delete':
                        await this.deleteFile(op.path);
                        break;
                    case 'rename':
                        if (op.newPath) {
                            await this.renameFile(op.path, op.newPath);
                            rollbackOperations.unshift({ type: 'rename', path: op.newPath, newPath: op.path, timestamp: Date.now() });
                        }
                        break;
                    default:
                        throw new Error(`Unknown operation type: ${op.type}`);
                }
            }
        }
        catch (error) {
            // Rollback completed operations
            for (const rollbackOp of rollbackOperations) {
                try {
                    switch (rollbackOp.type) {
                        case 'delete':
                            if (await this.fileExists(rollbackOp.path)) {
                                fs.unlinkSync(rollbackOp.path);
                            }
                            break;
                        case 'rename':
                            if (rollbackOp.newPath) {
                                await this.renameFile(rollbackOp.path, rollbackOp.newPath);
                            }
                            break;
                    }
                }
                catch (rollbackError) {
                    console.error(`Rollback failed for ${rollbackOp.path}: ${rollbackError}`);
                }
            }
            throw error;
        }
    }
    getOperationHistory() {
        return [...this.operations];
    }
    async cleanupBackups(olderThanDays = 30) {
        const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
        try {
            const files = fs.readdirSync(this.backupDir);
            for (const file of files) {
                const filePath = path.join(this.backupDir, file);
                const stats = fs.statSync(filePath);
                if (stats.mtime.getTime() < cutoffTime) {
                    fs.unlinkSync(filePath);
                }
            }
        }
        catch (error) {
            throw new Error(`Failed to cleanup backups: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.FileSystemManager = FileSystemManager;
//# sourceMappingURL=FileSystemManager.js.map
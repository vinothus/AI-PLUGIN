import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import * as os from 'os';

import { TerminalManager } from '../terminal/TerminalManager';

export interface GitInfo {
    branch: string;
    commit: string;
    status: string;
    remote: string;
    changes: string[];
}

export interface ProjectStructure {
    name: string;
    type: string;
    files: string[];
    dependencies: string[];
    configFiles: string[];
    buildFiles: string[];
}

export interface LanguageContext {
    language: string;
    framework: string;
    version: string;
    patterns: string[];
    conventions: string[];
    dependencies: string[];
}

export interface EditorContext {
    activeFile: string;
    selection: string;
    cursorPosition: vscode.Position;
    documentContent: string;
    language: string;
    lineCount: number;
    wordCount: number;
}

export interface WorkspaceContext {
    root: string;
    folders: string[];
    files: string[];
    totalFiles: number;
    totalSize: number;
}

export interface ComprehensiveContext {
    editor: EditorContext;
    workspace: WorkspaceContext;
    project: ProjectStructure;
    git: GitInfo | null;
    language: LanguageContext;
    timestamp: number;
    session: string;
    tokens?: number;
    contextWindow?: number;
}

// Context optimization types
export interface ContextUpdate {
    timestamp: number;
    updateType: string;
    update: string;
    metadata: string[];
}

export interface FileMetadataEntry {
    path: string;
    recordState: 'active' | 'stale';
    recordSource: 'read_tool' | 'user_edited' | 'cline_edited' | 'file_mentioned';
    clineReadDate?: number;
    clineEditDate?: number;
    userEditDate?: number;
}

export interface ContextOptimizationMetrics {
    charactersSaved: number;
    charactersSavedPercentage: number;
    filesOptimized: number;
    contextWindowUsage: number;
}

export class ContextManager {
    private sessionId: string;
    private contextHistory: ComprehensiveContext[] = [];
    private maxHistorySize: number = 100;
    private contextHistoryUpdates: Map<number, [number, Map<number, ContextUpdate[]>]> = new Map();
    private fileWatchers = new Map<string, chokidar.FSWatcher>();
    private recentlyModifiedFiles = new Set<string>();
    private recentlyEditedByCline = new Set<string>();
    private filesInContext: FileMetadataEntry[] = [];
    private contextWindowInfo: { contextWindow: number; maxAllowedSize: number } | null = null;
    private tokenUsage: { tokensIn: number; tokensOut: number; cacheWrites: number; cacheReads: number } = {
        tokensIn: 0,
        tokensOut: 0,
        cacheWrites: 0,
        cacheReads: 0
    };

    private terminalManager: TerminalManager;
    private environmentCache: Map<string, any> = new Map();
    private processMonitorInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.sessionId = this.generateSessionId();
        this.terminalManager = new TerminalManager();
        this.startProcessMonitoring();
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Initialize context manager with workspace
     */
    public async initialize(workspaceRoot: string): Promise<void> {
        await this.setupFileWatchers(workspaceRoot);
        await this.loadContextHistory();
        this.contextWindowInfo = this.getContextWindowInfo();
    }

    /**
     * Get context window information
     */
    private getContextWindowInfo(): { contextWindow: number; maxAllowedSize: number } {
        // Default to 128K context window
        const contextWindow = 128_000;
        const maxAllowedSize = contextWindow - 30_000; // Reserve 30K for new content
        
        return { contextWindow, maxAllowedSize };
    }

    /**
     * Setup file watchers for real-time tracking
     */
    private async setupFileWatchers(workspaceRoot: string): Promise<void> {
        try {
            const watcher = chokidar.watch(workspaceRoot, {
                ignored: [
                    '**/node_modules/**',
                    '**/.git/**',
                    '**/dist/**',
                    '**/build/**',
                    '**/*.log'
                ],
                persistent: true,
                ignoreInitial: true
            });

            watcher.on('change', (filePath: string) => {
                this.handleFileChange(filePath, 'user_edited');
            });

            watcher.on('add', (filePath: string) => {
                this.handleFileChange(filePath, 'file_mentioned');
            });

            this.fileWatchers.set(workspaceRoot, watcher);
        } catch (error) {
            console.error('Failed to setup file watchers:', error);
        }
    }

    /**
     * Handle file changes
     */
    private handleFileChange(filePath: string, source: FileMetadataEntry['recordSource']): void {
        this.recentlyModifiedFiles.add(filePath);
        this.addFileToContextTracker(filePath, source);
    }

    /**
     * Add file to context tracker
     */
    private async addFileToContextTracker(filePath: string, source: FileMetadataEntry['recordSource']): Promise<void> {
        const now = Date.now();

        // Mark existing entries for this file as stale
        this.filesInContext.forEach(entry => {
            if (entry.path === filePath && entry.recordState === 'active') {
                entry.recordState = 'stale';
            }
        });

        const newEntry: FileMetadataEntry = {
            path: filePath,
            recordState: 'active',
            recordSource: source,
            clineReadDate: this.getLatestDateForField(filePath, 'clineReadDate'),
            clineEditDate: this.getLatestDateForField(filePath, 'clineEditDate'),
            userEditDate: this.getLatestDateForField(filePath, 'userEditDate')
        };

        switch (source) {
            case 'user_edited':
                newEntry.userEditDate = now;
                break;
            case 'cline_edited':
                newEntry.clineReadDate = now;
                newEntry.clineEditDate = now;
                break;
            case 'read_tool':
            case 'file_mentioned':
                newEntry.clineReadDate = now;
                break;
        }

        this.filesInContext.push(newEntry);
        await this.saveContextHistory();
    }

    /**
     * Get latest date for a specific field and file
     */
    private getLatestDateForField(filePath: string, field: keyof FileMetadataEntry): number | undefined {
        const relevantEntries = this.filesInContext
            .filter(entry => entry.path === filePath && entry[field])
            .sort((a, b) => (b[field] as number) - (a[field] as number));

        return relevantEntries.length > 0 ? (relevantEntries[0][field] as number) : undefined;
    }

    /**
     * Get recently modified files and clear the set
     */
    public getAndClearRecentlyModifiedFiles(): string[] {
        const files = Array.from(this.recentlyModifiedFiles);
        this.recentlyModifiedFiles.clear();
        return files;
    }

    /**
     * Update token usage
     */
    public updateTokenUsage(usage: Partial<typeof this.tokenUsage>): void {
        this.tokenUsage = { ...this.tokenUsage, ...usage };
    }

    /**
     * Get total token usage
     */
    public getTotalTokenUsage(): number {
        return this.tokenUsage.tokensIn + this.tokenUsage.tokensOut + 
               this.tokenUsage.cacheWrites + this.tokenUsage.cacheReads;
    }

    /**
     * Check if context window is near limit
     */
    public isContextWindowNearLimit(): boolean {
        if (!this.contextWindowInfo) return false;
        return this.getTotalTokenUsage() >= this.contextWindowInfo.maxAllowedSize;
    }

    /**
     * Apply context optimizations
     */
    public applyContextOptimizations(): ContextOptimizationMetrics {
        const metrics: ContextOptimizationMetrics = {
            charactersSaved: 0,
            charactersSavedPercentage: 0,
            filesOptimized: 0,
            contextWindowUsage: this.getTotalTokenUsage()
        };

        // Remove stale file entries older than 1 hour
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const initialCount = this.filesInContext.length;
        
        this.filesInContext = this.filesInContext.filter(entry => {
            if (entry.recordState === 'stale' && 
                entry.userEditDate && 
                entry.userEditDate < oneHourAgo) {
                metrics.charactersSaved += 100; // Estimate saved characters
                return false;
            }
            return true;
        });

        metrics.filesOptimized = initialCount - this.filesInContext.length;
        metrics.charactersSavedPercentage = metrics.charactersSaved / (this.contextWindowInfo?.contextWindow || 128000);

        return metrics;
    }

    /**
     * Get optimized context
     */
    public async getOptimizedContext(): Promise<ComprehensiveContext> {
        const context = await this.getComprehensiveContext();
        
        // Apply optimizations if context window is near limit
        if (this.isContextWindowNearLimit()) {
            const metrics = this.applyContextOptimizations();
            
            if (metrics.charactersSavedPercentage < 0.3) {
                // Apply more aggressive optimization
                await this.applyContextTruncation();
            }
        }

        return context;
    }

    /**
     * Apply context truncation
     */
    private async applyContextTruncation(): Promise<void> {
        // Keep only recent context history
        const keepCount = Math.floor(this.maxHistorySize * 0.5);
        if (this.contextHistory.length > keepCount) {
            this.contextHistory = this.contextHistory.slice(-keepCount);
        }

        // Clear old context updates
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
        for (const [key, value] of this.contextHistoryUpdates.entries()) {
            const [timestamp, updates] = value;
            if (timestamp < cutoffTime) {
                this.contextHistoryUpdates.delete(key);
            }
        }

        await this.saveContextHistory();
    }

    /**
     * Load context history from disk
     */
    private async loadContextHistory(): Promise<void> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) return;

            const historyPath = path.join(workspaceFolders[0].uri.fsPath, '.ai-plugin', 'context-history.json');
            
            if (fs.existsSync(historyPath)) {
                const data = fs.readFileSync(historyPath, 'utf8');
                const saved = JSON.parse(data);
                
                this.contextHistory = saved.contextHistory || [];
                this.filesInContext = saved.filesInContext || [];
                this.tokenUsage = saved.tokenUsage || this.tokenUsage;
            }
        } catch (error) {
            console.error('Failed to load context history:', error);
        }
    }

    /**
     * Save context history to disk
     */
    private async saveContextHistory(): Promise<void> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) return;

            const aiPluginDir = path.join(workspaceFolders[0].uri.fsPath, '.ai-plugin');
            if (!fs.existsSync(aiPluginDir)) {
                fs.mkdirSync(aiPluginDir, { recursive: true });
            }

            const historyPath = path.join(aiPluginDir, 'context-history.json');
            const data = {
                contextHistory: this.contextHistory,
                filesInContext: this.filesInContext,
                tokenUsage: this.tokenUsage,
                sessionId: this.sessionId,
                timestamp: Date.now()
            };

            fs.writeFileSync(historyPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to save context history:', error);
        }
    }

    public async getComprehensiveContext(): Promise<ComprehensiveContext> {
        const context: ComprehensiveContext = {
            editor: await this.getEditorContext(),
            workspace: await this.getWorkspaceContext(),
            project: await this.getProjectStructure(),
            git: await this.getGitInfo(),
            language: await this.getLanguageContext(),
            timestamp: Date.now(),
            session: this.sessionId,
            tokens: this.getTotalTokenUsage(),
            contextWindow: this.contextWindowInfo?.contextWindow
        };

        this.addToHistory(context);
        return context;
    }

    private async getEditorContext(): Promise<EditorContext> {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            return {
                activeFile: '',
                selection: '',
                cursorPosition: new vscode.Position(0, 0),
                documentContent: '',
                language: '',
                lineCount: 0,
                wordCount: 0
            };
        }

        const document = editor.document;
        const selection = editor.selection;
        const content = document.getText();
        const selectedText = document.getText(selection);

        // Track file read
        await this.addFileToContextTracker(document.fileName, 'read_tool');

        return {
            activeFile: document.fileName,
            selection: selectedText,
            cursorPosition: selection.active,
            documentContent: content,
            language: document.languageId,
            lineCount: document.lineCount,
            wordCount: content.split(/\s+/).filter(word => word.length > 0).length
        };
    }

    private async getWorkspaceContext(): Promise<WorkspaceContext> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return {
                root: '',
                folders: [],
                files: [],
                totalFiles: 0,
                totalSize: 0
            };
        }

        const root = workspaceFolders[0].uri.fsPath;
        const folders: string[] = [];
        const files: string[] = [];
        let totalSize = 0;

        // Get all files and folders
        const filePattern = new vscode.RelativePattern(workspaceFolders[0], '**/*');
        const foundFiles = await vscode.workspace.findFiles(filePattern, '**/node_modules/**');

        for (const file of foundFiles) {
            const relativePath = vscode.workspace.asRelativePath(file);
            files.push(relativePath);
            
            try {
                const stats = fs.statSync(file.fsPath);
                totalSize += stats.size;
                
                if (stats.isDirectory()) {
                    folders.push(relativePath);
                }
            } catch (error) {
                // Skip files that can't be accessed
            }
        }

        return {
            root,
            folders,
            files,
            totalFiles: files.length,
            totalSize
        };
    }

    private async getProjectStructure(): Promise<ProjectStructure> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return {
                name: 'Unknown',
                type: 'unknown',
                files: [],
                dependencies: [],
                configFiles: [],
                buildFiles: []
            };
        }

        const root = workspaceFolders[0].uri.fsPath;
        const projectName = path.basename(root);
        
        // Detect project type and get relevant files
        const projectType = await this.detectProjectType(root);
        const configFiles = await this.findConfigFiles(root, projectType);
        const buildFiles = await this.findBuildFiles(root, projectType);
        const dependencies = await this.extractDependencies(root, projectType);

        return {
            name: projectName,
            type: projectType,
            files: [],
            dependencies,
            configFiles,
            buildFiles
        };
    }

    private async detectProjectType(root: string): Promise<string> {
        const files = fs.readdirSync(root);
        
        if (files.includes('package.json')) return 'nodejs';
        if (files.includes('requirements.txt') || files.includes('pyproject.toml')) return 'python';
        if (files.includes('pom.xml') || files.includes('build.gradle')) return 'java';
        if (files.includes('*.csproj') || files.includes('*.sln')) return 'csharp';
        if (files.includes('go.mod')) return 'go';
        if (files.includes('Cargo.toml')) return 'rust';
        if (files.includes('composer.json')) return 'php';
        if (files.includes('Gemfile')) return 'ruby';
        
        return 'unknown';
    }

    private async findConfigFiles(root: string, projectType: string): Promise<string[]> {
        const configFiles: string[] = [];
        
        try {
            const files = fs.readdirSync(root);
            
            switch (projectType) {
                case 'nodejs':
                    if (files.includes('package.json')) configFiles.push('package.json');
                    if (files.includes('tsconfig.json')) configFiles.push('tsconfig.json');
                    if (files.includes('.eslintrc')) configFiles.push('.eslintrc');
                    break;
                case 'python':
                    if (files.includes('requirements.txt')) configFiles.push('requirements.txt');
                    if (files.includes('pyproject.toml')) configFiles.push('pyproject.toml');
                    break;
                case 'java':
                    if (files.includes('pom.xml')) configFiles.push('pom.xml');
                    if (files.includes('build.gradle')) configFiles.push('build.gradle');
                    break;
            }
        } catch (error) {
            console.error('Error finding config files:', error);
        }
        
        return configFiles;
    }

    private async findBuildFiles(root: string, projectType: string): Promise<string[]> {
        const buildFiles: string[] = [];
        
        try {
            const files = fs.readdirSync(root);
            
            switch (projectType) {
                case 'nodejs':
                    if (files.includes('webpack.config.js')) buildFiles.push('webpack.config.js');
                    if (files.includes('vite.config.js')) buildFiles.push('vite.config.js');
                    break;
                case 'java':
                    if (files.includes('build.gradle')) buildFiles.push('build.gradle');
                    if (files.includes('pom.xml')) buildFiles.push('pom.xml');
                    break;
            }
        } catch (error) {
            console.error('Error finding build files:', error);
        }
        
        return buildFiles;
    }

    private async extractDependencies(root: string, projectType: string): Promise<string[]> {
        const dependencies: string[] = [];
        
        try {
            switch (projectType) {
                case 'nodejs':
                    const packageJsonPath = path.join(root, 'package.json');
                    if (fs.existsSync(packageJsonPath)) {
                        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                        if (packageJson.dependencies) {
                            dependencies.push(...Object.keys(packageJson.dependencies));
                        }
                    }
                    break;
                case 'python':
                    const requirementsPath = path.join(root, 'requirements.txt');
                    if (fs.existsSync(requirementsPath)) {
                        const requirements = fs.readFileSync(requirementsPath, 'utf8');
                        dependencies.push(...requirements.split('\n').filter(line => line.trim() && !line.startsWith('#')));
                    }
                    break;
            }
        } catch (error) {
            console.error('Error extracting dependencies:', error);
        }
        
        return dependencies;
    }

    private async getGitInfo(): Promise<GitInfo | null> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) return null;

            const root = workspaceFolders[0].uri.fsPath;
            const gitPath = path.join(root, '.git');
            
            if (!fs.existsSync(gitPath)) return null;

            // Basic Git info extraction
            return {
                branch: 'main', // Placeholder
                commit: 'unknown', // Placeholder
                status: 'clean', // Placeholder
                remote: 'origin', // Placeholder
                changes: [] // Placeholder
            };
        } catch (error) {
            console.error('Error getting Git info:', error);
            return null;
        }
    }

    private async getLanguageContext(): Promise<LanguageContext> {
        const editor = vscode.window.activeTextEditor;
        const language = editor?.document.languageId || 'unknown';
        
        // Enhanced language context based on language
        const languageContexts: Record<string, LanguageContext> = {
            'typescript': {
                language: 'typescript',
                framework: 'nodejs',
                version: 'latest',
                patterns: ['async/await', 'interfaces', 'generics'],
                conventions: ['camelCase', 'PascalCase for classes'],
                dependencies: ['@types/node']
            },
            'javascript': {
                language: 'javascript',
                framework: 'nodejs',
                version: 'latest',
                patterns: ['async/await', 'modules', 'destructuring'],
                conventions: ['camelCase', 'ES6+'],
                dependencies: []
            },
            'python': {
                language: 'python',
                framework: 'standard',
                version: '3.x',
                patterns: ['list comprehensions', 'decorators', 'context managers'],
                conventions: ['snake_case', 'PEP 8'],
                dependencies: []
            },
            'java': {
                language: 'java',
                framework: 'spring',
                version: '11+',
                patterns: ['OOP', 'interfaces', 'annotations'],
                conventions: ['camelCase', 'PascalCase for classes'],
                dependencies: []
            }
        };

        return languageContexts[language] || {
            language,
            framework: 'unknown',
            version: 'unknown',
            patterns: [],
            conventions: [],
            dependencies: []
        };
    }

    private addToHistory(context: ComprehensiveContext): void {
        this.contextHistory.push(context);
        
        // Maintain history size
        if (this.contextHistory.length > this.maxHistorySize) {
            this.contextHistory = this.contextHistory.slice(-this.maxHistorySize);
        }
    }

    /**
     * Get context history
     */
    public getContextHistory(): ComprehensiveContext[] {
        return [...this.contextHistory];
    }

    /**
     * Get files in context
     */
    public getFilesInContext(): FileMetadataEntry[] {
        return [...this.filesInContext];
    }

    /**
     * Get context optimization metrics
     */
    public getContextOptimizationMetrics(): ContextOptimizationMetrics {
        return this.applyContextOptimizations();
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        // Close file watchers
        for (const watcher of this.fileWatchers.values()) {
            watcher.close();
        }
        this.fileWatchers.clear();
        this.stopProcessMonitoring();
    }

    /**
     * Get comprehensive environment information
     */
    public getEnvironmentInfo(): EnvironmentInfo {
        const cacheKey = 'environment_info';
        if (this.environmentCache.has(cacheKey)) {
            return this.environmentCache.get(cacheKey);
        }

        const envInfo: EnvironmentInfo = {
            system: this.getSystemInfo(),
            shell: this.getShellInfo(),
            terminal: this.getTerminalInfo(),
            processes: this.getActiveProcesses(),
            environment: this.getEnvironmentVariables(),
            platform: this.getPlatformInfo()
        };

        this.environmentCache.set(cacheKey, envInfo);
        return envInfo;
    }

    /**
     * Get detailed system information
     */
    private getSystemInfo(): SystemInfo {
        return {
            platform: os.platform(),
            release: os.release(),
            arch: os.arch(),
            hostname: os.hostname(),
            type: os.type(),
            version: os.version(),
            cpus: os.cpus().length,
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            uptime: os.uptime(),
            homeDir: os.homedir(),
            tmpDir: os.tmpdir(),
            userInfo: os.userInfo()
        };
    }

    /**
     * Get shell information with advanced detection
     */
    private getShellInfo(): ShellInfo {
        const platform = os.platform();
        let shell = 'bash';
        let shellPath = '';

        // Enhanced shell detection
        if (platform === 'win32') {
            // Windows shell detection
            if (process.env.COMSPEC) {
                shell = path.basename(process.env.COMSPEC);
                shellPath = process.env.COMSPEC;
            } else {
                shell = 'cmd.exe';
                shellPath = 'C:\\Windows\\System32\\cmd.exe';
            }
        } else {
            // Unix-like systems
            if (process.env.SHELL) {
                shell = path.basename(process.env.SHELL);
                shellPath = process.env.SHELL;
            } else {
                shell = 'bash';
                shellPath = '/bin/bash';
            }
        }

        return {
            name: shell,
            path: shellPath,
            version: this.getShellVersion(shellPath),
            isInteractive: process.stdin.isTTY,
            environment: process.env.SHELL || ''
        };
    }

    /**
     * Get terminal information
     */
    private getTerminalInfo(): TerminalStatusInfo {
        const terminals = this.terminalManager.getTerminals();
        const busyTerminals = this.terminalManager.getTerminals(true);
        
        return {
            totalTerminals: terminals.length,
            busyTerminals: busyTerminals.length,
            activeProcesses: this.terminalManager.getActiveProcesses().length,
            defaultShell: this.getShellInfo().name,
            terminalType: process.env.TERM || 'unknown',
            isTerminal: process.stdin.isTTY
        };
    }

    /**
     * Get active processes information
     */
    private getActiveProcesses(): ProcessStatusInfo[] {
        return this.terminalManager.getActiveProcesses().map(process => ({
            pid: process.pid,
            command: process.command,
            startTime: process.startTime,
            isActive: process.isActive,
            isHot: this.terminalManager.isProcessHot(process.pid),
            duration: Date.now() - process.startTime,
            output: process.output
        }));
    }

    /**
     * Get environment variables
     */
    private getEnvironmentVariables(): EnvironmentVariables {
        const importantVars = [
            'PATH', 'HOME', 'USER', 'SHELL', 'TERM', 'LANG', 'LC_ALL',
            'NODE_ENV', 'NODE_VERSION', 'npm_config_prefix',
            'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_SYSTEM',
            'DOCKER_HOST', 'KUBECONFIG'
        ];

        const envVars: EnvironmentVariables = {
            important: {},
            all: {}
        };

        // Get important environment variables
        importantVars.forEach(varName => {
            if (process.env[varName]) {
                envVars.important[varName] = process.env[varName]!;
            }
        });

        // Get all environment variables (filtered for security)
        Object.keys(process.env).forEach(key => {
            // Skip sensitive variables
            if (!key.toLowerCase().includes('password') && 
                !key.toLowerCase().includes('secret') && 
                !key.toLowerCase().includes('key') &&
                !key.toLowerCase().includes('token')) {
                envVars.all[key] = process.env[key]!;
            }
        });

        return envVars;
    }

    /**
     * Get platform-specific information
     */
    private getPlatformInfo(): PlatformInfo {
        const platform = os.platform();
        
        return {
            name: platform,
            isWindows: platform === 'win32',
            isMacOS: platform === 'darwin',
            isLinux: platform === 'linux',
            isUnix: ['darwin', 'linux', 'freebsd', 'openbsd', 'sunos'].includes(platform),
            pathSeparator: path.sep,
            lineEnding: platform === 'win32' ? '\r\n' : '\n',
            caseSensitive: platform !== 'win32',
            supportsSymlinks: platform !== 'win32'
        };
    }

    /**
     * Get shell version information
     */
    private getShellVersion(shellPath: string): string {
        try {
            // This would require executing the shell with --version
            // For now, return a placeholder
            return 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Start process monitoring
     */
    private startProcessMonitoring(): void {
        this.processMonitorInterval = setInterval(() => {
            // Update process information
            this.environmentCache.delete('environment_info');
            
            // Emit process update events if needed
            const activeProcesses = this.getActiveProcesses();
            if (activeProcesses.length > 0) {
                // Assuming 'emit' is a method of the ContextManager or a global event emitter
                // For now, we'll just update the cache and re-fetch
            }
        }, 5000); // Update every 5 seconds
    }

    /**
     * Stop process monitoring
     */
    public stopProcessMonitoring(): void {
        if (this.processMonitorInterval) {
            clearInterval(this.processMonitorInterval);
            this.processMonitorInterval = null;
        }
    }

    /**
     * Get terminal manager instance
     */
    public getTerminalManager(): TerminalManager {
        return this.terminalManager;
    }

    /**
     * Enhanced context with environment information
     */
    public async getEnhancedContext(): Promise<EnhancedContext> {
        const baseContext = await this.getComprehensiveContext();
        const environmentInfo = this.getEnvironmentInfo();
        
        return {
            editor: baseContext.editor,
            workspace: baseContext.workspace,
            project: baseContext.project,
            git: baseContext.git,
            language: baseContext.language,
            timestamp: baseContext.timestamp,
            session: baseContext.session,
            tokens: baseContext.tokens,
            contextWindow: baseContext.contextWindow,
            environment: environmentInfo,
            terminalStatus: {
                hasActiveTerminals: environmentInfo.terminal.busyTerminals > 0,
                hasActiveProcesses: environmentInfo.processes.length > 0,
                hotProcesses: environmentInfo.processes.filter(p => p.isHot).length
            }
        };
    }
}

// New interfaces for enhanced environment integration
export interface EnvironmentInfo {
    system: SystemInfo;
    shell: ShellInfo;
    terminal: TerminalStatusInfo;
    processes: ProcessStatusInfo[];
    environment: EnvironmentVariables;
    platform: PlatformInfo;
}

export interface SystemInfo {
    platform: string;
    release: string;
    arch: string;
    hostname: string;
    type: string;
    version: string;
    cpus: number;
    totalMemory: number;
    freeMemory: number;
    uptime: number;
    homeDir: string;
    tmpDir: string;
    userInfo: os.UserInfo<string>;
}

export interface ShellInfo {
    name: string;
    path: string;
    version: string;
    isInteractive: boolean;
    environment: string;
}

export interface TerminalStatusInfo {
    totalTerminals: number;
    busyTerminals: number;
    activeProcesses: number;
    defaultShell: string;
    terminalType: string;
    isTerminal: boolean;
}

export interface ProcessStatusInfo {
    pid: number;
    command: string;
    startTime: number;
    isActive: boolean;
    isHot: boolean;
    duration: number;
    output: string[];
}

export interface EnvironmentVariables {
    important: { [key: string]: string };
    all: { [key: string]: string };
}

export interface PlatformInfo {
    name: string;
    isWindows: boolean;
    isMacOS: boolean;
    isLinux: boolean;
    isUnix: boolean;
    pathSeparator: string;
    lineEnding: string;
    caseSensitive: boolean;
    supportsSymlinks: boolean;
}

export interface EnhancedContext extends ComprehensiveContext {
    environment: EnvironmentInfo;
    terminalStatus: {
        hasActiveTerminals: boolean;
        hasActiveProcesses: boolean;
        hotProcesses: number;
    };
    mcpServers?: string[];
}

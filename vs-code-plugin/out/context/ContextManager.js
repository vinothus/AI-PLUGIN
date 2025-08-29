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
exports.ContextManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chokidar = __importStar(require("chokidar"));
const os = __importStar(require("os"));
const TerminalManager_1 = require("../terminal/TerminalManager");
class ContextManager {
    constructor() {
        this.contextHistory = [];
        this.maxHistorySize = 100;
        this.contextHistoryUpdates = new Map();
        this.fileWatchers = new Map();
        this.recentlyModifiedFiles = new Set();
        this.recentlyEditedByCline = new Set();
        this.filesInContext = [];
        this.contextWindowInfo = null;
        this.tokenUsage = {
            tokensIn: 0,
            tokensOut: 0,
            cacheWrites: 0,
            cacheReads: 0
        };
        this.environmentCache = new Map();
        this.processMonitorInterval = null;
        this.sessionId = this.generateSessionId();
        this.terminalManager = new TerminalManager_1.TerminalManager();
        this.startProcessMonitoring();
    }
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Initialize context manager with workspace
     */
    async initialize(workspaceRoot) {
        await this.setupFileWatchers(workspaceRoot);
        await this.loadContextHistory();
        this.contextWindowInfo = this.getContextWindowInfo();
    }
    /**
     * Get context window information
     */
    getContextWindowInfo() {
        // Default to 128K context window
        const contextWindow = 128000;
        const maxAllowedSize = contextWindow - 30000; // Reserve 30K for new content
        return { contextWindow, maxAllowedSize };
    }
    /**
     * Setup file watchers for real-time tracking
     */
    async setupFileWatchers(workspaceRoot) {
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
            watcher.on('change', (filePath) => {
                this.handleFileChange(filePath, 'user_edited');
            });
            watcher.on('add', (filePath) => {
                this.handleFileChange(filePath, 'file_mentioned');
            });
            this.fileWatchers.set(workspaceRoot, watcher);
        }
        catch (error) {
            console.error('Failed to setup file watchers:', error);
        }
    }
    /**
     * Handle file changes
     */
    handleFileChange(filePath, source) {
        this.recentlyModifiedFiles.add(filePath);
        this.addFileToContextTracker(filePath, source);
    }
    /**
     * Add file to context tracker
     */
    async addFileToContextTracker(filePath, source) {
        const now = Date.now();
        // Mark existing entries for this file as stale
        this.filesInContext.forEach(entry => {
            if (entry.path === filePath && entry.recordState === 'active') {
                entry.recordState = 'stale';
            }
        });
        const newEntry = {
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
    getLatestDateForField(filePath, field) {
        const relevantEntries = this.filesInContext
            .filter(entry => entry.path === filePath && entry[field])
            .sort((a, b) => b[field] - a[field]);
        return relevantEntries.length > 0 ? relevantEntries[0][field] : undefined;
    }
    /**
     * Get recently modified files and clear the set
     */
    getAndClearRecentlyModifiedFiles() {
        const files = Array.from(this.recentlyModifiedFiles);
        this.recentlyModifiedFiles.clear();
        return files;
    }
    /**
     * Update token usage
     */
    updateTokenUsage(usage) {
        this.tokenUsage = { ...this.tokenUsage, ...usage };
    }
    /**
     * Get total token usage
     */
    getTotalTokenUsage() {
        return this.tokenUsage.tokensIn + this.tokenUsage.tokensOut +
            this.tokenUsage.cacheWrites + this.tokenUsage.cacheReads;
    }
    /**
     * Check if context window is near limit
     */
    isContextWindowNearLimit() {
        if (!this.contextWindowInfo)
            return false;
        return this.getTotalTokenUsage() >= this.contextWindowInfo.maxAllowedSize;
    }
    /**
     * Apply context optimizations
     */
    applyContextOptimizations() {
        const metrics = {
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
    async getOptimizedContext() {
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
    async applyContextTruncation() {
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
    async loadContextHistory() {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0)
                return;
            const historyPath = path.join(workspaceFolders[0].uri.fsPath, '.ai-plugin', 'context-history.json');
            if (fs.existsSync(historyPath)) {
                const data = fs.readFileSync(historyPath, 'utf8');
                const saved = JSON.parse(data);
                this.contextHistory = saved.contextHistory || [];
                this.filesInContext = saved.filesInContext || [];
                this.tokenUsage = saved.tokenUsage || this.tokenUsage;
            }
        }
        catch (error) {
            console.error('Failed to load context history:', error);
        }
    }
    /**
     * Save context history to disk
     */
    async saveContextHistory() {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0)
                return;
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
        }
        catch (error) {
            console.error('Failed to save context history:', error);
        }
    }
    async getComprehensiveContext() {
        const context = {
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
    async getEditorContext() {
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
    async getWorkspaceContext() {
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
        const folders = [];
        const files = [];
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
            }
            catch (error) {
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
    async getProjectStructure() {
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
    async detectProjectType(root) {
        const files = fs.readdirSync(root);
        if (files.includes('package.json'))
            return 'nodejs';
        if (files.includes('requirements.txt') || files.includes('pyproject.toml'))
            return 'python';
        if (files.includes('pom.xml') || files.includes('build.gradle'))
            return 'java';
        if (files.includes('*.csproj') || files.includes('*.sln'))
            return 'csharp';
        if (files.includes('go.mod'))
            return 'go';
        if (files.includes('Cargo.toml'))
            return 'rust';
        if (files.includes('composer.json'))
            return 'php';
        if (files.includes('Gemfile'))
            return 'ruby';
        return 'unknown';
    }
    async findConfigFiles(root, projectType) {
        const configFiles = [];
        try {
            const files = fs.readdirSync(root);
            switch (projectType) {
                case 'nodejs':
                    if (files.includes('package.json'))
                        configFiles.push('package.json');
                    if (files.includes('tsconfig.json'))
                        configFiles.push('tsconfig.json');
                    if (files.includes('.eslintrc'))
                        configFiles.push('.eslintrc');
                    break;
                case 'python':
                    if (files.includes('requirements.txt'))
                        configFiles.push('requirements.txt');
                    if (files.includes('pyproject.toml'))
                        configFiles.push('pyproject.toml');
                    break;
                case 'java':
                    if (files.includes('pom.xml'))
                        configFiles.push('pom.xml');
                    if (files.includes('build.gradle'))
                        configFiles.push('build.gradle');
                    break;
            }
        }
        catch (error) {
            console.error('Error finding config files:', error);
        }
        return configFiles;
    }
    async findBuildFiles(root, projectType) {
        const buildFiles = [];
        try {
            const files = fs.readdirSync(root);
            switch (projectType) {
                case 'nodejs':
                    if (files.includes('webpack.config.js'))
                        buildFiles.push('webpack.config.js');
                    if (files.includes('vite.config.js'))
                        buildFiles.push('vite.config.js');
                    break;
                case 'java':
                    if (files.includes('build.gradle'))
                        buildFiles.push('build.gradle');
                    if (files.includes('pom.xml'))
                        buildFiles.push('pom.xml');
                    break;
            }
        }
        catch (error) {
            console.error('Error finding build files:', error);
        }
        return buildFiles;
    }
    async extractDependencies(root, projectType) {
        const dependencies = [];
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
        }
        catch (error) {
            console.error('Error extracting dependencies:', error);
        }
        return dependencies;
    }
    async getGitInfo() {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0)
                return null;
            const root = workspaceFolders[0].uri.fsPath;
            const gitPath = path.join(root, '.git');
            if (!fs.existsSync(gitPath))
                return null;
            // Basic Git info extraction
            return {
                branch: 'main', // Placeholder
                commit: 'unknown', // Placeholder
                status: 'clean', // Placeholder
                remote: 'origin', // Placeholder
                changes: [] // Placeholder
            };
        }
        catch (error) {
            console.error('Error getting Git info:', error);
            return null;
        }
    }
    async getLanguageContext() {
        const editor = vscode.window.activeTextEditor;
        const language = editor?.document.languageId || 'unknown';
        // Enhanced language context based on language
        const languageContexts = {
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
    addToHistory(context) {
        this.contextHistory.push(context);
        // Maintain history size
        if (this.contextHistory.length > this.maxHistorySize) {
            this.contextHistory = this.contextHistory.slice(-this.maxHistorySize);
        }
    }
    /**
     * Get context history
     */
    getContextHistory() {
        return [...this.contextHistory];
    }
    /**
     * Get files in context
     */
    getFilesInContext() {
        return [...this.filesInContext];
    }
    /**
     * Get context optimization metrics
     */
    getContextOptimizationMetrics() {
        return this.applyContextOptimizations();
    }
    /**
     * Dispose resources
     */
    dispose() {
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
    getEnvironmentInfo() {
        const cacheKey = 'environment_info';
        if (this.environmentCache.has(cacheKey)) {
            return this.environmentCache.get(cacheKey);
        }
        const envInfo = {
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
    getSystemInfo() {
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
    getShellInfo() {
        const platform = os.platform();
        let shell = 'bash';
        let shellPath = '';
        // Enhanced shell detection
        if (platform === 'win32') {
            // Windows shell detection
            if (process.env.COMSPEC) {
                shell = path.basename(process.env.COMSPEC);
                shellPath = process.env.COMSPEC;
            }
            else {
                shell = 'cmd.exe';
                shellPath = 'C:\\Windows\\System32\\cmd.exe';
            }
        }
        else {
            // Unix-like systems
            if (process.env.SHELL) {
                shell = path.basename(process.env.SHELL);
                shellPath = process.env.SHELL;
            }
            else {
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
    getTerminalInfo() {
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
    getActiveProcesses() {
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
    getEnvironmentVariables() {
        const importantVars = [
            'PATH', 'HOME', 'USER', 'SHELL', 'TERM', 'LANG', 'LC_ALL',
            'NODE_ENV', 'NODE_VERSION', 'npm_config_prefix',
            'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_SYSTEM',
            'DOCKER_HOST', 'KUBECONFIG'
        ];
        const envVars = {
            important: {},
            all: {}
        };
        // Get important environment variables
        importantVars.forEach(varName => {
            if (process.env[varName]) {
                envVars.important[varName] = process.env[varName];
            }
        });
        // Get all environment variables (filtered for security)
        Object.keys(process.env).forEach(key => {
            // Skip sensitive variables
            if (!key.toLowerCase().includes('password') &&
                !key.toLowerCase().includes('secret') &&
                !key.toLowerCase().includes('key') &&
                !key.toLowerCase().includes('token')) {
                envVars.all[key] = process.env[key];
            }
        });
        return envVars;
    }
    /**
     * Get platform-specific information
     */
    getPlatformInfo() {
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
    getShellVersion(shellPath) {
        try {
            // This would require executing the shell with --version
            // For now, return a placeholder
            return 'unknown';
        }
        catch (error) {
            return 'unknown';
        }
    }
    /**
     * Start process monitoring
     */
    startProcessMonitoring() {
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
    stopProcessMonitoring() {
        if (this.processMonitorInterval) {
            clearInterval(this.processMonitorInterval);
            this.processMonitorInterval = null;
        }
    }
    /**
     * Get terminal manager instance
     */
    getTerminalManager() {
        return this.terminalManager;
    }
    /**
     * Enhanced context with environment information
     */
    async getEnhancedContext() {
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
exports.ContextManager = ContextManager;
//# sourceMappingURL=ContextManager.js.map
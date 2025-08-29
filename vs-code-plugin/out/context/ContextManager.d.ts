import * as vscode from 'vscode';
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
export declare class ContextManager {
    private sessionId;
    private contextHistory;
    private maxHistorySize;
    private contextHistoryUpdates;
    private fileWatchers;
    private recentlyModifiedFiles;
    private recentlyEditedByCline;
    private filesInContext;
    private contextWindowInfo;
    private tokenUsage;
    private terminalManager;
    private environmentCache;
    private processMonitorInterval;
    constructor();
    private generateSessionId;
    /**
     * Initialize context manager with workspace
     */
    initialize(workspaceRoot: string): Promise<void>;
    /**
     * Get context window information
     */
    private getContextWindowInfo;
    /**
     * Setup file watchers for real-time tracking
     */
    private setupFileWatchers;
    /**
     * Handle file changes
     */
    private handleFileChange;
    /**
     * Add file to context tracker
     */
    private addFileToContextTracker;
    /**
     * Get latest date for a specific field and file
     */
    private getLatestDateForField;
    /**
     * Get recently modified files and clear the set
     */
    getAndClearRecentlyModifiedFiles(): string[];
    /**
     * Update token usage
     */
    updateTokenUsage(usage: Partial<typeof this.tokenUsage>): void;
    /**
     * Get total token usage
     */
    getTotalTokenUsage(): number;
    /**
     * Check if context window is near limit
     */
    isContextWindowNearLimit(): boolean;
    /**
     * Apply context optimizations
     */
    applyContextOptimizations(): ContextOptimizationMetrics;
    /**
     * Get optimized context
     */
    getOptimizedContext(): Promise<ComprehensiveContext>;
    /**
     * Apply context truncation
     */
    private applyContextTruncation;
    /**
     * Load context history from disk
     */
    private loadContextHistory;
    /**
     * Save context history to disk
     */
    private saveContextHistory;
    getComprehensiveContext(): Promise<ComprehensiveContext>;
    private getEditorContext;
    private getWorkspaceContext;
    private getProjectStructure;
    private detectProjectType;
    private findConfigFiles;
    private findBuildFiles;
    private extractDependencies;
    private getGitInfo;
    private getLanguageContext;
    private addToHistory;
    /**
     * Get context history
     */
    getContextHistory(): ComprehensiveContext[];
    /**
     * Get files in context
     */
    getFilesInContext(): FileMetadataEntry[];
    /**
     * Get context optimization metrics
     */
    getContextOptimizationMetrics(): ContextOptimizationMetrics;
    /**
     * Dispose resources
     */
    dispose(): void;
    /**
     * Get comprehensive environment information
     */
    getEnvironmentInfo(): EnvironmentInfo;
    /**
     * Get detailed system information
     */
    private getSystemInfo;
    /**
     * Get shell information with advanced detection
     */
    private getShellInfo;
    /**
     * Get terminal information
     */
    private getTerminalInfo;
    /**
     * Get active processes information
     */
    private getActiveProcesses;
    /**
     * Get environment variables
     */
    private getEnvironmentVariables;
    /**
     * Get platform-specific information
     */
    private getPlatformInfo;
    /**
     * Get shell version information
     */
    private getShellVersion;
    /**
     * Start process monitoring
     */
    private startProcessMonitoring;
    /**
     * Stop process monitoring
     */
    stopProcessMonitoring(): void;
    /**
     * Get terminal manager instance
     */
    getTerminalManager(): TerminalManager;
    /**
     * Enhanced context with environment information
     */
    getEnhancedContext(): Promise<EnhancedContext>;
}
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
    important: {
        [key: string]: string;
    };
    all: {
        [key: string]: string;
    };
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
//# sourceMappingURL=ContextManager.d.ts.map
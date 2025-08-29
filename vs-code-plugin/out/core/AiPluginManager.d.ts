import * as vscode from 'vscode';
import { SecurityManager } from '../security/SecurityManager';
import { AdvancedOrchestrator } from '../workflow/AdvancedOrchestrator';
import { TerminalManager } from '../terminal/TerminalManager';
import { CodeGenerationEngine } from '../codegen/CodeGenerationEngine';
import { McpClient } from '../mcp/McpClient';
export declare class AiPluginManager {
    private context;
    private securityManager;
    private aiProviderGateway;
    private contextManager;
    private fileSystemManager;
    private advancedOrchestrator;
    private terminalManager;
    private codeGenerationEngine;
    private mcpClient;
    private isInitialized;
    constructor(context: vscode.ExtensionContext, securityManager: SecurityManager);
    initialize(): Promise<void>;
    start(): Promise<void>;
    showConfiguration(): Promise<void>;
    showChatInterface(): Promise<void>;
    private handleChatMessage;
    private handleAiResponse;
    /**
     * Start advanced workflow
     */
    startAdvancedWorkflow(task: string): Promise<void>;
    /**
     * Initialize Phase 2 components
     */
    private initializePhase2Components;
    /**
     * Handle workflow planning
     */
    private handleWorkflowPlan;
    /**
     * Handle code refactoring
     */
    private handleCodeRefactoring;
    /**
     * Get Phase 2 components for external access
     */
    getPhase2Components(): {
        advancedOrchestrator: AdvancedOrchestrator;
        terminalManager: TerminalManager;
        codeGenerationEngine: CodeGenerationEngine;
        mcpClient: McpClient;
    };
    private getChatWebviewContent;
    /**
     * Get optimized context with advanced management
     */
    getCurrentContext(): Promise<any>;
    /**
     * Get context optimization metrics
     */
    getContextOptimizationMetrics(): Promise<any>;
    /**
     * Update token usage for context optimization
     */
    updateTokenUsage(usage: any): void;
    /**
     * Get context history
     */
    getContextHistory(): any[];
    /**
     * Get files in context
     */
    getFilesInContext(): any[];
    /**
     * Get recently modified files
     */
    getRecentlyModifiedFiles(): string[];
    /**
     * Get advanced orchestrator
     */
    getAdvancedOrchestrator(): AdvancedOrchestrator;
    /**
     * Dispose resources
     */
    dispose(): void;
}
//# sourceMappingURL=AiPluginManager.d.ts.map
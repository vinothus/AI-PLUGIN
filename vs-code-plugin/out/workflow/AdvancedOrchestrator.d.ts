import { AiProviderGateway } from '../ai/AiProviderGateway';
import { ContextManager } from '../context/ContextManager';
import { FileSystemManager } from '../filesystem/FileSystemManager';
import { SecurityManager } from '../security/SecurityManager';
export declare enum OrchestratorState {
    IDLE = "idle",
    INITIALIZING = "initializing",
    PLANNING = "planning",
    PENDING_APPROVAL = "pending_approval",
    APPROVED = "approved",
    EXECUTING = "executing",
    EVALUATING = "evaluating",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    ROLLING_BACK = "rolling_back",
    ERROR_RECOVERY = "error_recovery",
    CONTEXT_UPDATING = "context_updating",
    CHECKPOINT_CREATING = "checkpoint_creating",
    CHECKPOINT_RESTORING = "checkpoint_restoring"
}
export interface ToolExecutionState {
    toolId: string;
    toolName: string;
    status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
    startTime: number;
    endTime?: number;
    duration?: number;
    result?: any;
    error?: string;
    contextSnapshot: any;
    parameters: any;
    approvalRequired: boolean;
    approvedBy?: string;
    approvedAt?: number;
    retryCount: number;
    maxRetries: number;
    rollbackData?: any;
    metadata: Map<string, any>;
}
export interface ContextUpdate {
    timestamp: number;
    updateType: string;
    content: string[];
    metadata: string[][];
    source: 'user' | 'ai' | 'tool' | 'system';
    priority: 'low' | 'medium' | 'high' | 'critical';
}
export interface ContextHistory {
    messageIndex: number;
    editType: 'add' | 'remove' | 'modify' | 'replace';
    updates: Map<number, ContextUpdate[]>;
    contextSnapshot: any;
    tokenUsage: {
        input: number;
        output: number;
        total: number;
    };
}
export interface FocusChainItem {
    id: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
    priority: number;
    dependencies: string[];
    estimatedEffort: number;
    actualEffort?: number;
    startTime?: number;
    endTime?: number;
    assignee?: string;
    notes?: string;
}
export interface AdvancedWorkflowPlan {
    id: string;
    task: string;
    description: string;
    steps: AdvancedWorkflowStep[];
    estimatedDuration: number;
    complexity: 'low' | 'medium' | 'high' | 'critical';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    dependencies: string[];
    prerequisites: string[];
    successCriteria: string[];
    rollbackPlan: string[];
    approvalRequired: boolean;
    approvedBy?: string;
    approvedAt?: number;
    createdAt: number;
    updatedAt: number;
    status: 'draft' | 'pending' | 'approved' | 'executing' | 'completed' | 'failed';
}
export interface AdvancedWorkflowStep {
    id: string;
    description: string;
    action: string;
    parameters: any;
    dependencies: string[];
    estimatedDuration: number;
    status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
    result?: any;
    error?: string;
    startTime?: number;
    endTime?: number;
    retryCount: number;
    maxRetries: number;
    rollbackData?: any;
    approvalRequired: boolean;
    approvedBy?: string;
    approvedAt?: number;
    contextSnapshot?: any;
    toolExecutionState?: ToolExecutionState;
}
export interface Checkpoint {
    id: string;
    name: string;
    description: string;
    timestamp: number;
    state: OrchestratorState;
    contextSnapshot: any;
    toolStates: Map<string, ToolExecutionState>;
    focusChain: FocusChainItem[];
    workflowPlan?: AdvancedWorkflowPlan;
    metadata: Map<string, any>;
    fileChanges: string[];
    gitCommit?: string;
}
export declare class AdvancedOrchestrator {
    private aiGateway;
    private contextManager;
    private fileSystemManager;
    private securityManager;
    private currentState;
    private stateHistory;
    private stateTransitions;
    private toolExecutionStates;
    private toolExecutionHistory;
    private activeTools;
    private toolMetrics;
    private contextHistory;
    private contextUpdates;
    private contextWindowUsage;
    private contextOptimizationMetrics;
    private focusChain;
    private focusChainHistory;
    private currentFocusItem?;
    private currentPlan?;
    private workflowHistory;
    private executedSteps;
    private checkpoints;
    private currentCheckpoint?;
    private checkpointAutoSave;
    private checkpointInterval;
    private errorHistory;
    private consecutiveErrors;
    private maxConsecutiveErrors;
    private performanceMetrics;
    constructor(aiGateway: AiProviderGateway, contextManager: ContextManager, fileSystemManager: FileSystemManager, securityManager: SecurityManager);
    /**
     * Initialize state transition rules
     */
    private initializeStateTransitions;
    /**
     * Start checkpoint timer for auto-save
     */
    private startCheckpointTimer;
    /**
     * Transition to a new state
     */
    private transitionToState;
    /**
     * Handle state-specific actions
     */
    private handleStateTransition;
    /**
     * Initialize the orchestrator
     */
    private initializeOrchestrator;
    /**
     * Start workflow planning
     */
    startWorkflow(task: string): Promise<AdvancedWorkflowPlan>;
    /**
     * Generate advanced workflow plan
     */
    private generateAdvancedPlan;
    /**
     * Parse AI response into advanced workflow plan
     */
    private parseAdvancedPlanResponse;
    /**
     * Approve the current plan
     */
    approvePlan(approvedBy: string): Promise<void>;
    /**
     * Execute the approved plan
     */
    executePlan(): Promise<any>;
    /**
     * Execute workflow steps
     */
    private executeSteps;
    /**
     * Execute a single step
     */
    private executeStep;
    /**
     * Execute step action
     */
    private executeStepAction;
    /**
     * Execute command with security validation
     */
    private executeCommand;
    /**
     * Evaluate execution results
     */
    private evaluateExecution;
    /**
     * Start rollback process
     */
    private startRollback;
    /**
     * Rollback a single step
     */
    private rollbackStep;
    /**
     * Handle error recovery
     */
    private handleErrorRecovery;
    /**
     * Handle error
     */
    private handleError;
    /**
     * Update context
     */
    private updateContext;
    /**
     * Create checkpoint
     */
    createCheckpoint(name: string): Promise<Checkpoint>;
    /**
     * Restore checkpoint
     */
    restoreCheckpoint(checkpointId: string): Promise<void>;
    /**
     * Get current state
     */
    getCurrentState(): OrchestratorState;
    /**
     * Get state history
     */
    getStateHistory(): Array<{
        state: OrchestratorState;
        timestamp: number;
        reason?: string;
        metadata?: any;
    }>;
    /**
     * Get tool execution states
     */
    getToolExecutionStates(): Map<string, ToolExecutionState>;
    /**
     * Get tool metrics
     */
    getToolMetrics(): Map<string, {
        totalExecutions: number;
        successRate: number;
        avgDuration: number;
    }>;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): any;
    /**
     * Get focus chain
     */
    getFocusChain(): FocusChainItem[];
    /**
     * Get checkpoints
     */
    getCheckpoints(): Checkpoint[];
    /**
     * Cancel current workflow
     */
    cancelWorkflow(): Promise<void>;
    private generatePlanId;
    private generateCheckpointId;
    private sortStepsByDependencies;
    private shouldRollback;
    private updateToolMetrics;
    private initializeToolMetrics;
    private loadContextHistory;
    private loadFocusChain;
    private loadCheckpoints;
    private saveCheckpoints;
    private startPlanning;
    private startExecution;
}
//# sourceMappingURL=AdvancedOrchestrator.d.ts.map
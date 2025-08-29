import { AiProviderGateway } from '../ai/AiProviderGateway';
import { ContextManager } from '../context/ContextManager';
import { FileSystemManager } from '../filesystem/FileSystemManager';
export declare enum WorkflowState {
    IDLE = "idle",
    PLANNING = "planning",
    PENDING_APPROVAL = "pending_approval",
    APPROVED = "approved",
    EXECUTING = "executing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    ROLLING_BACK = "rolling_back"
}
export interface WorkflowStep {
    id: string;
    description: string;
    action: string;
    parameters: any;
    estimatedTime: number;
    dependencies: string[];
    status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'skipped';
    result?: any;
    error?: string;
}
export interface WorkflowPlan {
    id: string;
    task: string;
    steps: WorkflowStep[];
    estimatedTotalTime: number;
    riskLevel: 'low' | 'medium' | 'high';
    dependencies: string[];
    created: Date;
    status: WorkflowState;
    approvalRequired: boolean;
    approvedBy?: string;
    approvedAt?: Date;
}
export interface WorkflowResult {
    success: boolean;
    stepsCompleted: number;
    stepsFailed: number;
    totalTime: number;
    results: Map<string, any>;
    errors: Map<string, string>;
    rollbackRequired: boolean;
}
export declare class PlanActWorkflow {
    private aiGateway;
    private contextManager;
    private fileSystemManager;
    private currentPlan;
    private state;
    private stateHistory;
    constructor(aiGateway: AiProviderGateway, contextManager: ContextManager, fileSystemManager: FileSystemManager);
    /**
     * Start the Plan/Act workflow for a given task
     */
    startWorkflow(task: string): Promise<WorkflowPlan>;
    /**
     * Generate a detailed plan using AI
     */
    private generatePlan;
    /**
     * Approve the current plan
     */
    approvePlan(approvedBy: string): Promise<void>;
    /**
     * Execute the approved plan
     */
    executePlan(): Promise<WorkflowResult>;
    /**
     * Execute a single workflow step
     */
    private executeStep;
    /**
     * Execute a terminal command
     */
    private executeCommand;
    /**
     * Rollback executed steps
     */
    private rollback;
    /**
     * Rollback a single step
     */
    private rollbackStep;
    /**
     * Cancel the current workflow
     */
    cancelWorkflow(): Promise<void>;
    /**
     * Get current workflow state
     */
    getCurrentState(): WorkflowState;
    /**
     * Get current plan
     */
    getCurrentPlan(): WorkflowPlan | null;
    /**
     * Get state history
     */
    getStateHistory(): Array<{
        state: WorkflowState;
        timestamp: Date;
        reason?: string;
    }>;
    private setState;
    private generatePlanId;
    private parsePlanResponse;
    private sortStepsByDependencies;
    private shouldRollback;
}
//# sourceMappingURL=PlanActWorkflow.d.ts.map
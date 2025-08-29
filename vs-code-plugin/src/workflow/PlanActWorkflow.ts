import * as vscode from 'vscode';
import { AiProviderGateway } from '../ai/AiProviderGateway';
import { ContextManager } from '../context/ContextManager';
import { FileSystemManager } from '../filesystem/FileSystemManager';

export enum WorkflowState {
    IDLE = 'idle',
    PLANNING = 'planning',
    PENDING_APPROVAL = 'pending_approval',
    APPROVED = 'approved',
    EXECUTING = 'executing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
    ROLLING_BACK = 'rolling_back'
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

export class PlanActWorkflow {
    private aiGateway: AiProviderGateway;
    private contextManager: ContextManager;
    private fileSystemManager: FileSystemManager;
    private currentPlan: WorkflowPlan | null = null;
    private state: WorkflowState = WorkflowState.IDLE;
    private stateHistory: Array<{ state: WorkflowState; timestamp: Date; reason?: string }> = [];

    constructor(
        aiGateway: AiProviderGateway,
        contextManager: ContextManager,
        fileSystemManager: FileSystemManager
    ) {
        this.aiGateway = aiGateway;
        this.contextManager = contextManager;
        this.fileSystemManager = fileSystemManager;
    }

    /**
     * Start the Plan/Act workflow for a given task
     */
    public async startWorkflow(task: string): Promise<WorkflowPlan> {
        try {
            this.setState(WorkflowState.PLANNING, 'Starting workflow for task: ' + task);
            
            // Get current context
            const context = await this.contextManager.getComprehensiveContext();
            
            // Generate plan using AI
            const plan = await this.generatePlan(task, context);
            
            this.currentPlan = plan;
            this.setState(WorkflowState.PENDING_APPROVAL, 'Plan generated, awaiting approval');
            
            return plan;
        } catch (error) {
            this.setState(WorkflowState.FAILED, 'Failed to start workflow: ' + error);
            throw new Error(`Workflow start failed: ${error}`);
        }
    }

    /**
     * Generate a detailed plan using AI
     */
    private async generatePlan(task: string, context: any): Promise<WorkflowPlan> {
        const prompt = `Given the following task and context, generate a detailed step-by-step plan:

Task: ${task}

Context: ${JSON.stringify(context, null, 2)}

Please generate a plan with the following structure:
1. Break down the task into specific, executable steps
2. For each step, provide:
   - Clear description
   - Specific action to take
   - Required parameters
   - Estimated time
   - Dependencies on other steps
3. Assess the overall risk level
4. Identify any approval requirements

Return the plan in JSON format.`;

        const response = await this.aiGateway.sendMessage(prompt, context);
        
        // Parse AI response and create structured plan
        const planData = this.parsePlanResponse(response.content);
        
        return {
            id: this.generatePlanId(),
            task: task,
            steps: planData.steps,
            estimatedTotalTime: planData.estimatedTotalTime,
            riskLevel: planData.riskLevel,
            dependencies: planData.dependencies,
            created: new Date(),
            status: WorkflowState.PENDING_APPROVAL,
                        approvalRequired: planData.riskLevel === 'high' || planData.steps.some((step: any) =>
                step.action.includes('delete') || step.action.includes('modify') || step.action.includes('execute')
            )
        };
    }

    /**
     * Approve the current plan
     */
    public async approvePlan(approvedBy: string): Promise<void> {
        if (!this.currentPlan) {
            throw new Error('No plan to approve');
        }

        if (this.state !== WorkflowState.PENDING_APPROVAL) {
            throw new Error(`Cannot approve plan in state: ${this.state}`);
        }

        this.currentPlan.approvedBy = approvedBy;
        this.currentPlan.approvedAt = new Date();
        this.setState(WorkflowState.APPROVED, 'Plan approved by ' + approvedBy);
    }

    /**
     * Execute the approved plan
     */
    public async executePlan(): Promise<WorkflowResult> {
        if (!this.currentPlan) {
            throw new Error('No plan to execute');
        }

        if (this.state !== WorkflowState.APPROVED) {
            throw new Error(`Cannot execute plan in state: ${this.state}`);
        }

        this.setState(WorkflowState.EXECUTING, 'Starting plan execution');
        
        const result: WorkflowResult = {
            success: true,
            stepsCompleted: 0,
            stepsFailed: 0,
            totalTime: 0,
            results: new Map(),
            errors: new Map(),
            rollbackRequired: false
        };

        const startTime = Date.now();
        const executedSteps: WorkflowStep[] = [];

        try {
            // Execute steps in dependency order
            const stepsToExecute = this.sortStepsByDependencies(this.currentPlan.steps);
            
            for (const step of stepsToExecute) {
                try {
                    step.status = 'executing';
                    
                    // Execute the step
                    const stepResult = await this.executeStep(step);
                    
                    step.status = 'completed';
                    step.result = stepResult;
                    result.results.set(step.id, stepResult);
                    result.stepsCompleted++;
                    executedSteps.push(step);
                    
                } catch (error) {
                    step.status = 'failed';
                    step.error = error instanceof Error ? error.message : String(error);
                    result.errors.set(step.id, step.error);
                    result.stepsFailed++;
                    
                    // Determine if rollback is needed
                    if (this.shouldRollback(step)) {
                        result.rollbackRequired = true;
                        await this.rollback(executedSteps);
                        break;
                    }
                }
            }

            result.totalTime = Date.now() - startTime;
            
            if (result.stepsFailed === 0) {
                this.setState(WorkflowState.COMPLETED, 'Plan executed successfully');
                result.success = true;
            } else {
                this.setState(WorkflowState.FAILED, `${result.stepsFailed} steps failed`);
                result.success = false;
            }

        } catch (error) {
            this.setState(WorkflowState.FAILED, 'Execution failed: ' + error);
            result.success = false;
            throw error;
        }

        return result;
    }

    /**
     * Execute a single workflow step
     */
    private async executeStep(step: WorkflowStep): Promise<any> {
        switch (step.action) {
            case 'create_file':
                return await this.fileSystemManager.createFile(step.parameters.path, step.parameters.content);
            
            case 'modify_file':
                return await this.fileSystemManager.modifyFile(step.parameters.path, step.parameters.content);
            
            case 'delete_file':
                return await this.fileSystemManager.deleteFile(step.parameters.path);
            
            case 'execute_command':
                return await this.executeCommand(step.parameters.command, step.parameters.workingDirectory);
            
            case 'ai_generate':
                const context = await this.contextManager.getComprehensiveContext();
                return await this.aiGateway.sendMessage(step.parameters.prompt, context);
            
            default:
                throw new Error(`Unknown action: ${step.action}`);
        }
    }

    /**
     * Execute a terminal command
     */
    private async executeCommand(command: string, workingDirectory?: string): Promise<any> {
        // This will be implemented with the terminal integration
        // For now, return a placeholder
        return {
            command: command,
            workingDirectory: workingDirectory,
            status: 'executed',
            output: 'Command execution placeholder'
        };
    }

    /**
     * Rollback executed steps
     */
    private async rollback(executedSteps: WorkflowStep[]): Promise<void> {
        this.setState(WorkflowState.ROLLING_BACK, 'Rolling back executed steps');
        
        // Rollback in reverse order
        for (let i = executedSteps.length - 1; i >= 0; i--) {
            const step = executedSteps[i];
            try {
                await this.rollbackStep(step);
            } catch (error) {
                console.error(`Failed to rollback step ${step.id}:`, error);
            }
        }
        
        this.setState(WorkflowState.FAILED, 'Rollback completed');
    }

    /**
     * Rollback a single step
     */
    private async rollbackStep(step: WorkflowStep): Promise<void> {
        // Implement rollback logic based on step type
        // This is a simplified implementation
        console.log(`Rolling back step: ${step.id}`);
    }

    /**
     * Cancel the current workflow
     */
    public async cancelWorkflow(): Promise<void> {
        if (this.state === WorkflowState.EXECUTING) {
            // Stop execution and rollback if needed
            await this.rollback([]);
        }
        
        this.setState(WorkflowState.CANCELLED, 'Workflow cancelled by user');
    }

    /**
     * Get current workflow state
     */
    public getCurrentState(): WorkflowState {
        return this.state;
    }

    /**
     * Get current plan
     */
    public getCurrentPlan(): WorkflowPlan | null {
        return this.currentPlan;
    }

    /**
     * Get state history
     */
    public getStateHistory(): Array<{ state: WorkflowState; timestamp: Date; reason?: string }> {
        return [...this.stateHistory];
    }

    // Helper methods
    private setState(state: WorkflowState, reason?: string): void {
        this.state = state;
        this.stateHistory.push({ state, timestamp: new Date(), reason });
    }

    private generatePlanId(): string {
        return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private parsePlanResponse(content: string): any {
        try {
            // Extract JSON from AI response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Fallback: create a basic plan structure
            return {
                steps: [
                    {
                        id: 'step_1',
                        description: 'Analyze task requirements',
                        action: 'ai_generate',
                        parameters: { prompt: 'Analyze the task and provide guidance' },
                        estimatedTime: 30,
                        dependencies: [],
                        status: 'pending'
                    }
                ],
                estimatedTotalTime: 30,
                riskLevel: 'low',
                dependencies: []
            };
        } catch (error) {
            throw new Error(`Failed to parse plan response: ${error}`);
        }
    }

    private sortStepsByDependencies(steps: WorkflowStep[]): WorkflowStep[] {
        // Simple topological sort for dependencies
        const sorted: WorkflowStep[] = [];
        const visited = new Set<string>();
        const visiting = new Set<string>();

        const visit = (step: WorkflowStep) => {
            if (visiting.has(step.id)) {
                throw new Error('Circular dependency detected');
            }
            if (visited.has(step.id)) {
                return;
            }

            visiting.add(step.id);
            
            for (const depId of step.dependencies) {
                const depStep = steps.find(s => s.id === depId);
                if (depStep) {
                    visit(depStep);
                }
            }
            
            visiting.delete(step.id);
            visited.add(step.id);
            sorted.push(step);
        };

        for (const step of steps) {
            if (!visited.has(step.id)) {
                visit(step);
            }
        }

        return sorted;
    }

    private shouldRollback(step: WorkflowStep): boolean {
        // Determine if rollback is needed based on step failure
        return step.action.includes('delete') || step.action.includes('modify');
    }
}

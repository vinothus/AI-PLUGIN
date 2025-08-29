"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedOrchestrator = exports.OrchestratorState = void 0;
// Advanced State Management
var OrchestratorState;
(function (OrchestratorState) {
    OrchestratorState["IDLE"] = "idle";
    OrchestratorState["INITIALIZING"] = "initializing";
    OrchestratorState["PLANNING"] = "planning";
    OrchestratorState["PENDING_APPROVAL"] = "pending_approval";
    OrchestratorState["APPROVED"] = "approved";
    OrchestratorState["EXECUTING"] = "executing";
    OrchestratorState["EVALUATING"] = "evaluating";
    OrchestratorState["COMPLETED"] = "completed";
    OrchestratorState["FAILED"] = "failed";
    OrchestratorState["CANCELLED"] = "cancelled";
    OrchestratorState["ROLLING_BACK"] = "rolling_back";
    OrchestratorState["ERROR_RECOVERY"] = "error_recovery";
    OrchestratorState["CONTEXT_UPDATING"] = "context_updating";
    OrchestratorState["CHECKPOINT_CREATING"] = "checkpoint_creating";
    OrchestratorState["CHECKPOINT_RESTORING"] = "checkpoint_restoring";
})(OrchestratorState || (exports.OrchestratorState = OrchestratorState = {}));
class AdvancedOrchestrator {
    constructor(aiGateway, contextManager, fileSystemManager, securityManager) {
        // Advanced State Management
        this.currentState = OrchestratorState.IDLE;
        this.stateHistory = [];
        this.stateTransitions = new Map();
        // Comprehensive Tool Tracking
        this.toolExecutionStates = new Map();
        this.toolExecutionHistory = [];
        this.activeTools = new Set();
        this.toolMetrics = new Map();
        // Advanced Context Integration
        this.contextHistory = new Map();
        this.contextUpdates = [];
        this.contextWindowUsage = 0;
        this.contextOptimizationMetrics = {
            charactersSaved: 0,
            filesOptimized: 0,
            contextWindowUsage: 0
        };
        // Focus Chain Management
        this.focusChain = [];
        this.focusChainHistory = [];
        this.workflowHistory = [];
        this.executedSteps = [];
        // Checkpoint System
        this.checkpoints = [];
        this.checkpointAutoSave = true;
        this.checkpointInterval = 300000; // 5 minutes
        // Error Recovery
        this.errorHistory = [];
        this.consecutiveErrors = 0;
        this.maxConsecutiveErrors = 3;
        // Performance Monitoring
        this.performanceMetrics = {
            totalExecutions: 0,
            averageExecutionTime: 0,
            successRate: 0,
            contextOptimizationRate: 0,
            toolEfficiency: 0
        };
        this.aiGateway = aiGateway;
        this.contextManager = contextManager;
        this.fileSystemManager = fileSystemManager;
        this.securityManager = securityManager;
        this.initializeStateTransitions();
        this.startCheckpointTimer();
    }
    /**
     * Initialize state transition rules
     */
    initializeStateTransitions() {
        this.stateTransitions.set(OrchestratorState.IDLE, [
            OrchestratorState.INITIALIZING,
            OrchestratorState.PLANNING,
            OrchestratorState.CHECKPOINT_RESTORING
        ]);
        this.stateTransitions.set(OrchestratorState.INITIALIZING, [
            OrchestratorState.PLANNING,
            OrchestratorState.ERROR_RECOVERY
        ]);
        this.stateTransitions.set(OrchestratorState.PLANNING, [
            OrchestratorState.PENDING_APPROVAL,
            OrchestratorState.ERROR_RECOVERY,
            OrchestratorState.CANCELLED
        ]);
        this.stateTransitions.set(OrchestratorState.PENDING_APPROVAL, [
            OrchestratorState.APPROVED,
            OrchestratorState.CANCELLED,
            OrchestratorState.ERROR_RECOVERY
        ]);
        this.stateTransitions.set(OrchestratorState.APPROVED, [
            OrchestratorState.EXECUTING,
            OrchestratorState.ERROR_RECOVERY
        ]);
        this.stateTransitions.set(OrchestratorState.EXECUTING, [
            OrchestratorState.EVALUATING,
            OrchestratorState.ROLLING_BACK,
            OrchestratorState.ERROR_RECOVERY,
            OrchestratorState.CANCELLED
        ]);
        this.stateTransitions.set(OrchestratorState.EVALUATING, [
            OrchestratorState.COMPLETED,
            OrchestratorState.FAILED,
            OrchestratorState.ROLLING_BACK,
            OrchestratorState.CONTEXT_UPDATING
        ]);
        this.stateTransitions.set(OrchestratorState.COMPLETED, [
            OrchestratorState.IDLE,
            OrchestratorState.CHECKPOINT_CREATING
        ]);
        this.stateTransitions.set(OrchestratorState.FAILED, [
            OrchestratorState.ROLLING_BACK,
            OrchestratorState.ERROR_RECOVERY,
            OrchestratorState.IDLE
        ]);
        this.stateTransitions.set(OrchestratorState.ROLLING_BACK, [
            OrchestratorState.FAILED,
            OrchestratorState.ERROR_RECOVERY,
            OrchestratorState.IDLE
        ]);
        this.stateTransitions.set(OrchestratorState.ERROR_RECOVERY, [
            OrchestratorState.IDLE,
            OrchestratorState.FAILED
        ]);
        this.stateTransitions.set(OrchestratorState.CONTEXT_UPDATING, [
            OrchestratorState.COMPLETED,
            OrchestratorState.EXECUTING
        ]);
        this.stateTransitions.set(OrchestratorState.CHECKPOINT_CREATING, [
            OrchestratorState.IDLE
        ]);
        this.stateTransitions.set(OrchestratorState.CHECKPOINT_RESTORING, [
            OrchestratorState.IDLE,
            OrchestratorState.ERROR_RECOVERY
        ]);
    }
    /**
     * Start checkpoint timer for auto-save
     */
    startCheckpointTimer() {
        if (this.checkpointAutoSave) {
            setInterval(() => {
                if (this.currentState !== OrchestratorState.IDLE) {
                    this.createCheckpoint('Auto-save checkpoint');
                }
            }, this.checkpointInterval);
        }
    }
    /**
     * Transition to a new state
     */
    async transitionToState(newState, reason, metadata) {
        const allowedTransitions = this.stateTransitions.get(this.currentState) || [];
        if (!allowedTransitions.includes(newState)) {
            throw new Error(`Invalid state transition from ${this.currentState} to ${newState}`);
        }
        const oldState = this.currentState;
        this.currentState = newState;
        this.stateHistory.push({
            state: newState,
            timestamp: Date.now(),
            reason,
            metadata
        });
        // Log state transition
        console.log(`Orchestrator state transition: ${oldState} → ${newState} (${reason || 'No reason'})`);
        // Handle state-specific actions
        await this.handleStateTransition(oldState, newState, metadata);
    }
    /**
     * Handle state-specific actions
     */
    async handleStateTransition(oldState, newState, metadata) {
        switch (newState) {
            case OrchestratorState.INITIALIZING:
                await this.initializeOrchestrator();
                break;
            case OrchestratorState.PLANNING:
                await this.startPlanning(metadata?.task);
                break;
            case OrchestratorState.EXECUTING:
                await this.startExecution();
                break;
            case OrchestratorState.EVALUATING:
                await this.evaluateExecution();
                break;
            case OrchestratorState.ROLLING_BACK:
                await this.startRollback();
                break;
            case OrchestratorState.ERROR_RECOVERY:
                await this.handleErrorRecovery();
                break;
            case OrchestratorState.CONTEXT_UPDATING:
                await this.updateContext();
                break;
            case OrchestratorState.CHECKPOINT_CREATING:
                await this.createCheckpoint(metadata?.name || 'Manual checkpoint');
                break;
            case OrchestratorState.CHECKPOINT_RESTORING:
                await this.restoreCheckpoint(metadata?.checkpointId);
                break;
        }
    }
    /**
     * Initialize the orchestrator
     */
    async initializeOrchestrator() {
        try {
            // Load context history
            await this.loadContextHistory();
            // Load focus chain
            await this.loadFocusChain();
            // Load checkpoints
            await this.loadCheckpoints();
            // Initialize tool metrics
            await this.initializeToolMetrics();
            await this.transitionToState(OrchestratorState.IDLE, 'Initialization completed');
        }
        catch (error) {
            await this.handleError(error);
        }
    }
    /**
     * Start workflow planning
     */
    async startWorkflow(task) {
        try {
            await this.transitionToState(OrchestratorState.PLANNING, 'Starting workflow planning', { task });
            const plan = await this.generateAdvancedPlan(task);
            this.currentPlan = plan;
            await this.transitionToState(OrchestratorState.PENDING_APPROVAL, 'Plan generated, awaiting approval');
            return plan;
        }
        catch (error) {
            await this.handleError(error);
            throw error;
        }
    }
    /**
     * Generate advanced workflow plan
     */
    async generateAdvancedPlan(task) {
        const context = await this.contextManager.getComprehensiveContext();
        const planPrompt = `
            Generate a comprehensive workflow plan for the following task:
            Task: ${task}
            
            Context: ${JSON.stringify(context, null, 2)}
            
            Please provide a detailed plan with:
            1. Step-by-step breakdown
            2. Dependencies between steps
            3. Risk assessment
            4. Success criteria
            5. Rollback plan
            6. Estimated duration
            7. Complexity assessment
        `;
        const response = await this.aiGateway.sendMessage(planPrompt, context);
        return this.parseAdvancedPlanResponse(response, task);
    }
    /**
     * Parse AI response into advanced workflow plan
     */
    parseAdvancedPlanResponse(response, task) {
        // Parse the AI response and create structured plan
        const plan = {
            id: this.generatePlanId(),
            task,
            description: response.description || task,
            steps: response.steps || [],
            estimatedDuration: response.estimatedDuration || 0,
            complexity: response.complexity || 'medium',
            riskLevel: response.riskLevel || 'medium',
            dependencies: response.dependencies || [],
            prerequisites: response.prerequisites || [],
            successCriteria: response.successCriteria || [],
            rollbackPlan: response.rollbackPlan || [],
            approvalRequired: response.approvalRequired !== false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            status: 'draft'
        };
        return plan;
    }
    /**
     * Approve the current plan
     */
    async approvePlan(approvedBy) {
        if (!this.currentPlan) {
            throw new Error('No plan to approve');
        }
        this.currentPlan.approvedBy = approvedBy;
        this.currentPlan.approvedAt = Date.now();
        this.currentPlan.status = 'approved';
        await this.transitionToState(OrchestratorState.APPROVED, 'Plan approved', { approvedBy });
    }
    /**
     * Execute the approved plan
     */
    async executePlan() {
        if (!this.currentPlan) {
            throw new Error('No plan to execute');
        }
        if (this.currentPlan.status !== 'approved') {
            throw new Error('Plan must be approved before execution');
        }
        try {
            await this.transitionToState(OrchestratorState.EXECUTING, 'Starting plan execution');
            const result = await this.executeSteps(this.currentPlan.steps);
            await this.transitionToState(OrchestratorState.EVALUATING, 'Execution completed, evaluating results');
            return result;
        }
        catch (error) {
            await this.handleError(error);
            throw error;
        }
    }
    /**
     * Execute workflow steps
     */
    async executeSteps(steps) {
        const sortedSteps = this.sortStepsByDependencies(steps);
        const results = new Map();
        for (const step of sortedSteps) {
            try {
                await this.executeStep(step);
                results.set(step.id, step.result);
                this.executedSteps.push(step);
            }
            catch (error) {
                step.status = 'failed';
                step.error = error instanceof Error ? error.message : String(error);
                if (this.shouldRollback(step)) {
                    await this.transitionToState(OrchestratorState.ROLLING_BACK, 'Step failed, initiating rollback');
                    break;
                }
            }
        }
        return results;
    }
    /**
     * Execute a single step
     */
    async executeStep(step) {
        step.status = 'executing';
        step.startTime = Date.now();
        // Create tool execution state
        const toolState = {
            toolId: step.id,
            toolName: step.action,
            status: 'executing',
            startTime: Date.now(),
            parameters: step.parameters,
            approvalRequired: step.approvalRequired,
            retryCount: 0,
            maxRetries: step.maxRetries,
            contextSnapshot: await this.contextManager.getComprehensiveContext(),
            metadata: new Map()
        };
        this.toolExecutionStates.set(step.id, toolState);
        this.activeTools.add(step.id);
        try {
            // Execute the step based on action type
            const result = await this.executeStepAction(step);
            step.result = result;
            step.status = 'completed';
            step.endTime = Date.now();
            toolState.status = 'completed';
            toolState.endTime = Date.now();
            toolState.result = result;
            this.updateToolMetrics(step.action, true, step.endTime - step.startTime);
        }
        catch (error) {
            step.status = 'failed';
            step.error = error instanceof Error ? error.message : String(error);
            step.endTime = Date.now();
            toolState.status = 'failed';
            toolState.endTime = Date.now();
            toolState.error = step.error;
            this.updateToolMetrics(step.action, false, step.endTime - step.startTime);
            throw error;
        }
        finally {
            this.activeTools.delete(step.id);
            this.toolExecutionHistory.push(toolState);
        }
    }
    /**
     * Execute step action
     */
    async executeStepAction(step) {
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
     * Execute command with security validation
     */
    async executeCommand(command, workingDirectory) {
        // Validate command with security manager
        await this.securityManager.validateCommand(command);
        // Execute command (placeholder implementation)
        return `Command executed: ${command}`;
    }
    /**
     * Evaluate execution results
     */
    async evaluateExecution() {
        const failedSteps = this.executedSteps.filter(step => step.status === 'failed');
        if (failedSteps.length === 0) {
            await this.transitionToState(OrchestratorState.COMPLETED, 'All steps completed successfully');
        }
        else {
            await this.transitionToState(OrchestratorState.FAILED, `${failedSteps.length} steps failed`);
        }
    }
    /**
     * Start rollback process
     */
    async startRollback() {
        try {
            for (const step of this.executedSteps.reverse()) {
                if (step.rollbackData) {
                    await this.rollbackStep(step);
                }
            }
            await this.transitionToState(OrchestratorState.FAILED, 'Rollback completed');
        }
        catch (error) {
            await this.handleError(error);
        }
    }
    /**
     * Rollback a single step
     */
    async rollbackStep(step) {
        // Implement step-specific rollback logic
        console.log(`Rolling back step: ${step.id}`);
    }
    /**
     * Handle error recovery
     */
    async handleErrorRecovery() {
        this.consecutiveErrors++;
        if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
            await this.transitionToState(OrchestratorState.FAILED, 'Max consecutive errors reached');
        }
        else {
            // Attempt recovery
            await this.transitionToState(OrchestratorState.IDLE, 'Error recovery completed');
        }
    }
    /**
     * Handle error
     */
    async handleError(error) {
        this.errorHistory.push({
            error,
            timestamp: Date.now(),
            state: this.currentState
        });
        await this.transitionToState(OrchestratorState.ERROR_RECOVERY, 'Error occurred', { error: error.message });
    }
    /**
     * Update context
     */
    async updateContext() {
        const context = await this.contextManager.getComprehensiveContext();
        // Update context history
        const contextHistory = {
            messageIndex: this.contextHistory.size,
            editType: 'add',
            updates: new Map(),
            contextSnapshot: context,
            tokenUsage: {
                input: 0,
                output: 0,
                total: 0
            }
        };
        this.contextHistory.set(Date.now(), contextHistory);
        await this.transitionToState(OrchestratorState.COMPLETED, 'Context updated');
    }
    /**
     * Create checkpoint
     */
    async createCheckpoint(name) {
        const checkpoint = {
            id: this.generateCheckpointId(),
            name,
            description: `Checkpoint created at ${new Date().toISOString()}`,
            timestamp: Date.now(),
            state: this.currentState,
            contextSnapshot: await this.contextManager.getComprehensiveContext(),
            toolStates: new Map(this.toolExecutionStates),
            focusChain: [...this.focusChain],
            workflowPlan: this.currentPlan,
            metadata: new Map(),
            fileChanges: []
        };
        this.checkpoints.push(checkpoint);
        this.currentCheckpoint = checkpoint;
        await this.saveCheckpoints();
        return checkpoint;
    }
    /**
     * Restore checkpoint
     */
    async restoreCheckpoint(checkpointId) {
        const checkpoint = this.checkpoints.find(cp => cp.id === checkpointId);
        if (!checkpoint) {
            throw new Error(`Checkpoint not found: ${checkpointId}`);
        }
        // Restore state
        this.currentState = checkpoint.state;
        this.currentPlan = checkpoint.workflowPlan;
        this.focusChain = [...checkpoint.focusChain];
        // Restore tool states
        this.toolExecutionStates = new Map(checkpoint.toolStates);
        await this.transitionToState(OrchestratorState.IDLE, 'Checkpoint restored');
    }
    /**
     * Get current state
     */
    getCurrentState() {
        return this.currentState;
    }
    /**
     * Get state history
     */
    getStateHistory() {
        return [...this.stateHistory];
    }
    /**
     * Get tool execution states
     */
    getToolExecutionStates() {
        return new Map(this.toolExecutionStates);
    }
    /**
     * Get tool metrics
     */
    getToolMetrics() {
        return new Map(this.toolMetrics);
    }
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    /**
     * Get focus chain
     */
    getFocusChain() {
        return [...this.focusChain];
    }
    /**
     * Get checkpoints
     */
    getCheckpoints() {
        return [...this.checkpoints];
    }
    /**
     * Cancel current workflow
     */
    async cancelWorkflow() {
        await this.transitionToState(OrchestratorState.CANCELLED, 'Workflow cancelled by user');
    }
    // Utility methods
    generatePlanId() {
        return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateCheckpointId() {
        return `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    sortStepsByDependencies(steps) {
        // Implement topological sort for dependencies
        return steps.sort((a, b) => {
            if (a.dependencies.includes(b.id))
                return 1;
            if (b.dependencies.includes(a.id))
                return -1;
            return 0;
        });
    }
    shouldRollback(step) {
        return step.status === 'failed' && step.retryCount >= step.maxRetries;
    }
    updateToolMetrics(toolName, success, duration) {
        const metrics = this.toolMetrics.get(toolName) || {
            totalExecutions: 0,
            successRate: 0,
            avgDuration: 0
        };
        metrics.totalExecutions++;
        metrics.successRate = (metrics.successRate * (metrics.totalExecutions - 1) + (success ? 1 : 0)) / metrics.totalExecutions;
        metrics.avgDuration = (metrics.avgDuration * (metrics.totalExecutions - 1) + duration) / metrics.totalExecutions;
        this.toolMetrics.set(toolName, metrics);
    }
    async initializeToolMetrics() {
        // Initialize tool metrics from saved data
    }
    async loadContextHistory() {
        // Load context history from persistent storage
    }
    async loadFocusChain() {
        // Load focus chain from persistent storage
    }
    async loadCheckpoints() {
        // Load checkpoints from persistent storage
    }
    async saveCheckpoints() {
        // Save checkpoints to persistent storage
    }
    // Placeholder methods for state transitions
    async startPlanning(task) {
        // Implementation for planning state
    }
    async startExecution() {
        // Implementation for execution state
    }
}
exports.AdvancedOrchestrator = AdvancedOrchestrator;
//# sourceMappingURL=AdvancedOrchestrator.js.map
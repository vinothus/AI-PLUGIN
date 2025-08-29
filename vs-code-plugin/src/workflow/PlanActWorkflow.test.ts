import { PlanActWorkflow, WorkflowState } from './PlanActWorkflow';

// Mock dependencies
jest.mock('../ai/AiProviderGateway');
jest.mock('../context/ContextManager');
jest.mock('../filesystem/FileSystemManager');

describe('PlanActWorkflow', () => {
    let workflow: PlanActWorkflow;

    beforeEach(() => {
        // Create a simple workflow instance
        workflow = new PlanActWorkflow({} as any, {} as any, {} as any);
    });

    describe('state management', () => {
        it('should start in IDLE state', () => {
            expect(workflow.getCurrentState()).toBe(WorkflowState.IDLE);
        });

        it('should track state history', () => {
            const history = workflow.getStateHistory();
            expect(history).toHaveLength(1);
            expect(history[0].state).toBe(WorkflowState.IDLE);
        });

        it('should return current plan', () => {
            expect(workflow.getCurrentPlan()).toBeNull();
        });
    });

    describe('workflow lifecycle', () => {
        it('should handle workflow cancellation', async () => {
            await workflow.cancelWorkflow();
            expect(workflow.getCurrentState()).toBe(WorkflowState.CANCELLED);
        });
    });
});

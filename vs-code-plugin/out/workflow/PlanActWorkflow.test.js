"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PlanActWorkflow_1 = require("./PlanActWorkflow");
// Mock dependencies
jest.mock('../ai/AiProviderGateway');
jest.mock('../context/ContextManager');
jest.mock('../filesystem/FileSystemManager');
describe('PlanActWorkflow', () => {
    let workflow;
    beforeEach(() => {
        // Create a simple workflow instance
        workflow = new PlanActWorkflow_1.PlanActWorkflow({}, {}, {});
    });
    describe('state management', () => {
        it('should start in IDLE state', () => {
            expect(workflow.getCurrentState()).toBe(PlanActWorkflow_1.WorkflowState.IDLE);
        });
        it('should track state history', () => {
            const history = workflow.getStateHistory();
            expect(history).toHaveLength(1);
            expect(history[0].state).toBe(PlanActWorkflow_1.WorkflowState.IDLE);
        });
        it('should return current plan', () => {
            expect(workflow.getCurrentPlan()).toBeNull();
        });
    });
    describe('workflow lifecycle', () => {
        it('should handle workflow cancellation', async () => {
            await workflow.cancelWorkflow();
            expect(workflow.getCurrentState()).toBe(PlanActWorkflow_1.WorkflowState.CANCELLED);
        });
    });
});
//# sourceMappingURL=PlanActWorkflow.test.js.map
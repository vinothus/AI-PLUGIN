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
exports.AiPluginManager = void 0;
const vscode = __importStar(require("vscode"));
const AiProviderGateway_1 = require("../ai/AiProviderGateway");
const ContextManager_1 = require("../context/ContextManager");
const FileSystemManager_1 = require("../filesystem/FileSystemManager");
const AdvancedOrchestrator_1 = require("../workflow/AdvancedOrchestrator");
const TerminalManager_1 = require("../terminal/TerminalManager");
const CodeGenerationEngine_1 = require("../codegen/CodeGenerationEngine");
const McpClient_1 = require("../mcp/McpClient");
class AiPluginManager {
    constructor(context, securityManager) {
        this.isInitialized = false;
        this.context = context;
        this.securityManager = securityManager;
        this.aiProviderGateway = new AiProviderGateway_1.AiProviderGateway();
        this.contextManager = new ContextManager_1.ContextManager();
        this.fileSystemManager = new FileSystemManager_1.FileSystemManager();
        this.advancedOrchestrator = new AdvancedOrchestrator_1.AdvancedOrchestrator(this.aiProviderGateway, this.contextManager, this.fileSystemManager, this.securityManager);
        this.terminalManager = new TerminalManager_1.TerminalManager();
        this.codeGenerationEngine = new CodeGenerationEngine_1.CodeGenerationEngine(this.aiProviderGateway, this.contextManager, this.fileSystemManager);
        this.mcpClient = new McpClient_1.McpClient();
    }
    async initialize() {
        try {
            // Initialize security manager
            await this.securityManager.initialize();
            // Initialize AI provider gateway
            await this.aiProviderGateway.initialize();
            // Initialize context manager with workspace
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                await this.contextManager.initialize(workspaceFolders[0].uri.fsPath);
            }
            // Initialize file system manager
            // FileSystemManager doesn't need initialization
            // Initialize Phase 2 components
            await this.initializePhase2Components();
            this.isInitialized = true;
            vscode.window.showInformationMessage('Enterprise AI Plugin initialized successfully');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to initialize Enterprise AI Plugin: ${error}`);
            throw error;
        }
    }
    async start() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        try {
            // Start the AI assistant
            await this.aiProviderGateway.connect();
            // Show the chat interface
            await this.showChatInterface();
            vscode.window.showInformationMessage('Enterprise AI Plugin started successfully');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to start Enterprise AI Plugin: ${error}`);
        }
    }
    async showConfiguration() {
        const configuration = vscode.workspace.getConfiguration('enterpriseAiPlugin');
        // Show configuration options
        const serverUrl = await vscode.window.showInputBox({
            prompt: 'Enter server URL',
            value: configuration.get('serverUrl') || '',
            placeHolder: 'https://your-enterprise-server.com'
        });
        if (serverUrl !== undefined) {
            await configuration.update('serverUrl', serverUrl, vscode.ConfigurationTarget.Global);
        }
        // Show other configuration options
        const authType = await vscode.window.showQuickPick(['sso', 'api-key', 'oauth'], {
            placeHolder: 'Select authentication type'
        });
        if (authType) {
            await configuration.update('authType', authType, vscode.ConfigurationTarget.Global);
        }
    }
    async showChatInterface() {
        // Create and show chat webview
        const panel = vscode.window.createWebviewPanel('aiChat', 'AI Chat', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = this.getChatWebviewContent();
        // Handle messages from webview
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'sendMessage':
                    await this.handleChatMessage(message.text);
                    break;
                case 'getContext':
                    const context = await this.contextManager.getComprehensiveContext();
                    panel.webview.postMessage({ command: 'context', data: context });
                    break;
                case 'startWorkflow':
                    await this.startAdvancedWorkflow(message.task);
                    break;
                case 'getOrchestratorState':
                    const state = this.advancedOrchestrator.getCurrentState();
                    panel.webview.postMessage({ command: 'orchestratorState', data: state });
                    break;
                case 'getToolMetrics':
                    const metrics = this.advancedOrchestrator.getToolMetrics();
                    panel.webview.postMessage({ command: 'toolMetrics', data: Array.from(metrics.entries()) });
                    break;
            }
        }, undefined, this.context.subscriptions);
    }
    async handleChatMessage(message) {
        try {
            // Get current context
            const context = await this.contextManager.getComprehensiveContext();
            // Send to AI provider
            const response = await this.aiProviderGateway.sendMessage(message, context);
            // Handle response (could be code generation, file operations, etc.)
            await this.handleAiResponse(response);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error processing message: ${error}`);
        }
    }
    async handleAiResponse(response) {
        // Handle different types of AI responses
        if (response.type === 'code_generation') {
            await this.fileSystemManager.createFile(response.filePath, response.content);
        }
        else if (response.type === 'file_modification') {
            await this.fileSystemManager.modifyFile(response.filePath, response.changes);
        }
        else if (response.type === 'command_execution') {
            // Handle command execution with security validation
            await this.securityManager.validateCommand(response.command);
        }
        else if (response.type === 'workflow_plan') {
            // Handle workflow planning
            await this.handleWorkflowPlan(response);
        }
        else if (response.type === 'code_refactoring') {
            // Handle code refactoring
            await this.handleCodeRefactoring(response);
        }
    }
    /**
     * Start advanced workflow
     */
    async startAdvancedWorkflow(task) {
        try {
            const plan = await this.advancedOrchestrator.startWorkflow(task);
            vscode.window.showInformationMessage(`Advanced workflow plan generated: ${plan.steps.length} steps`);
            // Show plan approval dialog
            const approved = await vscode.window.showInformationMessage(`Workflow plan ready for approval. ${plan.steps.length} steps identified.`, 'Approve', 'Reject');
            if (approved === 'Approve') {
                await this.advancedOrchestrator.approvePlan('user');
                const result = await this.advancedOrchestrator.executePlan();
                vscode.window.showInformationMessage(`Workflow completed: ${result.size} steps executed`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Advanced workflow failed: ${error}`);
        }
    }
    /**
     * Initialize Phase 2 components
     */
    async initializePhase2Components() {
        try {
            // Initialize MCP client
            await this.mcpClient.connect();
            vscode.window.showInformationMessage('Phase 2 components initialized successfully');
        }
        catch (error) {
            console.warn('Some Phase 2 components failed to initialize:', error);
        }
    }
    /**
     * Handle workflow planning
     */
    async handleWorkflowPlan(response) {
        try {
            await this.startAdvancedWorkflow(response.task);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Workflow planning failed: ${error}`);
        }
    }
    /**
     * Handle code refactoring
     */
    async handleCodeRefactoring(response) {
        try {
            const result = await this.codeGenerationEngine.refactorCode(response.filePath, response.refactoringType, response.options);
            vscode.window.showInformationMessage(`Code refactored successfully: ${result.explanation}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Code refactoring failed: ${error}`);
        }
    }
    /**
     * Get Phase 2 components for external access
     */
    getPhase2Components() {
        return {
            advancedOrchestrator: this.advancedOrchestrator,
            terminalManager: this.terminalManager,
            codeGenerationEngine: this.codeGenerationEngine,
            mcpClient: this.mcpClient
        };
    }
    getChatWebviewContent() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AI Chat</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        margin: 0;
                        padding: 20px;
                    }
                    .chat-container {
                        display: flex;
                        flex-direction: column;
                        height: 100vh;
                    }
                    .chat-messages {
                        flex: 1;
                        overflow-y: auto;
                        margin-bottom: 20px;
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 4px;
                        padding: 10px;
                    }
                    .message {
                        margin-bottom: 10px;
                        padding: 10px;
                        border-radius: 4px;
                    }
                    .user-message {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        margin-left: 20%;
                    }
                    .ai-message {
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        margin-right: 20%;
                    }
                    .input-container {
                        display: flex;
                        gap: 10px;
                    }
                    input {
                        flex: 1;
                        padding: 10px;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                    }
                    button {
                        padding: 10px 20px;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .workflow-controls {
                        margin-bottom: 10px;
                        padding: 10px;
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="chat-container">
                    <div class="workflow-controls">
                        <h3>Advanced Workflow Controls</h3>
                        <button onclick="startWorkflow()">Start Workflow</button>
                        <button onclick="getOrchestratorState()">Get State</button>
                        <button onclick="getToolMetrics()">Get Metrics</button>
                    </div>
                    <div class="chat-messages" id="messages">
                        <div class="message ai-message">
                            Hello! I'm your Enterprise AI Assistant with advanced workflow capabilities. How can I help you today?
                        </div>
                    </div>
                    <div class="input-container">
                        <input type="text" id="messageInput" placeholder="Type your message...">
                        <button onclick="sendMessage()">Send</button>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function sendMessage() {
                        const input = document.getElementById('messageInput');
                        const message = input.value.trim();
                        
                        if (message) {
                            // Add user message to chat
                            addMessage(message, 'user');
                            
                            // Send to extension
                            vscode.postMessage({
                                command: 'sendMessage',
                                text: message
                            });
                            
                            input.value = '';
                        }
                    }
                    
                    function startWorkflow() {
                        const task = prompt('Enter task for workflow:');
                        if (task) {
                            vscode.postMessage({
                                command: 'startWorkflow',
                                task: task
                            });
                        }
                    }
                    
                    function getOrchestratorState() {
                        vscode.postMessage({
                            command: 'getOrchestratorState'
                        });
                    }
                    
                    function getToolMetrics() {
                        vscode.postMessage({
                            command: 'getToolMetrics'
                        });
                    }
                    
                    function addMessage(text, sender) {
                        const messages = document.getElementById('messages');
                        const messageDiv = document.createElement('div');
                        messageDiv.className = \`message \${sender}-message\`;
                        messageDiv.textContent = text;
                        messages.appendChild(messageDiv);
                        messages.scrollTop = messages.scrollHeight;
                    }
                    
                    // Handle messages from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'aiResponse':
                                addMessage(message.text, 'ai');
                                break;
                            case 'orchestratorState':
                                addMessage(\`Orchestrator State: \${message.data}\`, 'ai');
                                break;
                            case 'toolMetrics':
                                addMessage(\`Tool Metrics: \${JSON.stringify(message.data, null, 2)}\`, 'ai');
                                break;
                        }
                    });
                    
                    // Handle Enter key
                    document.getElementById('messageInput').addEventListener('keypress', function(e) {
                        if (e.key === 'Enter') {
                            sendMessage();
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
    /**
     * Get optimized context with advanced management
     */
    async getCurrentContext() {
        return await this.contextManager.getOptimizedContext();
    }
    /**
     * Get context optimization metrics
     */
    async getContextOptimizationMetrics() {
        return this.contextManager.getContextOptimizationMetrics();
    }
    /**
     * Update token usage for context optimization
     */
    updateTokenUsage(usage) {
        this.contextManager.updateTokenUsage(usage);
    }
    /**
     * Get context history
     */
    getContextHistory() {
        return this.contextManager.getContextHistory();
    }
    /**
     * Get files in context
     */
    getFilesInContext() {
        return this.contextManager.getFilesInContext();
    }
    /**
     * Get recently modified files
     */
    getRecentlyModifiedFiles() {
        return this.contextManager.getAndClearRecentlyModifiedFiles();
    }
    /**
     * Get advanced orchestrator
     */
    getAdvancedOrchestrator() {
        return this.advancedOrchestrator;
    }
    /**
     * Dispose resources
     */
    dispose() {
        this.contextManager.dispose();
    }
}
exports.AiPluginManager = AiPluginManager;
//# sourceMappingURL=AiPluginManager.js.map
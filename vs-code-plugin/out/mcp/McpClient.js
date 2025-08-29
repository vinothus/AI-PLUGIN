"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpClient = void 0;
const ws_1 = __importDefault(require("ws"));
class McpClient {
    constructor() {
        this.servers = new Map();
        this.tools = new Map();
        this.connections = new Map();
        this.isConnected = false;
        this.toolRegistry = new Map();
        this.loadDefaultServers();
    }
    /**
     * Connect to MCP servers
     */
    async connect() {
        try {
            for (const [serverName, config] of this.servers) {
                if (config.enabled) {
                    await this.connectToServer(serverName, config);
                }
            }
            this.isConnected = true;
        }
        catch (error) {
            throw new Error(`Failed to connect to MCP servers: ${error}`);
        }
    }
    /**
     * Connect to a specific MCP server
     */
    async connectToServer(serverName, config) {
        return new Promise((resolve, reject) => {
            try {
                const ws = new ws_1.default(config.url);
                ws.on('open', () => {
                    console.log(`Connected to MCP server: ${serverName}`);
                    this.connections.set(serverName, ws);
                    // Discover tools
                    this.discoverTools(serverName);
                    resolve();
                });
                ws.on('message', (data) => {
                    this.handleServerMessage(serverName, data);
                });
                ws.on('error', (error) => {
                    console.error(`MCP server error (${serverName}):`, error);
                    reject(error);
                });
                ws.on('close', () => {
                    console.log(`Disconnected from MCP server: ${serverName}`);
                    this.connections.delete(serverName);
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Discover available tools from a server
     */
    async discoverTools(serverName) {
        const connection = this.connections.get(serverName);
        if (!connection)
            return;
        const discoveryMessage = {
            type: 'tool_discovery',
            server: serverName,
            timestamp: Date.now()
        };
        connection.send(JSON.stringify(discoveryMessage));
    }
    /**
     * Handle messages from MCP servers
     */
    handleServerMessage(serverName, data) {
        try {
            const message = JSON.parse(data.toString());
            switch (message.type) {
                case 'tool_list':
                    this.registerTools(serverName, message.tools);
                    break;
                case 'tool_result':
                    this.handleToolResult(message);
                    break;
                case 'error':
                    console.error(`MCP server error (${serverName}):`, message.error);
                    break;
                default:
                    console.log(`Unknown MCP message type: ${message.type}`);
            }
        }
        catch (error) {
            console.error(`Failed to parse MCP message:`, error);
        }
    }
    /**
     * Register tools from a server
     */
    registerTools(serverName, tools) {
        const serverTools = [];
        for (const tool of tools) {
            const toolId = `${serverName}:${tool.name}`;
            this.tools.set(toolId, tool);
            serverTools.push(tool);
        }
        this.toolRegistry.set(serverName, serverTools);
        console.log(`Registered ${tools.length} tools from server: ${serverName}`);
    }
    /**
     * Call a tool
     */
    async callTool(toolName, parameters) {
        const tool = this.findTool(toolName);
        if (!tool) {
            throw new Error(`Tool not found: ${toolName}`);
        }
        if (!tool.enabled) {
            throw new Error(`Tool is disabled: ${toolName}`);
        }
        const serverName = this.getServerForTool(toolName);
        const connection = this.connections.get(serverName);
        if (!connection) {
            throw new Error(`Server not connected: ${serverName}`);
        }
        return new Promise((resolve, reject) => {
            const callId = this.generateCallId();
            const startTime = Date.now();
            const toolCall = {
                tool: toolName,
                parameters,
                id: callId
            };
            const message = {
                type: 'tool_call',
                call: toolCall,
                timestamp: Date.now()
            };
            // Set up result handler
            const resultHandler = (result) => {
                if (result.id === callId) {
                    resolve(result);
                }
            };
            // Store result handler (simplified - in real implementation you'd have a proper event system)
            this.resultHandlers = this.resultHandlers || new Map();
            this.resultHandlers.set(callId, resultHandler);
            // Send tool call
            connection.send(JSON.stringify(message));
            // Timeout after 30 seconds
            setTimeout(() => {
                reject(new Error(`Tool call timeout: ${toolName}`));
            }, 30000);
        });
    }
    /**
     * Handle tool result
     */
    handleToolResult(message) {
        const result = {
            id: message.id,
            result: message.result,
            error: message.error,
            executionTime: message.executionTime || 0
        };
        // Find and call result handler
        const resultHandlers = this.resultHandlers;
        if (resultHandlers && resultHandlers.has(result.id)) {
            const handler = resultHandlers.get(result.id);
            handler(result);
            resultHandlers.delete(result.id);
        }
    }
    /**
     * Get available tools
     */
    getAvailableTools() {
        return Array.from(this.tools.values());
    }
    /**
     * Get tools by server
     */
    getToolsByServer(serverName) {
        return this.toolRegistry.get(serverName) || [];
    }
    /**
     * Enable/disable a tool
     */
    setToolEnabled(toolName, enabled) {
        const tool = this.findTool(toolName);
        if (tool) {
            tool.enabled = enabled;
        }
    }
    /**
     * Add a custom tool
     */
    addCustomTool(tool, serverName = 'custom') {
        const toolId = `${serverName}:${tool.name}`;
        this.tools.set(toolId, tool);
        if (!this.toolRegistry.has(serverName)) {
            this.toolRegistry.set(serverName, []);
        }
        this.toolRegistry.get(serverName).push(tool);
    }
    /**
     * Remove a tool
     */
    removeTool(toolName) {
        const tool = this.findTool(toolName);
        if (tool) {
            const serverName = this.getServerForTool(toolName);
            this.tools.delete(`${serverName}:${toolName}`);
            const serverTools = this.toolRegistry.get(serverName);
            if (serverTools) {
                const index = serverTools.findIndex(t => t.name === toolName);
                if (index !== -1) {
                    serverTools.splice(index, 1);
                }
            }
        }
    }
    /**
     * Add MCP server configuration
     */
    addServer(config) {
        this.servers.set(config.name, config);
    }
    /**
     * Remove MCP server
     */
    removeServer(serverName) {
        this.servers.delete(serverName);
        // Close connection if exists
        const connection = this.connections.get(serverName);
        if (connection) {
            connection.close();
            this.connections.delete(serverName);
        }
        // Remove tools from this server
        const serverTools = this.toolRegistry.get(serverName) || [];
        for (const tool of serverTools) {
            this.tools.delete(`${serverName}:${tool.name}`);
        }
        this.toolRegistry.delete(serverName);
    }
    /**
     * Get server configuration
     */
    getServerConfig(serverName) {
        return this.servers.get(serverName);
    }
    /**
     * Get all server configurations
     */
    getAllServerConfigs() {
        return Array.from(this.servers.values());
    }
    /**
     * Check if connected
     */
    isConnectedToServers() {
        return this.isConnected && this.connections.size > 0;
    }
    /**
     * Disconnect from all servers
     */
    disconnect() {
        for (const [serverName, connection] of this.connections) {
            connection.close();
        }
        this.connections.clear();
        this.isConnected = false;
    }
    // Helper methods
    findTool(toolName) {
        for (const [id, tool] of this.tools) {
            if (tool.name === toolName) {
                return tool;
            }
        }
        return undefined;
    }
    getServerForTool(toolName) {
        for (const [id, tool] of this.tools) {
            if (tool.name === toolName) {
                return id.split(':')[0];
            }
        }
        throw new Error(`Tool not found: ${toolName}`);
    }
    generateCallId() {
        return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    loadDefaultServers() {
        // Add some default MCP server configurations
        const defaultServers = [
            {
                name: 'local-tools',
                url: 'ws://localhost:8080/mcp',
                enabled: false,
                permissions: ['read', 'write'],
                tools: []
            },
            {
                name: 'enterprise-tools',
                url: 'wss://tools.enterprise-ai-plugin.com/mcp',
                enabled: false,
                permissions: ['read'],
                tools: []
            }
        ];
        for (const server of defaultServers) {
            this.servers.set(server.name, server);
        }
    }
}
exports.McpClient = McpClient;
//# sourceMappingURL=McpClient.js.map
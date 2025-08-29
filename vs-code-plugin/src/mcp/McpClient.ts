import * as vscode from 'vscode';
import WebSocket from 'ws';

export interface McpTool {
    name: string;
    description: string;
    parameters: McpParameter[];
    returns: McpParameter;
    enabled: boolean;
    permissions: string[];
}

export interface McpParameter {
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: any;
}

export interface McpToolCall {
    tool: string;
    parameters: any;
    id: string;
}

export interface McpToolResult {
    id: string;
    result: any;
    error?: string;
    executionTime: number;
}

export interface McpServerConfig {
    name: string;
    url: string;
    enabled: boolean;
    permissions: string[];
    tools: string[];
}

export class McpClient {
    private servers: Map<string, McpServerConfig> = new Map();
    private tools: Map<string, McpTool> = new Map();
    private connections: Map<string, WebSocket> = new Map();
    private isConnected: boolean = false;
    private toolRegistry: Map<string, McpTool[]> = new Map();

    constructor() {
        this.loadDefaultServers();
    }

    /**
     * Connect to MCP servers
     */
    public async connect(): Promise<void> {
        try {
            for (const [serverName, config] of this.servers) {
                if (config.enabled) {
                    await this.connectToServer(serverName, config);
                }
            }
            this.isConnected = true;
        } catch (error) {
            throw new Error(`Failed to connect to MCP servers: ${error}`);
        }
    }

    /**
     * Connect to a specific MCP server
     */
    private async connectToServer(serverName: string, config: McpServerConfig): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const ws = new WebSocket(config.url);
                
                ws.on('open', () => {
                    console.log(`Connected to MCP server: ${serverName}`);
                    this.connections.set(serverName, ws);
                    
                    // Discover tools
                    this.discoverTools(serverName);
                    resolve();
                });

                ws.on('message', (data: WebSocket.Data) => {
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

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Discover available tools from a server
     */
    private async discoverTools(serverName: string): Promise<void> {
        const connection = this.connections.get(serverName);
        if (!connection) return;

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
    private handleServerMessage(serverName: string, data: WebSocket.Data): void {
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
        } catch (error) {
            console.error(`Failed to parse MCP message:`, error);
        }
    }

    /**
     * Register tools from a server
     */
    private registerTools(serverName: string, tools: McpTool[]): void {
        const serverTools: McpTool[] = [];
        
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
    public async callTool(toolName: string, parameters: any): Promise<McpToolResult> {
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

            const toolCall: McpToolCall = {
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
            const resultHandler = (result: McpToolResult) => {
                if (result.id === callId) {
                    resolve(result);
                }
            };

            // Store result handler (simplified - in real implementation you'd have a proper event system)
            (this as any).resultHandlers = (this as any).resultHandlers || new Map();
            (this as any).resultHandlers.set(callId, resultHandler);

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
    private handleToolResult(message: any): void {
        const result: McpToolResult = {
            id: message.id,
            result: message.result,
            error: message.error,
            executionTime: message.executionTime || 0
        };

        // Find and call result handler
        const resultHandlers = (this as any).resultHandlers;
        if (resultHandlers && resultHandlers.has(result.id)) {
            const handler = resultHandlers.get(result.id);
            handler(result);
            resultHandlers.delete(result.id);
        }
    }

    /**
     * Get available tools
     */
    public getAvailableTools(): McpTool[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get tools by server
     */
    public getToolsByServer(serverName: string): McpTool[] {
        return this.toolRegistry.get(serverName) || [];
    }

    /**
     * Enable/disable a tool
     */
    public setToolEnabled(toolName: string, enabled: boolean): void {
        const tool = this.findTool(toolName);
        if (tool) {
            tool.enabled = enabled;
        }
    }

    /**
     * Add a custom tool
     */
    public addCustomTool(tool: McpTool, serverName: string = 'custom'): void {
        const toolId = `${serverName}:${tool.name}`;
        this.tools.set(toolId, tool);
        
        if (!this.toolRegistry.has(serverName)) {
            this.toolRegistry.set(serverName, []);
        }
        this.toolRegistry.get(serverName)!.push(tool);
    }

    /**
     * Remove a tool
     */
    public removeTool(toolName: string): void {
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
    public addServer(config: McpServerConfig): void {
        this.servers.set(config.name, config);
    }

    /**
     * Remove MCP server
     */
    public removeServer(serverName: string): void {
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
    public getServerConfig(serverName: string): McpServerConfig | undefined {
        return this.servers.get(serverName);
    }

    /**
     * Get all server configurations
     */
    public getAllServerConfigs(): McpServerConfig[] {
        return Array.from(this.servers.values());
    }

    /**
     * Check if connected
     */
    public isConnectedToServers(): boolean {
        return this.isConnected && this.connections.size > 0;
    }

    /**
     * Disconnect from all servers
     */
    public disconnect(): void {
        for (const [serverName, connection] of this.connections) {
            connection.close();
        }
        this.connections.clear();
        this.isConnected = false;
    }

    // Helper methods
    private findTool(toolName: string): McpTool | undefined {
        for (const [id, tool] of this.tools) {
            if (tool.name === toolName) {
                return tool;
            }
        }
        return undefined;
    }

    private getServerForTool(toolName: string): string {
        for (const [id, tool] of this.tools) {
            if (tool.name === toolName) {
                return id.split(':')[0];
            }
        }
        throw new Error(`Tool not found: ${toolName}`);
    }

    private generateCallId(): string {
        return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private loadDefaultServers(): void {
        // Add some default MCP server configurations
        const defaultServers: McpServerConfig[] = [
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

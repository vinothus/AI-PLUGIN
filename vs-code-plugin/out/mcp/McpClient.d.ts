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
export declare class McpClient {
    private servers;
    private tools;
    private connections;
    private isConnected;
    private toolRegistry;
    constructor();
    /**
     * Connect to MCP servers
     */
    connect(): Promise<void>;
    /**
     * Connect to a specific MCP server
     */
    private connectToServer;
    /**
     * Discover available tools from a server
     */
    private discoverTools;
    /**
     * Handle messages from MCP servers
     */
    private handleServerMessage;
    /**
     * Register tools from a server
     */
    private registerTools;
    /**
     * Call a tool
     */
    callTool(toolName: string, parameters: any): Promise<McpToolResult>;
    /**
     * Handle tool result
     */
    private handleToolResult;
    /**
     * Get available tools
     */
    getAvailableTools(): McpTool[];
    /**
     * Get tools by server
     */
    getToolsByServer(serverName: string): McpTool[];
    /**
     * Enable/disable a tool
     */
    setToolEnabled(toolName: string, enabled: boolean): void;
    /**
     * Add a custom tool
     */
    addCustomTool(tool: McpTool, serverName?: string): void;
    /**
     * Remove a tool
     */
    removeTool(toolName: string): void;
    /**
     * Add MCP server configuration
     */
    addServer(config: McpServerConfig): void;
    /**
     * Remove MCP server
     */
    removeServer(serverName: string): void;
    /**
     * Get server configuration
     */
    getServerConfig(serverName: string): McpServerConfig | undefined;
    /**
     * Get all server configurations
     */
    getAllServerConfigs(): McpServerConfig[];
    /**
     * Check if connected
     */
    isConnectedToServers(): boolean;
    /**
     * Disconnect from all servers
     */
    disconnect(): void;
    private findTool;
    private getServerForTool;
    private generateCallId;
    private loadDefaultServers;
}
//# sourceMappingURL=McpClient.d.ts.map
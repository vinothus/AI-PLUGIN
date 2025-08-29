package com.enterprise.aiplugin.mcp

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import kotlinx.coroutines.*

@Service
class McpService {
    private val logger = Logger.getInstance(McpService::class.java)
    private val mcpClient = McpClient()
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    /**
     * Initialize MCP service
     */
    suspend fun initialize() {
        try {
            mcpClient.connect()
            logger.info("MCP service initialized successfully")
        } catch (error: Exception) {
            logger.error("Failed to initialize MCP service", error)
        }
    }

    /**
     * Get MCP client instance
     */
    fun getMcpClient(): McpClient {
        return mcpClient
    }

    /**
     * Get available MCP tools
     */
    fun getAvailableTools(): List<McpTool> {
        return mcpClient.getAvailableTools()
    }

    /**
     * Get MCP tools by server
     */
    fun getToolsByServer(serverName: String): List<McpTool> {
        return mcpClient.getToolsByServer(serverName)
    }

    /**
     * Call MCP tool
     */
    suspend fun callTool(toolName: String, parameters: Map<String, Any>): McpToolResult {
        return mcpClient.callTool(toolName, parameters)
    }

    /**
     * Add MCP server
     */
    fun addServer(config: McpServerConfig) {
        mcpClient.addServer(config)
    }

    /**
     * Remove MCP server
     */
    fun removeServer(serverName: String) {
        mcpClient.removeServer(serverName)
    }

    /**
     * Get all server configurations
     */
    fun getAllServerConfigs(): List<McpServerConfig> {
        return mcpClient.getAllServerConfigs()
    }

    /**
     * Get enabled server configurations
     */
    fun getEnabledServerConfigs(): List<McpServerConfig> {
        return mcpClient.getAllServerConfigs().filter { it.enabled }
    }

    /**
     * Check if connected to any MCP servers
     */
    fun isConnected(): Boolean {
        return mcpClient.isConnectedToServers()
    }

    /**
     * Disconnect from all MCP servers
     */
    fun disconnect() {
        mcpClient.disconnect()
    }

    /**
     * Add custom tool
     */
    fun addCustomTool(tool: McpTool, serverName: String = "custom") {
        mcpClient.addCustomTool(tool, serverName)
    }

    /**
     * Remove tool
     */
    fun removeTool(toolName: String) {
        mcpClient.removeTool(toolName)
    }

    /**
     * Enable/disable tool
     */
    fun setToolEnabled(toolName: String, enabled: Boolean) {
        mcpClient.setToolEnabled(toolName, enabled)
    }

    /**
     * Get server configuration
     */
    fun getServerConfig(serverName: String): McpServerConfig? {
        return mcpClient.getServerConfig(serverName)
    }
}

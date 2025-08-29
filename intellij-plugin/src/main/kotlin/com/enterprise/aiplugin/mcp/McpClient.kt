package com.enterprise.aiplugin.mcp

import com.intellij.openapi.diagnostic.Logger
import kotlinx.coroutines.*
import java.net.URI
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit
import java.net.http.HttpClient
import java.net.http.WebSocket
import java.net.http.WebSocket.Listener
import java.util.concurrent.CompletionStage

data class McpTool(
    val name: String,
    val description: String,
    val parameters: List<McpParameter>,
    val returns: McpParameter,
    var enabled: Boolean = true,
    val permissions: List<String> = emptyList()
)

data class McpParameter(
    val name: String,
    val type: String,
    val description: String,
    val required: Boolean,
    val default: Any? = null
)

data class McpToolCall(
    val tool: String,
    val parameters: Map<String, Any>,
    val id: String
)

data class McpToolResult(
    val id: String,
    val result: Any?,
    val error: String? = null,
    val executionTime: Long = 0
)

data class McpServerConfig(
    val name: String,
    val url: String,
    var enabled: Boolean = false,
    val permissions: List<String> = emptyList(),
    val tools: List<String> = emptyList()
)

class McpClient {
    private val logger = Logger.getInstance(McpClient::class.java)
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    private val servers = ConcurrentHashMap<String, McpServerConfig>()
    private val tools = ConcurrentHashMap<String, McpTool>()
    private val connections = ConcurrentHashMap<String, WebSocket>()
    private val toolRegistry = ConcurrentHashMap<String, List<McpTool>>()
    private val pendingResults = ConcurrentHashMap<String, CompletableFuture<McpToolResult>>()
    private val callIdCounter = AtomicInteger(0)
    private val httpClient = HttpClient.newHttpClient()
    
    private var isConnected = false

    init {
        loadDefaultServers()
    }

    /**
     * Connect to MCP servers
     */
    suspend fun connect(): Unit = withContext(Dispatchers.IO) {
        try {
            for ((serverName, config) in servers) {
                if (config.enabled) {
                    connectToServer(serverName, config)
                }
            }
            isConnected = true
            logger.info("Connected to MCP servers")
        } catch (error: Exception) {
            logger.error("Failed to connect to MCP servers", error)
            throw error
        }
    }

    /**
     * Connect to a specific MCP server
     */
    private suspend fun connectToServer(serverName: String, config: McpServerConfig): Unit = withContext(Dispatchers.IO) {
        try {
            val uri = URI(config.url)
            
            httpClient.newWebSocketBuilder()
                .buildAsync(uri, object : Listener {
                    override fun onOpen(webSocket: WebSocket) {
                        logger.info("Connected to MCP server: $serverName")
                        connections[serverName] = webSocket
                        
                        // Discover tools
                        scope.launch {
                            discoverTools(serverName)
                        }
                    }

                    override fun onClose(webSocket: WebSocket, statusCode: Int, reason: String): CompletionStage<*>? {
                        logger.info("Disconnected from MCP server: $serverName")
                        connections.remove(serverName)
                        return null
                    }

                    override fun onError(webSocket: WebSocket, error: Throwable) {
                        logger.error("MCP server error ($serverName)", error)
                    }

                    override fun onText(webSocket: WebSocket, data: CharSequence, last: Boolean): CompletionStage<*>? {
                        handleServerMessage(serverName, data.toString())
                        return null
                    }
                }).join()

        } catch (error: Exception) {
            logger.error("Failed to connect to MCP server: $serverName", error)
            throw error
        }
    }

    /**
     * Discover available tools from a server
     */
    private suspend fun discoverTools(serverName: String): Unit = withContext(Dispatchers.IO) {
        val connection = connections[serverName] ?: return@withContext

        val discoveryMessage = mapOf(
            "type" to "tool_discovery",
            "server" to serverName,
            "timestamp" to System.currentTimeMillis()
        )

        connection.sendText(discoveryMessage.toJson(), true)
    }

    /**
     * Handle messages from MCP servers
     */
    private fun handleServerMessage(serverName: String, message: String) {
        try {
            val data = message.fromJson<Map<String, Any>>()
            
            when (data["type"]) {
                "tool_list" -> {
                    val toolsList = (data["tools"] as? List<Map<String, Any>>)?.map { toolData ->
                        McpTool(
                            name = toolData["name"] as String,
                            description = toolData["description"] as String,
                            parameters = (toolData["parameters"] as? List<Map<String, Any>>)?.map { param ->
                                McpParameter(
                                    name = param["name"] as String,
                                    type = param["type"] as String,
                                    description = param["description"] as String,
                                    required = param["required"] as Boolean,
                                    default = param["default"]
                                )
                            } ?: emptyList(),
                            returns = McpParameter(
                                name = "result",
                                type = "any",
                                description = "Tool result",
                                required = true
                            ),
                            enabled = toolData["enabled"] as? Boolean ?: true,
                            permissions = (toolData["permissions"] as? List<String>) ?: emptyList()
                        )
                    } ?: emptyList()
                    
                    registerTools(serverName, toolsList)
                }
                
                "tool_result" -> {
                    val result = McpToolResult(
                        id = data["id"] as String,
                        result = data["result"],
                        error = data["error"] as? String,
                        executionTime = (data["executionTime"] as? Number)?.toLong() ?: 0
                    )
                    
                    handleToolResult(result)
                }
                
                "error" -> {
                    logger.error("MCP server error ($serverName): ${data["error"]}")
                }
                
                else -> {
                    logger.warn("Unknown MCP message type: ${data["type"]}")
                }
            }
        } catch (error: Exception) {
            logger.error("Failed to parse MCP message", error)
        }
    }

    /**
     * Register tools from a server
     */
    private fun registerTools(serverName: String, toolsList: List<McpTool>) {
        val serverTools = mutableListOf<McpTool>()
        
        for (tool in toolsList) {
            val toolId = "$serverName:${tool.name}"
            tools[toolId] = tool
            serverTools.add(tool)
        }
        
        toolRegistry[serverName] = serverTools
        logger.info("Registered ${toolsList.size} tools from server: $serverName")
    }

    /**
     * Call a tool
     */
    suspend fun callTool(toolName: String, parameters: Map<String, Any>): McpToolResult = withContext(Dispatchers.IO) {
        val tool = findTool(toolName)
        if (tool == null) {
            throw IllegalArgumentException("Tool not found: $toolName")
        }

        if (!tool.enabled) {
            throw IllegalStateException("Tool is disabled: $toolName")
        }

        val serverName = getServerForTool(toolName)
        val connection = connections[serverName]
        
        if (connection == null) {
            throw IllegalStateException("Server not connected: $serverName")
        }

        val callId = generateCallId()

        val toolCall = McpToolCall(
            tool = toolName,
            parameters = parameters,
            id = callId
        )

        val message = mapOf(
            "type" to "tool_call",
            "call" to toolCall,
            "timestamp" to System.currentTimeMillis()
        )

        val future = CompletableFuture<McpToolResult>()
        pendingResults[callId] = future

        try {
            // Send tool call
            connection.sendText(message.toJson(), true)

            // Wait for result with timeout
            val result = future.get(30, TimeUnit.SECONDS)
            result
        } catch (error: Exception) {
            pendingResults.remove(callId)
            throw RuntimeException("Tool call timeout or error: $toolName", error)
        }
    }

    /**
     * Handle tool result
     */
    private fun handleToolResult(result: McpToolResult) {
        val future = pendingResults.remove(result.id)
        if (future != null) {
            future.complete(result)
        }
    }

    /**
     * Get available tools
     */
    fun getAvailableTools(): List<McpTool> {
        return tools.values.toList()
    }

    /**
     * Get tools by server
     */
    fun getToolsByServer(serverName: String): List<McpTool> {
        return toolRegistry[serverName] ?: emptyList()
    }

    /**
     * Enable/disable a tool
     */
    fun setToolEnabled(toolName: String, enabled: Boolean) {
        val tool = findTool(toolName)
        if (tool != null) {
            tool.enabled = enabled
        }
    }

    /**
     * Add a custom tool
     */
    fun addCustomTool(tool: McpTool, serverName: String = "custom") {
        val toolId = "$serverName:${tool.name}"
        tools[toolId] = tool
        
        val serverTools = toolRegistry.getOrDefault(serverName, emptyList()).toMutableList()
        serverTools.add(tool)
        toolRegistry[serverName] = serverTools
    }

    /**
     * Remove a tool
     */
    fun removeTool(toolName: String) {
        val tool = findTool(toolName)
        if (tool != null) {
            val serverName = getServerForTool(toolName)
            tools.remove("$serverName:$toolName")
            
            val serverTools = toolRegistry[serverName]?.toMutableList()
            if (serverTools != null) {
                serverTools.removeAll { it.name == toolName }
                toolRegistry[serverName] = serverTools
            }
        }
    }

    /**
     * Add MCP server configuration
     */
    fun addServer(config: McpServerConfig) {
        servers[config.name] = config
    }

    /**
     * Remove MCP server
     */
    fun removeServer(serverName: String) {
        servers.remove(serverName)
        
        // Close connection if exists
        val connection = connections[serverName]
        if (connection != null) {
            try {
                connection.sendClose(WebSocket.NORMAL_CLOSURE, "Removing server")
            } catch (error: Exception) {
                logger.error("Error closing connection to server: $serverName", error)
            }
            connections.remove(serverName)
        }
        
        // Remove tools from this server
        val serverTools = toolRegistry[serverName] ?: emptyList()
        for (tool in serverTools) {
            tools.remove("$serverName:${tool.name}")
        }
        toolRegistry.remove(serverName)
    }

    /**
     * Get server configuration
     */
    fun getServerConfig(serverName: String): McpServerConfig? {
        return servers[serverName]
    }

    /**
     * Get all server configurations
     */
    fun getAllServerConfigs(): List<McpServerConfig> {
        return servers.values.toList()
    }

    /**
     * Check if connected
     */
    fun isConnectedToServers(): Boolean {
        return isConnected && connections.isNotEmpty()
    }

    /**
     * Disconnect from all servers
     */
    fun disconnect() {
        for ((serverName, connection) in connections) {
            try {
                connection.sendClose(WebSocket.NORMAL_CLOSURE, "Disconnecting")
            } catch (error: Exception) {
                logger.error("Error closing connection to server: $serverName", error)
            }
        }
        connections.clear()
        isConnected = false
    }

    // Helper methods
    private fun findTool(toolName: String): McpTool? {
        return tools.values.find { it.name == toolName }
    }

    private fun getServerForTool(toolName: String): String {
        for ((id, tool) in tools) {
            if (tool.name == toolName) {
                return id.split(":")[0]
            }
        }
        throw IllegalArgumentException("Tool not found: $toolName")
    }

    private fun generateCallId(): String {
        return "call_${System.currentTimeMillis()}_${callIdCounter.incrementAndGet()}"
    }

    private fun loadDefaultServers() {
        // Add some default MCP server configurations
        val defaultServers = listOf(
            McpServerConfig(
                name = "local-tools",
                url = "ws://localhost:8080/mcp",
                enabled = false,
                permissions = listOf("read", "write"),
                tools = emptyList()
            ),
            McpServerConfig(
                name = "enterprise-tools",
                url = "wss://tools.enterprise-ai-plugin.com/mcp",
                enabled = false,
                permissions = listOf("read"),
                tools = emptyList()
            )
        )

        for (server in defaultServers) {
            servers[server.name] = server
        }
    }

    // JSON serialization helpers
    private fun Map<String, Any>.toJson(): String {
        return com.google.gson.Gson().toJson(this)
    }

    private inline fun <reified T> String.fromJson(): T {
        return com.google.gson.Gson().fromJson(this, T::class.java)
    }
}

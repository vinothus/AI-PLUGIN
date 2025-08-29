package com.enterprise.aiplugin.mcp

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import java.util.concurrent.ConcurrentHashMap

@Service
class McpToolRegistry {
    private val logger = Logger.getInstance(McpToolRegistry::class.java)
    
    private val registeredTools = ConcurrentHashMap<String, McpTool>()
    private val toolCategories = ConcurrentHashMap<String, MutableList<String>>()
    private val toolPermissions = ConcurrentHashMap<String, MutableSet<String>>()

    /**
     * Register a new MCP tool
     */
    fun registerTool(tool: McpTool, category: String = "general") {
        registeredTools[tool.name] = tool
        
        toolCategories.getOrPut(category) { mutableListOf() }.add(tool.name)
        toolPermissions.getOrPut(tool.name) { mutableSetOf() }.addAll(tool.permissions)
        
        logger.info("Registered MCP tool: ${tool.name} in category: $category")
    }

    /**
     * Unregister an MCP tool
     */
    fun unregisterTool(toolName: String) {
        val tool = registeredTools.remove(toolName)
        if (tool != null) {
            // Remove from categories
            toolCategories.values.forEach { it.remove(toolName) }
            toolCategories.entries.removeIf { it.value.isEmpty() }
            
            // Remove permissions
            toolPermissions.remove(toolName)
            
            logger.info("Unregistered MCP tool: $toolName")
        }
    }

    /**
     * Get all registered tools
     */
    fun getAllTools(): List<McpTool> {
        return registeredTools.values.toList()
    }

    /**
     * Get tools by category
     */
    fun getToolsByCategory(category: String): List<McpTool> {
        val toolNames = toolCategories[category] ?: emptyList()
        return toolNames.mapNotNull { registeredTools[it] }
    }

    /**
     * Get tools by permission
     */
    fun getToolsByPermission(permission: String): List<McpTool> {
        return registeredTools.values.filter { tool ->
            tool.permissions.contains(permission)
        }
    }

    /**
     * Get tool by name
     */
    fun getTool(toolName: String): McpTool? {
        return registeredTools[toolName]
    }

    /**
     * Check if tool exists
     */
    fun hasTool(toolName: String): Boolean {
        return registeredTools.containsKey(toolName)
    }

    /**
     * Get all categories
     */
    fun getCategories(): List<String> {
        return toolCategories.keys.toList()
    }

    /**
     * Get tool permissions
     */
    fun getToolPermissions(toolName: String): Set<String> {
        return toolPermissions[toolName] ?: emptySet()
    }

    /**
     * Enable/disable tool
     */
    fun setToolEnabled(toolName: String, enabled: Boolean) {
        val tool = registeredTools[toolName]
        if (tool != null) {
            tool.enabled = enabled
            logger.info("${if (enabled) "Enabled" else "Disabled"} MCP tool: $toolName")
        }
    }

    /**
     * Get enabled tools
     */
    fun getEnabledTools(): List<McpTool> {
        return registeredTools.values.filter { it.enabled }
    }

    /**
     * Get disabled tools
     */
    fun getDisabledTools(): List<McpTool> {
        return registeredTools.values.filter { !it.enabled }
    }

    /**
     * Search tools by name or description
     */
    fun searchTools(query: String): List<McpTool> {
        val lowerQuery = query.lowercase()
        return registeredTools.values.filter { tool ->
            tool.name.lowercase().contains(lowerQuery) ||
            tool.description.lowercase().contains(lowerQuery)
        }
    }

    /**
     * Get tool statistics
     */
    fun getToolStatistics(): ToolStatistics {
        val totalTools = registeredTools.size
        val enabledTools = getEnabledTools().size
        val disabledTools = getDisabledTools().size
        val categories = toolCategories.size
        
        return ToolStatistics(
            totalTools = totalTools,
            enabledTools = enabledTools,
            disabledTools = disabledTools,
            categories = categories
        )
    }

    /**
     * Clear all tools
     */
    fun clearAllTools() {
        registeredTools.clear()
        toolCategories.clear()
        toolPermissions.clear()
        logger.info("Cleared all MCP tools")
    }

    data class ToolStatistics(
        val totalTools: Int,
        val enabledTools: Int,
        val disabledTools: Int,
        val categories: Int
    )
}

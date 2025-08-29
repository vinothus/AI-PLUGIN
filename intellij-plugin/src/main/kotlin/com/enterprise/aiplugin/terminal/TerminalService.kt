package com.enterprise.aiplugin.terminal

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.openapi.diagnostic.Logger
import com.intellij.terminal.JBTerminalWidget
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.*
import java.time.Instant
import java.time.Duration

@Service
class TerminalService {
    
    private val logger = Logger.getInstance(TerminalService::class.java)
    private val terminals = ConcurrentHashMap<Int, TerminalInfo>()
    private val activeProcesses = ConcurrentHashMap<Int, ProcessInfo>()
    private val nextTerminalId = AtomicInteger(1)
    private val nextProcessId = AtomicInteger(1)
    private val shellDetectionCache = ConcurrentHashMap<String, String>()
    
    data class TerminalInfo(
        val id: Int,
        val project: Project,
        val terminalWidget: JBTerminalWidget?,
        val workingDirectory: String,
        val shellPath: String,
        val isBusy: Boolean = false,
        val lastCommand: String = "",
        val lastActive: Long = System.currentTimeMillis(),
        val outputBuffer: MutableList<String> = mutableListOf()
    )
    
    data class ProcessInfo(
        val id: Int,
        val terminalId: Int,
        val command: String,
        val startTime: Long,
        val isActive: Boolean = true,
        val output: MutableList<String> = mutableListOf(),
        val exitCode: Int? = null
    )
    
    data class SystemInfo(
        val platform: String,
        val version: String,
        val arch: String,
        val hostname: String,
        val cpus: Int,
        val totalMemory: Long,
        val freeMemory: Long,
        val uptime: Long,
        val homeDir: String,
        val tmpDir: String
    )
    
    data class ShellInfo(
        val name: String,
        val path: String,
        val version: String,
        val isInteractive: Boolean
    )
    
    data class EnvironmentInfo(
        val system: SystemInfo,
        val shell: ShellInfo,
        val terminals: List<TerminalInfo>,
        val processes: List<ProcessInfo>,
        val environment: Map<String, String>,
        val platform: String
    )
    
    /**
     * Create a new terminal
     */
    fun createTerminal(project: Project, workingDirectory: String? = null): TerminalInfo {
        val terminalId = nextTerminalId.getAndIncrement()
        val workingDir = workingDirectory ?: project.basePath ?: System.getProperty("user.home")
        val shellPath = detectShell()
        
        // Create terminal widget
        val terminalWidget = createTerminalWidget(project, workingDir, shellPath)
        
        val terminalInfo = TerminalInfo(
            id = terminalId,
            project = project,
            terminalWidget = terminalWidget,
            workingDirectory = workingDir,
            shellPath = shellPath
        )
        
        terminals[terminalId] = terminalInfo
        logger.info("Created terminal $terminalId in $workingDir")
        
        return terminalInfo
    }
    
    /**
     * Execute a command in a terminal
     */
    fun executeCommand(project: Project, command: String, workingDirectory: String? = null): ProcessInfo {
        val terminalInfo = createTerminal(project, workingDirectory)
        val processId = nextProcessId.getAndIncrement()
        
        val processInfo = ProcessInfo(
            id = processId,
            terminalId = terminalInfo.id,
            command = command,
            startTime = System.currentTimeMillis()
        )
        
        activeProcesses[processId] = processInfo
        
        // Execute command in terminal
        terminalInfo.terminalWidget?.let { widget ->
            // In a real implementation, you'd send the command to the terminal
            // For now, just log the command
            logger.info("Would execute command: $command")
            processInfo.output.add("Command executed: $command")
        }
        
        // Mark terminal as busy
        terminals[terminalInfo.id] = terminalInfo.copy(isBusy = true, lastCommand = command)
        
        logger.info("Executed command '$command' in terminal ${terminalInfo.id}")
        
        return processInfo
    }
    
    /**
     * Get all terminals
     */
    fun getTerminals(busyOnly: Boolean = false): List<TerminalInfo> {
        return if (busyOnly) {
            terminals.values.filter { it.isBusy }
        } else {
            terminals.values.toList()
        }
    }
    
    /**
     * Get active processes
     */
    fun getActiveProcesses(): List<ProcessInfo> {
        return activeProcesses.values.filter { it.isActive }.toList()
    }
    
    /**
     * Check if a process is "hot" (recently started)
     */
    fun isProcessHot(processId: Int): Boolean {
        val process = activeProcesses[processId] ?: return false
        val duration = Duration.between(
            Instant.ofEpochMilli(process.startTime),
            Instant.now()
        )
        return process.isActive && duration.seconds < 5
    }
    
    /**
     * Get terminal by ID
     */
    fun getTerminal(id: Int): TerminalInfo? {
        return terminals[id]
    }
    
    /**
     * Remove terminal
     */
    fun removeTerminal(id: Int) {
        terminals.remove(id)
        logger.info("Removed terminal $id")
    }
    
    /**
     * Get comprehensive environment information
     */
    fun getEnvironmentInfo(): EnvironmentInfo {
        val systemInfo = getSystemInfo()
        val shellInfo = getShellInfo()
        val terminalList = terminals.values.toList()
        val processList = activeProcesses.values.toList()
        val envVars = getEnvironmentVariables()
        
        return EnvironmentInfo(
            system = systemInfo,
            shell = shellInfo,
            terminals = terminalList,
            processes = processList,
            environment = envVars,
            platform = System.getProperty("os.name") ?: "unknown"
        )
    }
    
    /**
     * Get detailed system information
     */
    private fun getSystemInfo(): SystemInfo {
        val runtime = Runtime.getRuntime()
        
        return SystemInfo(
            platform = System.getProperty("os.name") ?: "unknown",
            version = System.getProperty("os.version") ?: "unknown",
            arch = System.getProperty("os.arch") ?: "unknown",
            hostname = try { java.net.InetAddress.getLocalHost().hostName } catch (e: Exception) { "unknown" },
            cpus = runtime.availableProcessors(),
            totalMemory = runtime.totalMemory(),
            freeMemory = runtime.freeMemory(),
            uptime = System.currentTimeMillis(),
            homeDir = System.getProperty("user.home") ?: "",
            tmpDir = System.getProperty("java.io.tmpdir") ?: ""
        )
    }
    
    /**
     * Get shell information with advanced detection
     */
    private fun getShellInfo(): ShellInfo {
        val platform = System.getProperty("os.name")?.lowercase() ?: ""
        val shellPath = detectShell()
        
        return ShellInfo(
            name = File(shellPath).name,
            path = shellPath,
            version = getShellVersion(shellPath),
            isInteractive = System.console() != null
        )
    }
    
    /**
     * Detect shell with platform-specific logic
     */
    private fun detectShell(): String {
        val platform = System.getProperty("os.name")?.lowercase() ?: ""
        
        // Check cache first
        shellDetectionCache[platform]?.let { return it }
        
        val shellPath = when {
            platform.contains("windows") -> {
                System.getenv("COMSPEC") ?: "C:\\Windows\\System32\\cmd.exe"
            }
            platform.contains("mac") -> {
                System.getenv("SHELL") ?: "/bin/zsh"
            }
            else -> {
                System.getenv("SHELL") ?: "/bin/bash"
            }
        }
        
        shellDetectionCache[platform] = shellPath
        return shellPath
    }
    
    /**
     * Get shell version (placeholder implementation)
     */
    private fun getShellVersion(shellPath: String): String {
        return try {
            // In a real implementation, you'd execute the shell with --version
            "unknown"
        } catch (e: Exception) {
            "unknown"
        }
    }
    
    /**
     * Get environment variables
     */
    private fun getEnvironmentVariables(): Map<String, String> {
        val env = System.getenv()
        val filteredEnv = mutableMapOf<String, String>()
        
        // Filter out sensitive environment variables
        env.forEach { (key, value) ->
            if (!key.lowercase().contains("password") &&
                !key.lowercase().contains("secret") &&
                !key.lowercase().contains("key") &&
                !key.lowercase().contains("token")) {
                filteredEnv[key] = value
            }
        }
        
        return filteredEnv
    }
    
    /**
     * Create terminal widget (placeholder implementation)
     */
    private fun createTerminalWidget(project: Project, workingDirectory: String, shellPath: String): JBTerminalWidget? {
        return try {
            // In a real implementation, you'd create an actual terminal widget
            // For now, return null as this requires IntelliJ platform specific APIs
            null
        } catch (e: Exception) {
            logger.warn("Failed to create terminal widget", e)
            null
        }
    }
    
    /**
     * Mark process as inactive
     */
    fun markProcessInactive(processId: Int) {
        activeProcesses[processId]?.let { process ->
            activeProcesses[processId] = process.copy(isActive = false)
            
            // Mark terminal as not busy
            terminals[process.terminalId]?.let { terminal ->
                terminals[process.terminalId] = terminal.copy(isBusy = false)
            }
        }
    }
    
    /**
     * Get unretrieved output from terminal
     */
    fun getUnretrievedOutput(terminalId: Int): String {
        val terminal = terminals[terminalId] ?: return ""
        val output = terminal.outputBuffer.joinToString("\n")
        terminal.outputBuffer.clear()
        return output
    }
    
    /**
     * Update terminal output
     */
    fun updateTerminalOutput(terminalId: Int, output: String) {
        terminals[terminalId]?.let { terminal ->
            terminal.outputBuffer.add(output)
            terminals[terminalId] = terminal.copy(lastActive = System.currentTimeMillis())
        }
    }
}

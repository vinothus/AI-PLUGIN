package com.enterprise.aiplugin.context

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.openapi.vfs.newvfs.BulkFileListener
import com.intellij.openapi.vfs.newvfs.events.VFileEvent
import com.intellij.psi.PsiManager
import com.intellij.psi.PsiFile
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.ProjectManager
import java.io.File
import java.nio.file.Files
import java.nio.file.Paths
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import java.time.Instant
import java.time.Duration
import com.enterprise.aiplugin.terminal.TerminalService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import java.util.concurrent.ConcurrentHashMap

data class GitInfo(
    val branch: String,
    val commit: String,
    val status: String,
    val remote: String,
    val changes: List<String>
)

data class ProjectStructure(
    val name: String,
    val type: String,
    val files: List<String>,
    val dependencies: List<String>,
    val configFiles: List<String>,
    val buildFiles: List<String>
)

data class LanguageContext(
    val language: String,
    val framework: String,
    val version: String,
    val patterns: List<String>,
    val conventions: List<String>,
    val dependencies: List<String>
)

data class EditorContext(
    val activeFile: String,
    val selection: String,
    val cursorPosition: String,
    val documentContent: String,
    val language: String,
    val lineCount: Int,
    val wordCount: Int
)

data class WorkspaceContext(
    val root: String,
    val folders: List<String>,
    val files: List<String>,
    val totalFiles: Int,
    val totalSize: Long
)

data class ComprehensiveContext(
    val editor: EditorContext,
    val workspace: WorkspaceContext,
    val project: ProjectStructure,
    val git: GitInfo?,
    val language: LanguageContext,
    val timestamp: Long,
    val session: String,
    val tokens: Int? = null,
    val contextWindow: Int? = null,
    val mcpServers: List<String> = emptyList()
)

data class ContextUpdate(
    val timestamp: Long,
    val updateType: String,
    val update: String,
    val metadata: List<String>
)

data class FileMetadataEntry(
    val path: String,
    val recordState: String, // "active" or "stale"
    val recordSource: String, // "read_tool", "user_edited", "cline_edited", "file_mentioned"
    val clineReadDate: Long? = null,
    val clineEditDate: Long? = null,
    val userEditDate: Long? = null
)

data class ContextOptimizationMetrics(
    val charactersSaved: Int,
    val charactersSavedPercentage: Double,
    val filesOptimized: Int,
    val contextWindowUsage: Int
)

@Service(Service.Level.PROJECT) // Specify service level
class ContextService(private val project: Project) {
    
    private val logger = Logger.getInstance(ContextService::class.java)
    private val gson = Gson()
    
    private var sessionId: String = generateSessionId()
    private var contextHistory: MutableList<ComprehensiveContext> = mutableListOf()
    private val maxHistorySize: Int = 100
    private val contextHistoryUpdates: MutableMap<Int, Pair<Long, MutableMap<Int, MutableList<ContextUpdate>>>> = mutableMapOf()
    private val recentlyModifiedFiles: MutableSet<String> = mutableSetOf()
    private val recentlyEditedByCline: MutableSet<String> = mutableSetOf()
    private var filesInContext: MutableList<FileMetadataEntry> = mutableListOf()
    private var contextWindowInfo: Pair<Int, Int>? = null // contextWindow, maxAllowedSize
    private var tokenUsage: MutableMap<String, Int> = mutableMapOf(
        "tokensIn" to 0,
        "tokensOut" to 0,
        "cacheWrites" to 0,
        "cacheReads" to 0
    )
    
    private val terminalService: TerminalService = project.getService(TerminalService::class.java)
    private val environmentCache = ConcurrentHashMap<String, Any>()
    private val processMonitorJob = CoroutineScope(Dispatchers.IO).launch {
        startProcessMonitoring()
    }

    init {
        logger.info("Enterprise AI Plugin context service initialized")
        setupFileWatchers()
        loadContextHistory()
        contextWindowInfo = getContextWindowInfo()
    }
    
    private fun generateSessionId(): String {
        return "session_${System.currentTimeMillis()}_${(0..999999).random()}"
    }
    
    private fun getContextWindowInfo(): Pair<Int, Int> {
        val contextWindow = 128_000
        val maxAllowedSize = contextWindow - 30_000
        return Pair(contextWindow, maxAllowedSize)
    }
    
    private fun setupFileWatchers() {
        ApplicationManager.getApplication().messageBus.connect().subscribe(
            VirtualFileManager.VFS_CHANGES,
            object : BulkFileListener {
                override fun after(events: List<VFileEvent>) {
                    for (event in events) {
                        when (event) {
                            is com.intellij.openapi.vfs.newvfs.events.VFileContentChangeEvent -> {
                                event.file?.path?.let { handleFileChange(it, "user_edited") }
                            }
                            is com.intellij.openapi.vfs.newvfs.events.VFileCreateEvent -> {
                                event.file?.path?.let { handleFileChange(it, "file_mentioned") }
                            }
                        }
                    }
                }
            }
        )
    }
    
    private fun handleFileChange(filePath: String, source: String) {
        recentlyModifiedFiles.add(filePath)
        addFileToContextTracker(filePath, source)
    }
    
    private fun addFileToContextTracker(filePath: String, source: String) {
        val now = System.currentTimeMillis()
        
        // Mark existing entries for this file as stale
        filesInContext.forEachIndexed { index, entry ->
            if (entry.path == filePath && entry.recordState == "active") {
                filesInContext[index] = entry.copy(recordState = "stale")
            }
        }
        
        val newEntry = when (source) {
            "user_edited" -> FileMetadataEntry(
                path = filePath,
                recordState = "active",
                recordSource = source,
                userEditDate = now
            )
            "cline_edited" -> FileMetadataEntry(
                path = filePath,
                recordState = "active",
                recordSource = source,
                clineReadDate = now,
                clineEditDate = now
            )
            else -> FileMetadataEntry(
                path = filePath,
                recordState = "active",
                recordSource = source,
                clineReadDate = now
            )
        }
        
        filesInContext.add(newEntry)
        saveContextHistory()
    }
    
    fun getAndClearRecentlyModifiedFiles(): List<String> {
        val files = recentlyModifiedFiles.toList()
        recentlyModifiedFiles.clear()
        return files
    }
    
    fun updateTokenUsage(usage: Map<String, Int>) {
        tokenUsage.putAll(usage)
    }
    
    fun getTotalTokenUsage(): Int {
        return tokenUsage.values.sum()
    }
    
    fun isContextWindowNearLimit(): Boolean {
        val info = contextWindowInfo ?: return false
        return getTotalTokenUsage() >= info.second
    }
    
    fun applyContextOptimizations(): ContextOptimizationMetrics {
        var charactersSaved = 0
        
        // Remove stale file entries older than 1 hour
        val oneHourAgo = System.currentTimeMillis() - (60 * 60 * 1000)
        val initialCount = filesInContext.size
        
        filesInContext.removeAll { entry ->
            if (entry.recordState == "stale" && 
                entry.userEditDate != null && 
                entry.userEditDate < oneHourAgo) {
                charactersSaved += 100 // Estimate saved characters
                true
            } else {
                false
            }
        }
        
        val filesOptimized = initialCount - filesInContext.size
        val charactersSavedPercentage = charactersSaved.toDouble() / (contextWindowInfo?.first ?: 128000)
        
        return ContextOptimizationMetrics(
            charactersSaved = charactersSaved,
            charactersSavedPercentage = charactersSavedPercentage,
            filesOptimized = filesOptimized,
            contextWindowUsage = getTotalTokenUsage()
        )
    }
    
    fun getOptimizedContext(project: Project): ComprehensiveContext {
        val context = getComprehensiveContext(project)
        
        // Apply optimizations if context window is near limit
        if (isContextWindowNearLimit()) {
            val metrics = applyContextOptimizations()
            
            if (metrics.charactersSavedPercentage < 0.3) {
                applyContextTruncation()
            }
        }
        
        return context
    }
    
    private fun applyContextTruncation() {
        // Keep only recent context history
        val keepCount = (maxHistorySize * 0.5).toInt()
        if (contextHistory.size > keepCount) {
            contextHistory = contextHistory.takeLast(keepCount).toMutableList()
        }
        
        // Clear old context updates
        val cutoffTime = System.currentTimeMillis() - (24 * 60 * 60 * 1000) // 24 hours
        contextHistoryUpdates.entries.removeIf { (_, value) ->
            val (timestamp, _) = value
            timestamp < cutoffTime
        }
        
        saveContextHistory()
    }
    
    private fun loadContextHistory() {
        try {
            val project = ProjectManager.getInstance().openProjects.firstOrNull() ?: return
            val projectPath = project.basePath ?: return
            
            val historyPath = File(projectPath, ".ai-plugin/context-history.json")
            if (historyPath.exists()) {
                val data = historyPath.readText()
                val saved = gson.fromJson<Map<String, Any>>(data, object : TypeToken<Map<String, Any>>() {}.type)
                
                contextHistory = (saved["contextHistory"] as? List<*>)?.mapNotNull { 
                    gson.fromJson(gson.toJson(it), ComprehensiveContext::class.java) 
                }?.toMutableList() ?: mutableListOf()
                
                filesInContext = (saved["filesInContext"] as? List<*>)?.mapNotNull { 
                    gson.fromJson(gson.toJson(it), FileMetadataEntry::class.java) 
                }?.toMutableList() ?: mutableListOf()
                
                val tokenUsageMap = saved["tokenUsage"] as? Map<String, Any>
                tokenUsage = tokenUsageMap?.mapValues { (_, value) -> (value as? Number)?.toInt() ?: 0 }?.toMutableMap() ?: mutableMapOf()
            }
        } catch (error: Exception) {
            logger.error("Failed to load context history", error)
        }
    }
    
    private fun saveContextHistory() {
        try {
            val project = ProjectManager.getInstance().openProjects.firstOrNull() ?: return
            val projectPath = project.basePath ?: return
            
            val aiPluginDir = File(projectPath, ".ai-plugin")
            if (!aiPluginDir.exists()) {
                aiPluginDir.mkdirs()
            }
            
            val historyPath = File(aiPluginDir, "context-history.json")
            val data = mapOf(
                "contextHistory" to contextHistory,
                "filesInContext" to filesInContext,
                "tokenUsage" to tokenUsage,
                "sessionId" to sessionId,
                "timestamp" to System.currentTimeMillis()
            )
            
            historyPath.writeText(gson.toJson(data))
        } catch (error: Exception) {
            logger.error("Failed to save context history", error)
        }
    }
    
    fun getCurrentContext(project: Project): ComprehensiveContext {
        return getOptimizedContext(project)
    }
    
    private fun getComprehensiveContext(project: Project): ComprehensiveContext {
        // Get MCP servers from the MCP service if available
        val mcpServers = try {
            val mcpService = com.intellij.openapi.application.ApplicationManager.getApplication()
                .getService(com.enterprise.aiplugin.mcp.McpService::class.java)
            mcpService.getEnabledServerConfigs().map { it.name }
        } catch (error: Exception) {
            logger.warn("Could not get MCP servers", error)
            emptyList()
        }
        
        return ComprehensiveContext(
            editor = getEditorContext(project),
            workspace = getWorkspaceContext(project),
            project = getProjectStructureInternal(project),
            git = getGitInfo(project),
            language = getLanguageContext(project),
            timestamp = System.currentTimeMillis(),
            session = sessionId,
            tokens = getTotalTokenUsage(),
            contextWindow = contextWindowInfo?.first,
            mcpServers = mcpServers
        ).also {
            addToHistory(it)
        }
    }
    
    private fun getEditorContext(project: Project): EditorContext {
        val editor = com.intellij.openapi.editor.EditorFactory.getInstance().allEditors.firstOrNull()
        
        return if (editor != null) {
            val document = editor.document
            val selectionModel = editor.selectionModel
            val content = document.text
            val selectedText = selectionModel.selectedText ?: ""
            
            EditorContext(
                activeFile = document.toString(),
                selection = selectedText,
                cursorPosition = "${selectionModel.selectionStart}",
                documentContent = content,
                language = "kotlin", // Placeholder
                lineCount = document.lineCount,
                wordCount = content.split("\\s+").filter { it.isNotEmpty() }.size
            )
        } else {
            EditorContext(
                activeFile = "",
                selection = "",
                cursorPosition = "0",
                documentContent = "",
                language = "",
                lineCount = 0,
                wordCount = 0
            )
        }
    }
    
    private fun getWorkspaceContext(project: Project): WorkspaceContext {
        val root = project.basePath ?: ""
        val folders = mutableListOf<String>()
        val files = mutableListOf<String>()
        var totalSize = 0L
        
        try {
            val projectDir = File(root)
            if (projectDir.exists()) {
                projectDir.walkTopDown().forEach { file ->
                    val relativePath = file.relativeTo(projectDir).toString()
                    if (file.isDirectory) {
                        folders.add(relativePath)
                    } else {
                        files.add(relativePath)
                        totalSize += file.length()
                    }
                }
            }
        } catch (error: Exception) {
            logger.error("Error getting workspace context", error)
        }
        
        return WorkspaceContext(
            root = root,
            folders = folders,
            files = files,
            totalFiles = files.size,
            totalSize = totalSize
        )
    }
    
    private fun getProjectStructureInternal(project: Project): ProjectStructure {
        val root = project.basePath ?: ""
        val projectName = project.name
        val projectType = detectProjectType(root)
        val configFiles = findConfigFiles(root, projectType)
        val buildFiles = findBuildFiles(root, projectType)
        val dependencies = extractDependencies(root, projectType)
        
        return ProjectStructure(
            name = projectName,
            type = projectType,
            files = emptyList(),
            dependencies = dependencies,
            configFiles = configFiles,
            buildFiles = buildFiles
        )
    }
    
    private fun detectProjectType(root: String): String {
        val files = File(root).listFiles()?.map { it.name } ?: emptyList()
        
        return when {
            files.contains("package.json") -> "nodejs"
            files.any { it.contains("requirements.txt") || it.contains("pyproject.toml") } -> "python"
            files.any { it.contains("pom.xml") || it.contains("build.gradle") } -> "java"
            files.any { it.contains(".csproj") || it.contains(".sln") } -> "csharp"
            files.contains("go.mod") -> "go"
            files.contains("Cargo.toml") -> "rust"
            files.contains("composer.json") -> "php"
            files.contains("Gemfile") -> "ruby"
            else -> "unknown"
        }
    }
    
    private fun findConfigFiles(root: String, projectType: String): List<String> {
        val configFiles = mutableListOf<String>()
        val files = File(root).listFiles()?.map { it.name } ?: emptyList()
        
        when (projectType) {
            "nodejs" -> {
                if (files.contains("package.json")) configFiles.add("package.json")
                if (files.contains("tsconfig.json")) configFiles.add("tsconfig.json")
                if (files.contains(".eslintrc")) configFiles.add(".eslintrc")
            }
            "python" -> {
                if (files.contains("requirements.txt")) configFiles.add("requirements.txt")
                if (files.contains("pyproject.toml")) configFiles.add("pyproject.toml")
            }
            "java" -> {
                if (files.contains("pom.xml")) configFiles.add("pom.xml")
                if (files.contains("build.gradle")) configFiles.add("build.gradle")
            }
        }
        
        return configFiles
    }
    
    private fun findBuildFiles(root: String, projectType: String): List<String> {
        val buildFiles = mutableListOf<String>()
        val files = File(root).listFiles()?.map { it.name } ?: emptyList()
        
        when (projectType) {
            "nodejs" -> {
                if (files.contains("webpack.config.js")) buildFiles.add("webpack.config.js")
                if (files.contains("vite.config.js")) buildFiles.add("vite.config.js")
            }
            "java" -> {
                if (files.contains("build.gradle")) buildFiles.add("build.gradle")
                if (files.contains("pom.xml")) buildFiles.add("pom.xml")
            }
        }
        
        return buildFiles
    }
    
    private fun extractDependencies(root: String, projectType: String): List<String> {
        val dependencies = mutableListOf<String>()
        
        try {
            when (projectType) {
                "nodejs" -> {
                    val packageJsonPath = File(root, "package.json")
                    if (packageJsonPath.exists()) {
                        val packageJson = gson.fromJson(packageJsonPath.readText(), Map::class.java)
                        val deps = packageJson["dependencies"] as? Map<*, *>
                        deps?.keys?.forEach { dependencies.add(it.toString()) }
                    }
                }
                "python" -> {
                    val requirementsPath = File(root, "requirements.txt")
                    if (requirementsPath.exists()) {
                        val requirements = requirementsPath.readText()
                        dependencies.addAll(requirements.lines().filter { it.isNotEmpty() && !it.startsWith("#") })
                    }
                }
            }
        } catch (error: Exception) {
            logger.error("Error extracting dependencies", error)
        }
        
        return dependencies
    }
    
    private fun getGitInfo(project: Project): GitInfo? {
        return try {
            val root = project.basePath ?: return null
            val gitPath = File(root, ".git")
            
            if (!gitPath.exists()) return null
            
            // Basic Git info extraction (placeholder)
            GitInfo(
                branch = "main",
                commit = "unknown",
                status = "clean",
                remote = "origin",
                changes = emptyList()
            )
        } catch (error: Exception) {
            logger.error("Error getting Git info", error)
            null
        }
    }
    
    private fun getLanguageContext(project: Project): LanguageContext {
        val language = "kotlin" // Default for IntelliJ
        
        val languageContexts = mapOf(
            "kotlin" to LanguageContext(
                language = "kotlin",
                framework = "spring",
                version = "1.8+",
                patterns = listOf("coroutines", "data classes", "extension functions", "null safety"),
                conventions = listOf("camelCase", "PascalCase for classes", "UPPER_CASE for constants"),
                dependencies = listOf("kotlin", "jvm")
            ),
            "java" to LanguageContext(
                language = "java",
                framework = "spring",
                version = "11+",
                patterns = listOf("streams", "lambda expressions", "optional", "records"),
                conventions = listOf("camelCase", "PascalCase for classes", "UPPER_CASE for constants"),
                dependencies = listOf("jdk", "maven/gradle")
            )
        )
        
        return languageContexts[language] ?: LanguageContext(
            language = language,
            framework = "unknown",
            version = "unknown",
            patterns = emptyList(),
            conventions = emptyList(),
            dependencies = emptyList()
        )
    }
    
    private fun addToHistory(context: ComprehensiveContext) {
        contextHistory.add(context)
        
        // Maintain history size
        if (contextHistory.size > maxHistorySize) {
            contextHistory = contextHistory.takeLast(maxHistorySize).toMutableList()
        }
    }
    
    fun getContextHistory(): List<ComprehensiveContext> {
        return contextHistory.toList()
    }
    
    fun getFilesInContext(): List<FileMetadataEntry> {
        return filesInContext.toList()
    }
    
    fun getContextOptimizationMetrics(): ContextOptimizationMetrics {
        return applyContextOptimizations()
    }
    
    fun getProjectStructure(project: Project): Map<String, String> {
        val structure = getProjectStructureInternal(project)
        return mapOf(
            "projectName" to structure.name,
            "modules" to "[]",
            "files" to "[]"
        )
    }
    
    fun getLanguageContext(languageId: String): Map<String, String> {
        val context = getLanguageContext(ProjectManager.getInstance().openProjects.firstOrNull() ?: return emptyMap())
        return mapOf(
            "language" to context.language,
            "extensions" to ".kt,.java",
            "frameworks" to context.framework
        )
    }

    /**
     * Get enhanced environment information
     */
    fun getEnvironmentInfo(): EnvironmentInfo {
        val cacheKey = "environment_info"
        environmentCache[cacheKey]?.let { return it as EnvironmentInfo }
        
        val envInfo = EnvironmentInfo(
            system = getSystemInfo(),
            shell = getShellInfo(),
            terminal = getTerminalInfo(),
            processes = getActiveProcesses(),
            environment = getEnvironmentVariables(),
            platform = getPlatformInfo()
        )
        
        environmentCache[cacheKey] = envInfo
        return envInfo
    }

    /**
     * Get detailed system information
     */
    private fun getSystemInfo(): SystemInfo {
        val runtime = Runtime.getRuntime()
        
        return SystemInfo(
            platform = System.getProperty("os.name") ?: "unknown",
            release = System.getProperty("os.version") ?: "unknown",
            arch = System.getProperty("os.arch") ?: "unknown",
            hostname = try { java.net.InetAddress.getLocalHost().hostName } catch (e: Exception) { "unknown" },
            type = System.getProperty("os.name") ?: "unknown",
            version = System.getProperty("os.version") ?: "unknown",
            cpus = runtime.availableProcessors(),
            totalMemory = runtime.totalMemory(),
            freeMemory = runtime.freeMemory(),
            uptime = System.currentTimeMillis(),
            homeDir = System.getProperty("user.home") ?: "",
            tmpDir = System.getProperty("java.io.tmpdir") ?: "",
            userInfo = UserInfo(
                username = System.getProperty("user.name") ?: "unknown",
                uid = System.getProperty("user.name") ?: "unknown",
                gid = System.getProperty("user.name") ?: "unknown",
                home = System.getProperty("user.home") ?: ""
            )
        )
    }

    /**
     * Get shell information with advanced detection
     */
    private fun getShellInfo(): ShellInfo {
        val shellPath = detectShell()
        
        return ShellInfo(
            name = File(shellPath).name,
            path = shellPath,
            version = getShellVersion(shellPath),
            isInteractive = System.console() != null,
            environment = System.getenv("SHELL") ?: ""
        )
    }

    /**
     * Get terminal information
     */
    private fun getTerminalInfo(): TerminalStatusInfo {
        val terminals = terminalService.getTerminals()
        val busyTerminals = terminalService.getTerminals(true)
        
        return TerminalStatusInfo(
            totalTerminals = terminals.size,
            busyTerminals = busyTerminals.size,
            activeProcesses = terminalService.getActiveProcesses().size,
            defaultShell = getShellInfo().name,
            terminalType = System.getenv("TERM") ?: "unknown",
            isTerminal = System.console() != null
        )
    }

    /**
     * Get active processes information
     */
    private fun getActiveProcesses(): List<ProcessStatusInfo> {
        return terminalService.getActiveProcesses().map { process ->
            ProcessStatusInfo(
                pid = process.id,
                command = process.command,
                startTime = process.startTime,
                isActive = process.isActive,
                isHot = terminalService.isProcessHot(process.id), // Corrected reference
                duration = System.currentTimeMillis() - process.startTime,
                output = process.output.toList()
            )
        }
    }

    /**
     * Get environment variables
     */
    private fun getEnvironmentVariables(): EnvironmentVariables {
        val importantVars = listOf(
            "PATH", "HOME", "USER", "SHELL", "TERM", "LANG", "LC_ALL",
            "JAVA_HOME", "JAVA_VERSION", "GRADLE_HOME",
            "GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM",
            "DOCKER_HOST", "KUBECONFIG"
        )

        val envVars = EnvironmentVariables(
            important = mutableMapOf(),
            all = mutableMapOf()
        )

        // Get important environment variables
        importantVars.forEach { varName ->
            System.getenv(varName)?.let { value ->
                envVars.important[varName] = value
            }
        }

        // Get all environment variables (filtered for security)
        System.getenv().forEach { (key, value) ->
            // Skip sensitive variables
            if (!key.lowercase().contains("password") && 
                !key.lowercase().contains("secret") && 
                !key.lowercase().contains("key") &&
                !key.lowercase().contains("token")) {
                envVars.all[key] = value
            }
        }

        return envVars
    }

    /**
     * Get platform-specific information
     */
    private fun getPlatformInfo(): PlatformInfo {
        val platform = System.getProperty("os.name")?.lowercase() ?: ""
        
        return PlatformInfo(
            name = platform,
            isWindows = platform.contains("windows"),
            isMacOS = platform.contains("mac"),
            isLinux = platform.contains("linux"),
            isUnix = listOf("mac", "linux", "freebsd", "openbsd", "sunos").any { platform.contains(it) },
            pathSeparator = File.separator,
            lineEnding = if (platform.contains("windows")) "\r\n" else "\n",
            caseSensitive = !platform.contains("windows"),
            supportsSymlinks = !platform.contains("windows")
        )
    }

    /**
     * Detect shell with platform-specific logic
     */
    private fun detectShell(): String {
        val platform = System.getProperty("os.name")?.lowercase() ?: ""
        
        return when {
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
    }

    /**
     * Get shell version information
     */
    private fun getShellVersion(shellPath: String): String {
        return try {
            // This would require executing the shell with --version
            // For now, return a placeholder
            "unknown"
        } catch (error: Exception) {
            "unknown"
        }
    }

    /**
     * Start process monitoring
     */
    private suspend fun startProcessMonitoring() {
        while (processMonitorJob.isActive) {
            try {
                // Update process information
                environmentCache.remove("environment_info")
                
                // Check for active processes and emit events if needed
                val activeProcesses = getActiveProcesses()
                if (activeProcesses.isNotEmpty()) {
                    logger.info("Active processes: ${activeProcesses.size}")
                }
                
                delay(5000) // Update every 5 seconds
            } catch (e: Exception) {
                logger.warn("Error in process monitoring", e)
                delay(10000) // Wait longer on error
            }
        }
    }

    /**
     * Get terminal service instance
     */
    fun getTerminalService(): TerminalService {
        return terminalService
    }

    /**
     * Enhanced context with environment information
     */
    suspend fun getEnhancedContext(project: Project): EnhancedContext {
        val baseContext = getComprehensiveContext(project)
        val environmentInfo = getEnvironmentInfo()
        
        return EnhancedContext(
            editor = baseContext.editor,
            workspace = baseContext.workspace,
            project = baseContext.project,
            git = baseContext.git,
            language = baseContext.language,
            timestamp = baseContext.timestamp,
            session = baseContext.session,
            tokens = baseContext.tokens,
            contextWindow = baseContext.contextWindow,
            mcpServers = baseContext.mcpServers,
            environment = environmentInfo,
            terminalStatus = TerminalStatus(
                hasActiveTerminals = environmentInfo.terminal.busyTerminals > 0,
                hasActiveProcesses = environmentInfo.processes.isNotEmpty(),
                hotProcesses = environmentInfo.processes.count { it.isHot }
            )
        )
    }
}

// New interfaces for enhanced environment integration
data class EnvironmentInfo(
    val system: SystemInfo,
    val shell: ShellInfo,
    val terminal: TerminalStatusInfo,
    val processes: List<ProcessStatusInfo>,
    val environment: EnvironmentVariables,
    val platform: PlatformInfo
)

data class SystemInfo(
    val platform: String,
    val release: String,
    val arch: String,
    val hostname: String,
    val type: String,
    val version: String,
    val cpus: Int,
    val totalMemory: Long,
    val freeMemory: Long,
    val uptime: Long,
    val homeDir: String,
    val tmpDir: String,
    val userInfo: UserInfo
)

data class UserInfo(
    val username: String,
    val uid: String,
    val gid: String,
    val home: String
)

data class ShellInfo(
    val name: String,
    val path: String,
    val version: String,
    val isInteractive: Boolean,
    val environment: String
)

data class TerminalStatusInfo(
    val totalTerminals: Int,
    val busyTerminals: Int,
    val activeProcesses: Int,
    val defaultShell: String,
    val terminalType: String,
    val isTerminal: Boolean
)

data class ProcessStatusInfo(
    val pid: Int,
    val command: String,
    val startTime: Long,
    val isActive: Boolean,
    val isHot: Boolean,
    val duration: Long,
    val output: List<String>
)

data class EnvironmentVariables(
    val important: MutableMap<String, String>,
    val all: MutableMap<String, String>
)

data class PlatformInfo(
    val name: String,
    val isWindows: Boolean,
    val isMacOS: Boolean,
    val isLinux: Boolean,
    val isUnix: Boolean,
    val pathSeparator: String,
    val lineEnding: String,
    val caseSensitive: Boolean,
    val supportsSymlinks: Boolean
)

data class TerminalStatus(
    val hasActiveTerminals: Boolean,
    val hasActiveProcesses: Boolean,
    val hotProcesses: Int
)

data class EnhancedContext(
    val editor: EditorContext,
    val workspace: WorkspaceContext,
    val project: ProjectStructure,
    val git: GitInfo?,
    val language: LanguageContext,
    val timestamp: Long,
    val session: String,
    val tokens: Int?,
    val contextWindow: Int?,
    val mcpServers: List<String>,
    val environment: EnvironmentInfo,
    val terminalStatus: TerminalStatus
)

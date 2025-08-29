package com.enterprise.aiplugin.ui

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.StatusBar
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.openapi.wm.StatusBarWidgetFactory
import com.intellij.openapi.wm.WindowManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import com.intellij.util.Consumer
import java.awt.event.MouseEvent
import javax.swing.Icon

@Service
class StatusBarIntegration {
    
    private val logger = Logger.getInstance(StatusBarIntegration::class.java)
    
    fun updateStatus(project: Project, status: String, showProgress: Boolean = false) {
        try {
            val statusBar = WindowManager.getInstance().getStatusBar(project)
            if (statusBar != null) {
                // Update status bar with AI plugin status
                statusBar.setInfo("AI Plugin: $status")
                
                if (showProgress) {
                    // Show progress indicator
                    statusBar.setInfo("AI Plugin: $status (Processing...)")
                }
            }
        } catch (error: Exception) {
            logger.warn("Failed to update status bar", error)
        }
    }
    
    fun showReady(project: Project) {
        updateStatus(project, "Ready")
    }
    
    fun showProcessing(project: Project) {
        updateStatus(project, "Processing AI request", true)
    }
    
    fun showError(project: Project, error: String) {
        updateStatus(project, "Error: $error")
    }
    
    fun showWorkflowStatus(project: Project, workflowState: String) {
        updateStatus(project, "Workflow: $workflowState")
    }
}

class AiPluginStatusBarWidget : StatusBarWidget {
    
    private var statusBar: StatusBar? = null
    private var status = "Ready"
    
    override fun ID(): String = "EnterpriseAiPluginStatus"
    
    override fun getPresentation(): StatusBarWidget.WidgetPresentation {
        return object : StatusBarWidget.TextPresentation {
            override fun getText(): String = "AI: $status"
            
            override fun getTooltipText(): String = "Enterprise AI Plugin Status"
            
            override fun getAlignment(): Float = 0.0f
            
            override fun getClickConsumer(): Consumer<MouseEvent>? {
                return Consumer { event ->
                    // Open tool window on click
                    val project = statusBar?.project
                    if (project != null) {
                        val toolWindow = com.intellij.openapi.wm.ToolWindowManager.getInstance(project)
                            .getToolWindow("Enterprise AI Plugin")
                        toolWindow?.show()
                        toolWindow?.activate(null)
                    }
                }
            }
        }
    }
    
    override fun install(statusBar: StatusBar) {
        this.statusBar = statusBar
    }
    
    override fun dispose() {
        statusBar = null
    }
    
    fun updateStatus(newStatus: String) {
        status = newStatus
        statusBar?.updateWidget(ID())
    }
}

class AiPluginStatusBarWidgetFactory : StatusBarWidgetFactory {
    
    override fun getId(): String = "EnterpriseAiPluginStatus"
    
    override fun getDisplayName(): String = "Enterprise AI Plugin Status"
    
    override fun isAvailable(project: Project): Boolean = true
    
    override fun createWidget(project: Project): StatusBarWidget {
        return AiPluginStatusBarWidget()
    }
}

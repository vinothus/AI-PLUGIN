package com.enterprise.aiplugin.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowManager

class StartAiAction : AnAction() {
    
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project
        if (project != null) {
            // Open the AI Plugin tool window
            val toolWindowManager = ToolWindowManager.getInstance(project)
            val toolWindow = toolWindowManager.getToolWindow("Enterprise AI Plugin")
            
            if (toolWindow != null) {
                toolWindow.show()
                toolWindow.activate(null)
            } else {
                // Fallback message if tool window is not available
                com.intellij.openapi.ui.Messages.showInfoMessage(
                    project, 
                    "Enterprise AI Plugin tool window is not available. Please check if the plugin is properly installed.",
                    "AI Assistant"
                )
            }
        }
    }
    
    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }
}

package com.enterprise.aiplugin.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowManager

class SecurityAuditAction : AnAction() {
    
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project
        if (project != null) {
            // Open the AI Plugin tool window and show security
            val toolWindowManager = ToolWindowManager.getInstance(project)
            val toolWindow = toolWindowManager.getToolWindow("Enterprise AI Plugin")
            
            if (toolWindow != null) {
                toolWindow.show()
                toolWindow.activate(null)
                
                // Note: In a full implementation, we would programmatically switch to the security tab
                // For now, we'll show a message indicating the security features are available in the tool window
                com.intellij.openapi.ui.Messages.showInfoMessage(
                    project, 
                    "Security and audit features are available in the Enterprise AI Plugin tool window.\n\n" +
                    "Please navigate to the 'Security' tab to run security audits, view encryption status, and access audit logs.",
                    "Security Audit"
                )
            } else {
                com.intellij.openapi.ui.Messages.showInfoMessage(
                    project, 
                    "Enterprise AI Plugin tool window is not available. Please check if the plugin is properly installed.",
                    "Security Audit"
                )
            }
        }
    }
    
    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }
}

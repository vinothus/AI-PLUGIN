package com.enterprise.aiplugin

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.StartupActivity

class AiPluginStartupActivity : StartupActivity {
    
    private val logger = Logger.getInstance(AiPluginStartupActivity::class.java)
    
    override fun runActivity(project: Project) {
        logger.info("Enterprise AI Plugin startup activity executed for project: ${project.name}")
        
        // Initialize core services (side-effect only, do not assign to unused variables)
        project.getService(AiPluginApplicationService::class.java)
        project.getService(com.enterprise.aiplugin.security.SecurityService::class.java)
        project.getService(com.enterprise.aiplugin.ai.AiProviderService::class.java)
        project.getService(com.enterprise.aiplugin.context.ContextService::class.java)

        logger.info("All core services initialized successfully")
    }
}

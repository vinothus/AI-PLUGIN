package com.enterprise.aiplugin.project

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project

@Service
class AiPluginProjectComponent(private val project: Project) {
    
    private val logger = Logger.getInstance(AiPluginProjectComponent::class.java)
    
    init {
        logger.info("Enterprise AI Plugin project component initialized for project: ${project.name}")
    }
}

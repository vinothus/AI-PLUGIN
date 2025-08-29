package com.enterprise.aiplugin.application

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger

@Service
class AiPluginApplicationComponent {
    
    private val logger = Logger.getInstance(AiPluginApplicationComponent::class.java)
    
    init {
        logger.info("Enterprise AI Plugin application component initialized")
    }
}

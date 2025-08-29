package com.enterprise.aiplugin

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger

@Service
class AiPluginApplicationService {
    
    private val logger = Logger.getInstance(AiPluginApplicationService::class.java)
    
    init {
        logger.info("Enterprise AI Plugin application service initialized")
    }
}

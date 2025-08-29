package com.enterprise.aiplugin.ai

data class AiProviderInfo(
    val providerId: String,
    val modelId: String,
    val customPrompt: String? = null,
    val apiKey: String? = null,
    val baseUrl: String? = null
)

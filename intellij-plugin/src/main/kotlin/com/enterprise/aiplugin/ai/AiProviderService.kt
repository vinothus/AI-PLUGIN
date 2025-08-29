package com.enterprise.aiplugin.ai

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import com.enterprise.aiplugin.context.ComprehensiveContext
import com.enterprise.aiplugin.context.EnhancedContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

@Service
class AiProviderService {
    
    private val logger = Logger.getInstance(AiProviderService::class.java)
    
    init {
        logger.info("Enterprise AI Plugin AI provider service initialized")
    }
    
    private val openAiApiUrl = "https://api.openai.com/v1/chat/completions"
    private val openAiModel = "gpt-3.5-turbo" // You can change to gpt-4 if you have access
    private val client = OkHttpClient()

    private var selectedProvider: String = "OpenAI"

    fun setProvider(provider: String) {
        logger.info("Setting AI provider to: $provider")
        selectedProvider = provider
    }

    fun getProvider(): String = selectedProvider

    fun sendMessage(message: String): String {
        return when (selectedProvider) {
            "OpenAI" -> sendOpenAiMessage(message)
            "Anthropic" -> sendAnthropicMessage(message)
            "Gemini" -> sendGeminiMessage(message)
            "Local" -> sendLocalMessage(message)
            "Custom" -> sendCustomMessage(message)
            else -> "[ERROR] Unknown provider: $selectedProvider"
        }
    }

    private fun sendOpenAiMessage(message: String): String {
        logger.info("Sending message to OpenAI: $message")
        val apiKey = System.getenv("OPENAI_API_KEY")
        if (apiKey.isNullOrBlank()) {
            logger.error("OPENAI_API_KEY environment variable not set.")
            return "[ERROR] OpenAI API key not set. Please set the OPENAI_API_KEY environment variable."
        }
        try {
            val requestBodyJson = JSONObject()
            requestBodyJson.put("model", openAiModel)
            requestBodyJson.put("messages", listOf(mapOf("role" to "user", "content" to message)))
            val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
            val requestBody = requestBodyJson.toString().toRequestBody(mediaType)
            val request = Request.Builder()
                .url(openAiApiUrl)
                .addHeader("Authorization", "Bearer $apiKey")
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    logger.error("OpenAI API error: \\${response.code} \\${response.message}")
                    return@use "[ERROR] OpenAI API error: \\${response.code} \\${response.message}"
                }
                val responseBody = response.body?.string() ?: return@use "[ERROR] Empty response from OpenAI API."
                val json = JSONObject(responseBody)
                val choices = json.getJSONArray("choices")
                if (choices.length() > 0) {
                    val content = choices.getJSONObject(0).getJSONObject("message").getString("content")
                    return@use content.trim()
                }
                return@use "[ERROR] No choices returned from OpenAI API."
            } ?: "[ERROR] Unknown error in OpenAI API call."
        } catch (e: Exception) {
            logger.error("Exception calling OpenAI API", e)
            return "[ERROR] Exception calling OpenAI API: ${e.message}"
        }
    }

    private fun sendAnthropicMessage(message: String): String {
        logger.info("Sending message to Anthropic: $message")
        val apiKey = System.getenv("ANTHROPIC_API_KEY")
        if (apiKey.isNullOrBlank()) {
            logger.error("ANTHROPIC_API_KEY environment variable not set.")
            return "[ERROR] Anthropic API key not set. Please set the ANTHROPIC_API_KEY environment variable."
        }
        val apiUrl = "https://api.anthropic.com/v1/messages"
        val model = "claude-3-opus-20240229"
        try {
            val requestBodyJson = JSONObject()
            requestBodyJson.put("model", model)
            requestBodyJson.put("max_tokens", 1024)
            requestBodyJson.put("messages", listOf(mapOf("role" to "user", "content" to message)))
            val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
            val requestBody = requestBodyJson.toString().toRequestBody(mediaType)
            val request = Request.Builder()
                .url(apiUrl)
                .addHeader("x-api-key", apiKey)
                .addHeader("anthropic-version", "2023-06-01")
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    logger.error("Anthropic API error: \\${response.code} \\${response.message}")
                    return@use "[ERROR] Anthropic API error: \\${response.code} \\${response.message}"
                }
                val responseBody = response.body?.string() ?: return@use "[ERROR] Empty response from Anthropic API."
                val json = JSONObject(responseBody)
                val content = json.getJSONArray("content").getJSONObject(0).getString("text")
                return@use content.trim()
            } ?: "[ERROR] Unknown error in Anthropic API call."
        } catch (e: Exception) {
            logger.error("Exception calling Anthropic API", e)
            return "[ERROR] Exception calling Anthropic API: ${e.message}"
        }
    }

    private fun sendGeminiMessage(message: String): String {
        logger.info("Sending message to Gemini: $message")
        val apiKey = System.getenv("GEMINI_API_KEY")
        if (apiKey.isNullOrBlank()) {
            logger.error("GEMINI_API_KEY environment variable not set.")
            return "[ERROR] Gemini API key not set. Please set the GEMINI_API_KEY environment variable."
        }
        val apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$apiKey"
        try {
            val requestBodyJson = JSONObject()
            val contents = listOf(mapOf("role" to "user", "parts" to listOf(mapOf("text" to message))))
            requestBodyJson.put("contents", contents)
            val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
            val requestBody = requestBodyJson.toString().toRequestBody(mediaType)
            val request = Request.Builder()
                .url(apiUrl)
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    logger.error("Gemini API error: \\${response.code} \\${response.message}")
                    return@use "[ERROR] Gemini API error: \\${response.code} \\${response.message}"
                }
                val responseBody = response.body?.string() ?: return@use "[ERROR] Empty response from Gemini API."
                val json = JSONObject(responseBody)
                val candidates = json.optJSONArray("candidates")
                if (candidates != null && candidates.length() > 0) {
                    val content = candidates.getJSONObject(0).getJSONObject("content").getJSONArray("parts").getJSONObject(0).getString("text")
                    return@use content.trim()
                }
                return@use "[ERROR] No candidates returned from Gemini API."
            } ?: "[ERROR] Unknown error in Gemini API call."
        } catch (e: Exception) {
            logger.error("Exception calling Gemini API", e)
            return "[ERROR] Exception calling Gemini API: ${e.message}"
        }
    }

    private fun sendLocalMessage(message: String): String {
        logger.info("Sending message to Local AI: $message")
        val endpoint = System.getenv("LOCAL_AI_ENDPOINT")
        if (endpoint.isNullOrBlank()) {
            logger.error("LOCAL_AI_ENDPOINT environment variable not set.")
            return "[ERROR] Local AI endpoint not set. Please set the LOCAL_AI_ENDPOINT environment variable."
        }
        try {
            val requestBodyJson = JSONObject()
            requestBodyJson.put("message", message)
            val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
            val requestBody = requestBodyJson.toString().toRequestBody(mediaType)
            val request = Request.Builder()
                .url(endpoint)
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    logger.error("Local AI error: \\${response.code} \\${response.message}")
                    return@use "[ERROR] Local AI error: \\${response.code} \\${response.message}"
                }
                val responseBody = response.body?.string() ?: return@use "[ERROR] Empty response from Local AI."
                return@use responseBody.trim()
            } ?: "[ERROR] Unknown error in Local AI call."
        } catch (e: Exception) {
            logger.error("Exception calling Local AI endpoint", e)
            return "[ERROR] Exception calling Local AI endpoint: ${e.message}"
        }
    }

    private fun sendCustomMessage(message: String): String {
        logger.info("Sending message to Custom AI: $message")
        val endpoint = System.getenv("CUSTOM_AI_ENDPOINT")
        val apiKey = System.getenv("CUSTOM_AI_KEY")
        if (endpoint.isNullOrBlank()) {
            logger.error("CUSTOM_AI_ENDPOINT environment variable not set.")
            return "[ERROR] Custom AI endpoint not set. Please set the CUSTOM_AI_ENDPOINT environment variable."
        }
        try {
            val requestBodyJson = JSONObject()
            requestBodyJson.put("message", message)
            val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
            val requestBody = requestBodyJson.toString().toRequestBody(mediaType)
            val builder = Request.Builder()
                .url(endpoint)
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
            if (!apiKey.isNullOrBlank()) {
                builder.addHeader("Authorization", "Bearer $apiKey")
            }
            val request = builder.build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    logger.error("Custom AI error: \\${response.code} \\${response.message}")
                    return@use "[ERROR] Custom AI error: \\${response.code} \\${response.message}"
                }
                val responseBody = response.body?.string() ?: return@use "[ERROR] Empty response from Custom AI."
                return@use responseBody.trim()
            } ?: "[ERROR] Unknown error in Custom AI call."
        } catch (e: Exception) {
            logger.error("Exception calling Custom AI endpoint", e)
            return "[ERROR] Exception calling Custom AI endpoint: ${e.message}"
        }
    }
    
    fun sendMessageWithContext(message: String, context: ComprehensiveContext): String {
        // For now, just forward to sendMessage. You can enhance this to add context to the prompt.
        return sendMessage(message)
    }

    /**
     * Send message with enhanced context including environment information
     */
    suspend fun sendMessageWithEnhancedContext(message: String, context: EnhancedContext): String {
        try {
            // Add environment information to the message
            val enhancedMessage = buildEnhancedMessage(message, context)
            
            // Send to AI provider (simplified for now)
            val response = sendMessage(enhancedMessage)
            
            logger.info("Sent enhanced message to AI provider")
            return response
            
        } catch (e: Exception) {
            logger.error("Exception sending message with enhanced context", e)
            return "[ERROR] Exception sending message with enhanced context: ${e.message}"
        }
    }

    /**
     * Test connection to the selected AI provider using the given parameters.
     * @param provider The provider name (e.g., OpenAI, Anthropic, Gemini, Local, Custom)
     * @param model The model to use (if applicable)
     * @param apiKeyOrEndpoint The API key or endpoint (depending on provider)
     * @return Result string indicating success or error details
     */
    fun testConnection(provider: String, model: String?, apiKeyOrEndpoint: String?): String {
        return when (provider) {
            "OpenAI" -> testOpenAiConnection(model ?: "gpt-3.5-turbo", apiKeyOrEndpoint)
            "Anthropic" -> testAnthropicConnection(model ?: "claude-3-opus-20240229", apiKeyOrEndpoint)
            "Gemini" -> testGeminiConnection(apiKeyOrEndpoint)
            "Local" -> testLocalConnection(apiKeyOrEndpoint)
            "Custom" -> testCustomConnection(apiKeyOrEndpoint)
            else -> "[ERROR] Unknown provider: $provider"
        }
    }

    private fun testOpenAiConnection(model: String, apiKey: String?): String {
        if (apiKey.isNullOrBlank()) {
            return "[ERROR] OpenAI API key not provided."
        }
        val apiUrl = openAiApiUrl
        try {
            val requestBodyJson = JSONObject()
            requestBodyJson.put("model", model)
            requestBodyJson.put("messages", listOf(mapOf("role" to "user", "content" to "ping")))
            val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
            val requestBody = requestBodyJson.toString().toRequestBody(mediaType)
            val request = Request.Builder()
                .url(apiUrl)
                .addHeader("Authorization", "Bearer $apiKey")
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return "[ERROR] OpenAI API error: ${response.code} ${response.message}"
                }
                return "[SUCCESS] OpenAI connection successful."
            }
        } catch (e: Exception) {
            return "[ERROR] Exception calling OpenAI API: ${e.message}"
        }
    }

    private fun testAnthropicConnection(model: String, apiKey: String?): String {
        if (apiKey.isNullOrBlank()) {
            return "[ERROR] Anthropic API key not provided."
        }
        val apiUrl = "https://api.anthropic.com/v1/messages"
        try {
            val requestBodyJson = JSONObject()
            requestBodyJson.put("model", model)
            requestBodyJson.put("max_tokens", 1)
            requestBodyJson.put("messages", listOf(mapOf("role" to "user", "content" to "ping")))
            val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
            val requestBody = requestBodyJson.toString().toRequestBody(mediaType)
            val request = Request.Builder()
                .url(apiUrl)
                .addHeader("x-api-key", apiKey)
                .addHeader("anthropic-version", "2023-06-01")
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return "[ERROR] Anthropic API error: ${response.code} ${response.message}"
                }
                return "[SUCCESS] Anthropic connection successful."
            }
        } catch (e: Exception) {
            return "[ERROR] Exception calling Anthropic API: ${e.message}"
        }
    }

    private fun testGeminiConnection(apiKey: String?): String {
        if (apiKey.isNullOrBlank()) {
            return "[ERROR] Gemini API key not provided."
        }
        val apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$apiKey"
        try {
            val requestBodyJson = JSONObject()
            val contents = listOf(mapOf("role" to "user", "parts" to listOf(mapOf("text" to "ping"))))
            requestBodyJson.put("contents", contents)
            val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
            val requestBody = requestBodyJson.toString().toRequestBody(mediaType)
            val request = Request.Builder()
                .url(apiUrl)
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return "[ERROR] Gemini API error: ${response.code} ${response.message}"
                }
                return "[SUCCESS] Gemini connection successful."
            }
        } catch (e: Exception) {
            return "[ERROR] Exception calling Gemini API: ${e.message}"
        }
    }

    private fun testLocalConnection(endpoint: String?): String {
        if (endpoint.isNullOrBlank()) {
            return "[ERROR] Local AI endpoint not provided."
        }
        try {
            val requestBodyJson = JSONObject()
            requestBodyJson.put("message", "ping")
            val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
            val requestBody = requestBodyJson.toString().toRequestBody(mediaType)
            val request = Request.Builder()
                .url(endpoint)
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return "[ERROR] Local AI error: ${response.code} ${response.message}"
                }
                return "[SUCCESS] Local AI connection successful."
            }
        } catch (e: Exception) {
            return "[ERROR] Exception calling Local AI endpoint: ${e.message}"
        }
    }

    private fun testCustomConnection(endpoint: String?): String {
        if (endpoint.isNullOrBlank()) {
            return "[ERROR] Custom AI endpoint not provided."
        }
        try {
            val requestBodyJson = JSONObject()
            requestBodyJson.put("message", "ping")
            val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
            val requestBody = requestBodyJson.toString().toRequestBody(mediaType)
            val request = Request.Builder()
                .url(endpoint)
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return "[ERROR] Custom AI error: ${response.code} ${response.message}"
                }
                return "[SUCCESS] Custom AI connection successful."
            }
        } catch (e: Exception) {
            return "[ERROR] Exception calling Custom AI endpoint: ${e.message}"
        }
    }
}

package com.enterprise.aiplugin

import com.enterprise.aiplugin.ai.AiProviderService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*

class AiProviderServiceTest {
    
    private lateinit var aiProviderService: AiProviderService
    
    @BeforeEach
    fun setUp() {
        aiProviderService = AiProviderService()
    }
    
    @Test
    fun `should send message successfully`() {
        val message = "Hello, AI!"
        val result = aiProviderService.sendMessage(message)
        
        assertNotNull(result)
        assertTrue(result.isNotEmpty())
        assertTrue(result.contains("placeholder"))
    }
    
    @Test
    fun `should get available providers`() {
        val providers = aiProviderService.getAvailableProviders()
        
        assertNotNull(providers)
        assertTrue(providers.isNotEmpty())
        assertTrue(providers.contains("OpenAI"))
        assertTrue(providers.contains("Anthropic"))
        assertTrue(providers.contains("Local"))
        assertTrue(providers.contains("Custom"))
    }
    
    @Test
    fun `should set provider successfully`() {
        val provider = "OpenAI"
        aiProviderService.setProvider(provider)
        
        // Since we don't have a getter, we test by sending a message
        // and ensuring it doesn't throw an exception
        val result = aiProviderService.sendMessage("test")
        assertNotNull(result)
    }
    
    @Test
    fun `should handle empty message`() {
        val result = aiProviderService.sendMessage("")
        
        assertNotNull(result)
        assertTrue(result.isNotEmpty())
    }
    
    @Test
    fun `should handle long message`() {
        val longMessage = "A".repeat(1000)
        val result = aiProviderService.sendMessage(longMessage)
        
        assertNotNull(result)
        assertTrue(result.isNotEmpty())
    }
}

package com.enterprise.aiplugin

import com.enterprise.aiplugin.security.SecurityService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*

class SecurityServiceTest {
    
    private lateinit var securityService: SecurityService
    
    @BeforeEach
    fun setUp() {
        securityService = SecurityService()
    }
    
    @Test
    fun `should validate safe commands`() {
        val safeCommands = listOf(
            "echo 'hello world'",
            "ls -la",
            "git status",
            "npm install",
            "python script.py"
        )
        
        safeCommands.forEach { command ->
            assertTrue(securityService.validateCommand(command), "Command '$command' should be valid")
        }
    }
    
    @Test
    fun `should reject dangerous commands`() {
        val dangerousCommands = listOf(
            "rm -rf /",
            "format C:",
            "del /s /q *",
            "shutdown /s",
            "reboot"
        )
        
        dangerousCommands.forEach { command ->
            assertFalse(securityService.validateCommand(command), "Command '$command' should be rejected")
        }
    }
    
    @Test
    fun `should reject case insensitive dangerous commands`() {
        val dangerousCommands = listOf(
            "RM -RF /",
            "FORMAT C:",
            "DEL /S /Q *",
            "SHUTDOWN /S",
            "Reboot"
        )
        
        dangerousCommands.forEach { command ->
            assertFalse(securityService.validateCommand(command), "Command '$command' should be rejected")
        }
    }
    
    @Test
    fun `should run security audit successfully`() {
        val result = securityService.runSecurityAudit()
        
        assertNotNull(result)
        assertTrue(result.isNotEmpty())
        assertTrue(result.contains("completed"))
    }
}

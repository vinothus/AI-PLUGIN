package com.enterprise.aiplugin.settings

import com.intellij.openapi.options.Configurable
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.VerticalFlowLayout
import com.intellij.ui.components.*
import com.intellij.util.ui.FormBuilder
import com.intellij.util.ui.JBUI
import com.intellij.util.ui.UIUtil
import java.awt.*
import javax.swing.*

class AiPluginConfigurable(private val project: Project) : Configurable {
    
    private var aiProviderCombo: JComboBox<String>? = null
    private var apiKeyField: JPasswordField? = null
    private var modelCombo: JComboBox<String>? = null
    private var encryptionLevelCombo: JComboBox<String>? = null
    private var dataRetentionField: JTextField? = null
    private var autoBackupCheckbox: JCheckBox? = null
    private var auditLoggingCheckbox: JCheckBox? = null
    private var complianceModeCombo: JComboBox<String>? = null
    private var dataAnonymizationCheckbox: JCheckBox? = null
    private var testConnectionButton: JButton? = null
    private val providerModels = mapOf(
        "OpenAI" to listOf("gpt-4", "gpt-3.5-turbo"),
        "Anthropic" to listOf("claude-3-opus-20240229", "claude-3-sonnet-20240229"),
        "Gemini" to listOf("gemini-pro", "gemini-1.5-pro"),
        "Local" to listOf("local-model"),
        "Custom" to listOf("custom-model")
    )

    override fun getDisplayName(): String = "Enterprise AI Plugin"
    
    override fun createComponent(): JComponent {
        val panel = JPanel(VerticalFlowLayout())
        panel.border = JBUI.Borders.empty(10)
        
        // AI Provider Settings
        val aiPanel = createAISettingsPanel()
        panel.add(aiPanel)
        
        // Security Settings
        val securityPanel = createSecuritySettingsPanel()
        panel.add(securityPanel)
        
        // Compliance Settings
        val compliancePanel = createComplianceSettingsPanel()
        panel.add(compliancePanel)
        
        return panel
    }
    
    private fun createAISettingsPanel(): JPanel {
        val panel = JPanel()
        panel.layout = GridBagLayout()
        panel.border = JBUI.Borders.compound(
            JBUI.Borders.customLine(Color.GRAY),
            JBUI.Borders.empty(10)
        )
        val gbc = GridBagConstraints()
        gbc.insets = JBUI.insets(5)
        gbc.anchor = GridBagConstraints.WEST
        // Provider
        panel.add(JLabel("AI Provider:"), gbc)
        gbc.gridx = 1
        aiProviderCombo = JComboBox(providerModels.keys.toTypedArray())
        panel.add(aiProviderCombo, gbc)
        // API Key/Endpoint
        gbc.gridx = 0
        gbc.gridy = 1
        val apiKeyLabel = JLabel("API Key:")
        panel.add(apiKeyLabel, gbc)
        gbc.gridx = 1
        apiKeyField = JPasswordField(20)
        panel.add(apiKeyField, gbc)
        // Model
        gbc.gridx = 0
        gbc.gridy = 2
        panel.add(JLabel("Model:"), gbc)
        gbc.gridx = 1
        modelCombo = JComboBox(providerModels["OpenAI"]?.toTypedArray())
        panel.add(modelCombo, gbc)
        // Test Connection Button
        gbc.gridx = 0
        gbc.gridy = 3
        gbc.gridwidth = 2
        testConnectionButton = JButton("Test Connection")
        panel.add(testConnectionButton, gbc)
        // Listener: Update models and API key label on provider change
        aiProviderCombo?.addActionListener {
            val provider = aiProviderCombo?.selectedItem as? String ?: "OpenAI"
            val models = providerModels[provider] ?: emptyList()
            modelCombo?.model = DefaultComboBoxModel(models.toTypedArray())
            // Update API key label
            apiKeyLabel.text = when (provider) {
                "Local", "Custom" -> "Endpoint:"
                else -> "API Key:"
            }
        }
        // Listener: Test Connection
        testConnectionButton?.addActionListener {
            val provider = aiProviderCombo?.selectedItem as? String ?: "OpenAI"
            val model = modelCombo?.selectedItem as? String ?: ""
            val apiKey = String(apiKeyField?.password ?: CharArray(0))
            val result = AiProviderService().testConnection(provider, model, apiKey)
            JOptionPane.showMessageDialog(panel, result, "Test Connection Result", JOptionPane.INFORMATION_MESSAGE)
        }
        return panel
    }
    
    private fun createSecuritySettingsPanel(): JPanel {
        val panel = JPanel()
        panel.layout = GridBagLayout()
        panel.border = JBUI.Borders.compound(
            JBUI.Borders.customLine(Color.GRAY),
            JBUI.Borders.empty(10)
        )
        
        val gbc = GridBagConstraints()
        gbc.insets = JBUI.insets(5)
        gbc.anchor = GridBagConstraints.WEST
        
        panel.add(JLabel("Encryption Level:"), gbc)
        gbc.gridx = 1
        encryptionLevelCombo = JComboBox(arrayOf("Standard", "Enhanced", "Military"))
        panel.add(encryptionLevelCombo, gbc)
        
        gbc.gridx = 0
        gbc.gridy = 1
        panel.add(JLabel("Data Retention (days):"), gbc)
        gbc.gridx = 1
        dataRetentionField = JTextField("90", 10)
        panel.add(dataRetentionField, gbc)
        
        gbc.gridx = 0
        gbc.gridy = 2
        panel.add(JLabel("Auto-backup:"), gbc)
        gbc.gridx = 1
        autoBackupCheckbox = JCheckBox("Enable automatic backups")
        autoBackupCheckbox?.isSelected = true
        panel.add(autoBackupCheckbox, gbc)
        
        return panel
    }
    
    private fun createComplianceSettingsPanel(): JPanel {
        val panel = JPanel()
        panel.layout = GridBagLayout()
        panel.border = JBUI.Borders.compound(
            JBUI.Borders.customLine(Color.GRAY),
            JBUI.Borders.empty(10)
        )
        
        val gbc = GridBagConstraints()
        gbc.insets = JBUI.insets(5)
        gbc.anchor = GridBagConstraints.WEST
        
        panel.add(JLabel("Compliance Mode:"), gbc)
        gbc.gridx = 1
        complianceModeCombo = JComboBox(arrayOf("GDPR", "SOC2", "HIPAA", "Custom"))
        panel.add(complianceModeCombo, gbc)
        
        gbc.gridx = 0
        gbc.gridy = 1
        panel.add(JLabel("Audit Logging:"), gbc)
        gbc.gridx = 1
        auditLoggingCheckbox = JCheckBox("Enable comprehensive audit logging")
        auditLoggingCheckbox?.isSelected = true
        panel.add(auditLoggingCheckbox, gbc)
        
        gbc.gridx = 0
        gbc.gridy = 2
        panel.add(JLabel("Data Anonymization:"), gbc)
        gbc.gridx = 1
        dataAnonymizationCheckbox = JCheckBox("Enable data anonymization")
        panel.add(dataAnonymizationCheckbox, gbc)
        
        return panel
    }
    
    override fun isModified(): Boolean {
        // Check if any settings have been modified
        return false // Placeholder implementation
    }
    
    override fun apply() {
        // Save settings
    }
    
    override fun reset() {
        // Reset to default values
        aiProviderCombo?.selectedItem = "OpenAI"
        apiKeyField?.text = ""
        modelCombo?.selectedItem = "gpt-4"
        encryptionLevelCombo?.selectedItem = "Standard"
        dataRetentionField?.text = "90"
        autoBackupCheckbox?.isSelected = true
        auditLoggingCheckbox?.isSelected = true
        complianceModeCombo?.selectedItem = "GDPR"
        dataAnonymizationCheckbox?.isSelected = false
    }
    
    override fun disposeUIResources() {
        // Clean up resources
        aiProviderCombo = null
        apiKeyField = null
        modelCombo = null
        encryptionLevelCombo = null
        dataRetentionField = null
        autoBackupCheckbox = null
        auditLoggingCheckbox = null
        complianceModeCombo = null
        dataAnonymizationCheckbox = null
    }
}

class AiPluginApplicationConfigurable : Configurable {
    
    override fun getDisplayName(): String = "Enterprise AI Plugin (Application)"
    
    override fun createComponent(): JComponent {
        val panel = JPanel(VerticalFlowLayout())
        panel.border = JBUI.Borders.empty(10)
        
        val infoLabel = JLabel("""
            <html>
            <h3>Enterprise AI Plugin - Application Settings</h3>
            <p>This plugin provides enterprise-grade AI assistance with advanced security and compliance features.</p>
            <br>
            <p><b>Features:</b></p>
            <ul>
                <li>Multi-provider AI integration</li>
                <li>Advanced security with AES-256-GCM encryption</li>
                <li>Compliance modes (GDPR, SOC2, HIPAA)</li>
                <li>Sophisticated workflow orchestration</li>
                <li>Model Context Protocol (MCP) support</li>
                <li>Comprehensive audit logging</li>
            </ul>
            <br>
            <p>Use the project-specific settings to configure AI providers and security options.</p>
            </html>
        """.trimIndent())
        
        panel.add(infoLabel)
        return panel
    }
    
    override fun isModified(): Boolean = false
    
    override fun apply() {
        // No application-level settings to save
    }
    
    override fun reset() {
        // No application-level settings to reset
    }
    
    override fun disposeUIResources() {
        // No resources to dispose
    }
}

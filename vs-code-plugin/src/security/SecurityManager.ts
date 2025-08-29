import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface SecurityConfig {
    encryptionEnabled: boolean;
    complianceMode: 'gdpr' | 'soc2' | 'hipaa' | 'custom';
    auditLogging: boolean;
    dataRetention: number; // days
    allowedCommands: string[];
    blockedCommands: string[];
    allowedFileExtensions: string[];
    blockedFileExtensions: string[];
}

export interface SecurityAuditResult {
    timestamp: number;
    status: 'pass' | 'fail' | 'warning';
    checks: {
        encryption: { status: string; details: string };
        configuration: { status: string; details: string };
        vulnerabilities: { status: string; issues: string[] };
        compliance: { status: string; details: string };
    };
    recommendations: string[];
}

export interface AuditLogEntry {
    timestamp: number;
    action: string;
    user: string;
    resource: string;
    result: 'success' | 'failure' | 'warning';
    details: string;
    ipAddress?: string;
    sessionId: string;
}

export class SecurityManager {
    private context: vscode.ExtensionContext;
    private encryptionKey: string | null = null;
    private isInitialized: boolean = false;
    private auditLog: AuditLogEntry[] = [];
    private securityConfig: SecurityConfig;
    private auditLogPath: string;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.auditLogPath = path.join(context.globalStorageUri.fsPath, 'audit.log');
        this.securityConfig = this.getDefaultSecurityConfig();
        this.ensureAuditDirectory();
    }

    private getDefaultSecurityConfig(): SecurityConfig {
        return {
            encryptionEnabled: true,
            complianceMode: 'gdpr',
            auditLogging: true,
            dataRetention: 90,
            allowedCommands: [
                'echo', 'ls', 'cat', 'grep', 'find', 'git', 'npm', 'yarn', 'python', 'node'
            ],
            blockedCommands: [
                'rm -rf', 'format', 'del /s /q', 'shutdown', 'reboot', 'sudo', 'su'
            ],
            allowedFileExtensions: [
                '.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.txt', '.py', '.java', '.kt', '.cs', '.cpp', '.h', '.rs', '.go', '.php', '.rb', '.swift'
            ],
            blockedFileExtensions: [
                '.exe', '.bat', '.cmd', '.ps1', '.sh', '.dll', '.so', '.dylib', '.app'
            ]
        };
    }

    private ensureAuditDirectory(): void {
        const auditDir = path.dirname(this.auditLogPath);
        if (!fs.existsSync(auditDir)) {
            fs.mkdirSync(auditDir, { recursive: true });
        }
    }

    public async initialize(): Promise<void> {
        try {
            // Load or generate encryption key
            await this.loadEncryptionKey();
            
            // Load security configuration
            await this.loadSecurityConfig();
            
            // Initialize audit logging
            await this.initializeAuditLogging();
            
            this.isInitialized = true;
            
            // Log initialization
            await this.logAuditEvent('security_initialization', 'system', 'security_manager', 'success', 'Security manager initialized successfully');
            
        } catch (error) {
            await this.logAuditEvent('security_initialization', 'system', 'security_manager', 'failure', `Initialization failed: ${error}`);
            throw new Error(`Security Manager initialization failed: ${error}`);
        }
    }

    private async loadEncryptionKey(): Promise<void> {
        try {
            this.encryptionKey = await this.context.secrets.get('encryptionKey') || null;
            
            if (!this.encryptionKey) {
                // Generate new encryption key
                this.encryptionKey = crypto.randomBytes(32).toString('hex');
                await this.context.secrets.store('encryptionKey', this.encryptionKey);
            }
        } catch (error) {
            throw new Error(`Failed to load encryption key: ${error}`);
        }
    }

    private async loadSecurityConfig(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('enterpriseAiPlugin');
            
            this.securityConfig.complianceMode = config.get('complianceMode', 'gdpr') as 'gdpr' | 'soc2' | 'hipaa' | 'custom';
            this.securityConfig.encryptionEnabled = config.get('encryptionEnabled', true);
            this.securityConfig.auditLogging = config.get('auditLogging', true);
            this.securityConfig.dataRetention = config.get('dataRetention', 90);
            
        } catch (error) {
            console.warn(`Failed to load security config, using defaults: ${error}`);
        }
    }

    private async initializeAuditLogging(): Promise<void> {
        if (this.securityConfig.auditLogging) {
            try {
                // Load existing audit log
                if (fs.existsSync(this.auditLogPath)) {
                    const logContent = fs.readFileSync(this.auditLogPath, 'utf8');
                    const lines = logContent.split('\n').filter(line => line.trim());
                    
                    for (const line of lines) {
                        try {
                            const entry = JSON.parse(line);
                            this.auditLog.push(entry);
                        } catch (parseError) {
                            // Skip invalid log entries
                        }
                    }
                }
                
                // Clean old audit entries
                await this.cleanupAuditLog();
                
            } catch (error) {
                console.warn(`Failed to initialize audit logging: ${error}`);
            }
        }
    }

    public async validateCommand(command: string): Promise<boolean> {
        if (!this.isInitialized) {
            throw new Error('Security Manager not initialized');
        }

        try {
            // Check for blocked commands
            for (const blocked of this.securityConfig.blockedCommands) {
                if (command.toLowerCase().includes(blocked.toLowerCase())) {
                    await this.logAuditEvent('command_validation', 'user', command, 'failure', `Blocked command detected: ${blocked}`);
                    throw new Error(`Dangerous command detected: ${blocked}`);
                }
            }

            // Additional validation based on compliance mode
            const config = vscode.workspace.getConfiguration('enterpriseAiPlugin');
            const complianceMode = config.get('complianceMode', 'gdpr') as string;

            if (complianceMode === 'hipaa' || complianceMode === 'soc2') {
                // Stricter validation for healthcare/financial compliance
                const sensitivePatterns = [
                    /password/i, /secret/i, /key/i, /token/i, /credential/i,
                    /ssn/i, /credit.?card/i, /account.?number/i
                ];
                
                for (const pattern of sensitivePatterns) {
                    if (pattern.test(command)) {
                        await this.logAuditEvent('command_validation', 'user', command, 'failure', `Sensitive data pattern detected in command`);
                        throw new Error('Command contains sensitive data patterns');
                    }
                }
            }

            await this.logAuditEvent('command_validation', 'user', command, 'success', 'Command validated successfully');
            return true;
            
        } catch (error) {
            throw error;
        }
    }

    public async encryptData(data: string): Promise<string> {
        if (!this.isInitialized || !this.encryptionKey) {
            throw new Error('Encryption key not initialized');
        }

        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
            
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            // Return format: iv:authTag:encryptedData
            return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
            
        } catch (error) {
            throw new Error(`Encryption failed: ${error}`);
        }
    }

    public async decryptData(encryptedData: string): Promise<string> {
        if (!this.isInitialized || !this.encryptionKey) {
            throw new Error('Encryption key not initialized');
        }

        try {
            const parts = encryptedData.split(':');
            if (parts.length !== 3) {
                throw new Error('Invalid encrypted data format');
            }

            const [ivHex, authTagHex, encrypted] = parts;
            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');
            
            const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
            decipher.setAuthTag(authTag);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
            
        } catch (error) {
            throw new Error(`Decryption failed: ${error}`);
        }
    }

    public async validateFilePath(filePath: string): Promise<boolean> {
        if (!this.isInitialized) {
            throw new Error('Security Manager not initialized');
        }

        try {
            const ext = path.extname(filePath).toLowerCase();
            
            // Check for blocked file extensions
            if (this.securityConfig.blockedFileExtensions.includes(ext)) {
                await this.logAuditEvent('file_validation', 'user', filePath, 'failure', `Blocked file extension: ${ext}`);
                throw new Error(`Access denied: Dangerous file extension ${ext}`);
            }

            // Check for path traversal attacks
            const normalizedPath = path.normalize(filePath);
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            
            if (workspaceRoot && !normalizedPath.startsWith(workspaceRoot)) {
                await this.logAuditEvent('file_validation', 'user', filePath, 'failure', 'Path traversal attack detected');
                throw new Error('Access denied: Path outside workspace');
            }

            await this.logAuditEvent('file_validation', 'user', filePath, 'success', 'File path validated successfully');
            return true;
            
        } catch (error) {
            throw error;
        }
    }

    public async runSecurityAudit(): Promise<SecurityAuditResult> {
        if (!this.isInitialized) {
            throw new Error('Security Manager not initialized');
        }

        const result: SecurityAuditResult = {
            timestamp: Date.now(),
            status: 'pass',
            checks: {
                encryption: { status: 'pass', details: 'Encryption is properly configured' },
                configuration: { status: 'pass', details: 'Security configuration is valid' },
                vulnerabilities: { status: 'pass', issues: [] },
                compliance: { status: 'pass', details: 'Compliance requirements met' }
            },
            recommendations: []
        };

        try {
            // Check encryption
            if (!this.encryptionKey) {
                result.checks.encryption.status = 'fail';
                result.checks.encryption.details = 'Encryption key not found';
                result.status = 'fail';
            }

            // Check configuration
            if (!this.securityConfig.encryptionEnabled) {
                result.checks.configuration.status = 'warning';
                result.checks.configuration.details = 'Encryption is disabled';
                result.recommendations.push('Enable encryption for better security');
            }

            // Check for vulnerabilities
            const vulnerabilities = await this.detectVulnerabilities();
            if (vulnerabilities.length > 0) {
                result.checks.vulnerabilities.status = 'fail';
                result.checks.vulnerabilities.issues = vulnerabilities;
                result.status = 'fail';
            }

            // Check compliance
            const complianceCheck = await this.checkCompliance();
            if (complianceCheck.status !== 'pass') {
                result.checks.compliance.status = complianceCheck.status;
                result.checks.compliance.details = complianceCheck.details;
                if (complianceCheck.status === 'fail') {
                    result.status = 'fail';
                }
            }

            // Log audit result
            await this.logAuditEvent('security_audit', 'system', 'security_manager', 
                result.status === 'pass' ? 'success' : 'warning', 
                `Security audit ${result.status}: ${Object.keys(result.checks).filter(k => result.checks[k as keyof typeof result.checks].status !== 'pass').length} issues found`
            );

            return result;
            
        } catch (error) {
            result.status = 'fail';
            result.checks.configuration.status = 'fail';
            result.checks.configuration.details = `Audit failed: ${error}`;
            return result;
        }
    }

    private async detectVulnerabilities(): Promise<string[]> {
        const vulnerabilities: string[] = [];

        try {
            // Check for weak encryption
            if (this.encryptionKey && this.encryptionKey.length < 32) {
                vulnerabilities.push('Weak encryption key detected');
            }

            // Check for insecure configuration
            if (!this.securityConfig.auditLogging) {
                vulnerabilities.push('Audit logging is disabled');
            }

            // Check for overly permissive settings
            if (this.securityConfig.allowedCommands.length > 50) {
                vulnerabilities.push('Too many allowed commands configured');
            }

            // Check for recent security events
            const recentFailures = this.auditLog.filter(entry => 
                entry.result === 'failure' && 
                Date.now() - entry.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
            );

            if (recentFailures.length > 10) {
                vulnerabilities.push(`High number of security failures: ${recentFailures.length} in last 24 hours`);
            }

        } catch (error) {
            vulnerabilities.push(`Vulnerability detection failed: ${error}`);
        }

        return vulnerabilities;
    }

    private async checkCompliance(): Promise<{ status: string; details: string }> {
        try {
            switch (this.securityConfig.complianceMode) {
                case 'gdpr':
                    return this.checkGDPRCompliance();
                case 'soc2':
                    return this.checkSOC2Compliance();
                case 'hipaa':
                    return this.checkHIPAACompliance();
                default:
                    return { status: 'pass', details: 'Compliance mode not specified' };
            }
        } catch (error) {
            return { status: 'fail', details: `Compliance check failed: ${error}` };
        }
    }

    private async checkGDPRCompliance(): Promise<{ status: string; details: string }> {
        const requirements = [
            this.securityConfig.encryptionEnabled,
            this.securityConfig.auditLogging,
            this.securityConfig.dataRetention > 0
        ];

        const passed = requirements.filter(req => req).length;
        const total = requirements.length;

        if (passed === total) {
            return { status: 'pass', details: 'GDPR compliance requirements met' };
        } else {
            return { 
                status: 'warning', 
                details: `GDPR compliance: ${passed}/${total} requirements met` 
            };
        }
    }

    private async checkSOC2Compliance(): Promise<{ status: string; details: string }> {
        const requirements = [
            this.securityConfig.encryptionEnabled,
            this.securityConfig.auditLogging,
            this.securityConfig.dataRetention >= 90,
            this.auditLog.length > 0
        ];

        const passed = requirements.filter(req => req).length;
        const total = requirements.length;

        if (passed === total) {
            return { status: 'pass', details: 'SOC2 compliance requirements met' };
        } else {
            return { 
                status: 'warning', 
                details: `SOC2 compliance: ${passed}/${total} requirements met` 
            };
        }
    }

    private async checkHIPAACompliance(): Promise<{ status: string; details: string }> {
        const requirements = [
            this.securityConfig.encryptionEnabled,
            this.securityConfig.auditLogging,
            this.securityConfig.dataRetention >= 180,
            this.auditLog.length > 0,
            this.securityConfig.blockedCommands.length > 0
        ];

        const passed = requirements.filter(req => req).length;
        const total = requirements.length;

        if (passed === total) {
            return { status: 'pass', details: 'HIPAA compliance requirements met' };
        } else {
            return { 
                status: 'fail', 
                details: `HIPAA compliance: ${passed}/${total} requirements met` 
            };
        }
    }

    private async logAuditEvent(
        action: string, 
        user: string, 
        resource: string, 
        result: 'success' | 'failure' | 'warning', 
        details: string
    ): Promise<void> {
        if (!this.securityConfig.auditLogging) {
            return;
        }

        const entry: AuditLogEntry = {
            timestamp: Date.now(),
            action,
            user,
            resource,
            result,
            details,
            sessionId: this.generateSessionId()
        };

        this.auditLog.push(entry);

        try {
            // Write to file
            const logLine = JSON.stringify(entry) + '\n';
            fs.appendFileSync(this.auditLogPath, logLine);
        } catch (error) {
            console.warn(`Failed to write audit log: ${error}`);
        }
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private async cleanupAuditLog(): Promise<void> {
        if (!this.securityConfig.auditLogging) {
            return;
        }

        const cutoffTime = Date.now() - (this.securityConfig.dataRetention * 24 * 60 * 60 * 1000);
        this.auditLog = this.auditLog.filter(entry => entry.timestamp > cutoffTime);

        try {
            // Rewrite audit log file
            const logContent = this.auditLog.map(entry => JSON.stringify(entry)).join('\n') + '\n';
            fs.writeFileSync(this.auditLogPath, logContent);
        } catch (error) {
            console.warn(`Failed to cleanup audit log: ${error}`);
        }
    }

    public getAuditLog(): AuditLogEntry[] {
        return [...this.auditLog];
    }

    public getSecurityConfig(): SecurityConfig {
        return { ...this.securityConfig };
    }

    public async updateSecurityConfig(config: Partial<SecurityConfig>): Promise<void> {
        this.securityConfig = { ...this.securityConfig, ...config };
        
        // Save to workspace configuration
        const workspaceConfig = vscode.workspace.getConfiguration('enterpriseAiPlugin');
        await workspaceConfig.update('complianceMode', this.securityConfig.complianceMode);
        await workspaceConfig.update('encryptionEnabled', this.securityConfig.encryptionEnabled);
        await workspaceConfig.update('auditLogging', this.securityConfig.auditLogging);
        await workspaceConfig.update('dataRetention', this.securityConfig.dataRetention);

        await this.logAuditEvent('config_update', 'user', 'security_config', 'success', 'Security configuration updated');
    }
}

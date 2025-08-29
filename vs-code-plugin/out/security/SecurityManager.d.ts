import * as vscode from 'vscode';
export interface SecurityConfig {
    encryptionEnabled: boolean;
    complianceMode: 'gdpr' | 'soc2' | 'hipaa' | 'custom';
    auditLogging: boolean;
    dataRetention: number;
    allowedCommands: string[];
    blockedCommands: string[];
    allowedFileExtensions: string[];
    blockedFileExtensions: string[];
}
export interface SecurityAuditResult {
    timestamp: number;
    status: 'pass' | 'fail' | 'warning';
    checks: {
        encryption: {
            status: string;
            details: string;
        };
        configuration: {
            status: string;
            details: string;
        };
        vulnerabilities: {
            status: string;
            issues: string[];
        };
        compliance: {
            status: string;
            details: string;
        };
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
export declare class SecurityManager {
    private context;
    private encryptionKey;
    private isInitialized;
    private auditLog;
    private securityConfig;
    private auditLogPath;
    constructor(context: vscode.ExtensionContext);
    private getDefaultSecurityConfig;
    private ensureAuditDirectory;
    initialize(): Promise<void>;
    private loadEncryptionKey;
    private loadSecurityConfig;
    private initializeAuditLogging;
    validateCommand(command: string): Promise<boolean>;
    encryptData(data: string): Promise<string>;
    decryptData(encryptedData: string): Promise<string>;
    validateFilePath(filePath: string): Promise<boolean>;
    runSecurityAudit(): Promise<SecurityAuditResult>;
    private detectVulnerabilities;
    private checkCompliance;
    private checkGDPRCompliance;
    private checkSOC2Compliance;
    private checkHIPAACompliance;
    private logAuditEvent;
    private generateSessionId;
    private cleanupAuditLog;
    getAuditLog(): AuditLogEntry[];
    getSecurityConfig(): SecurityConfig;
    updateSecurityConfig(config: Partial<SecurityConfig>): Promise<void>;
}
//# sourceMappingURL=SecurityManager.d.ts.map
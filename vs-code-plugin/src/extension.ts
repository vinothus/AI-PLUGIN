import * as vscode from 'vscode';
import { AiPluginManager } from './core/AiPluginManager';
import { SecurityManager } from './security/SecurityManager';
import { ChatProvider } from './providers/ChatProvider';
import { PluginProvider } from './providers/PluginProvider';
import { SecurityProvider } from './providers/SecurityProvider';
import { AuditProvider } from './providers/AuditProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Enterprise AI Plugin is now active!');

    // Initialize core managers
    const securityManager = new SecurityManager(context);
    const aiPluginManager = new AiPluginManager(context, securityManager);

    // Register providers
    const chatProvider = new ChatProvider(context, aiPluginManager);
    const pluginProvider = new PluginProvider(context, aiPluginManager);
    const securityProvider = new SecurityProvider(context, securityManager);
    const auditProvider = new AuditProvider(context, securityManager);

    // Register commands
    const startCommand = vscode.commands.registerCommand('enterprise-ai-plugin.start', () => {
        aiPluginManager.start();
    });

    const configureCommand = vscode.commands.registerCommand('enterprise-ai-plugin.configure', () => {
        aiPluginManager.showConfiguration();
    });

    const installPluginCommand = vscode.commands.registerCommand('enterprise-ai-plugin.install-plugin', () => {
        pluginProvider.installPlugin();
    });

    const securityAuditCommand = vscode.commands.registerCommand('enterprise-ai-plugin.security-audit', () => {
        securityManager.runSecurityAudit();
    });

    // Register tree data providers
    vscode.window.registerTreeDataProvider('enterprise-ai-plugin.chat', chatProvider);
    vscode.window.registerTreeDataProvider('enterprise-ai-plugin.plugins', pluginProvider);
    vscode.window.registerTreeDataProvider('enterprise-ai-plugin.security', securityProvider);
    vscode.window.registerTreeDataProvider('enterprise-ai-plugin.audit', auditProvider);

    // Add commands to context
    context.subscriptions.push(
        startCommand,
        configureCommand,
        installPluginCommand,
        securityAuditCommand
    );

    // Initialize the plugin manager
    aiPluginManager.initialize();
}

export function deactivate() {
    console.log('Enterprise AI Plugin is now deactivated!');
}

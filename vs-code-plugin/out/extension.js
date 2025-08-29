"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const AiPluginManager_1 = require("./core/AiPluginManager");
const SecurityManager_1 = require("./security/SecurityManager");
const ChatProvider_1 = require("./providers/ChatProvider");
const PluginProvider_1 = require("./providers/PluginProvider");
const SecurityProvider_1 = require("./providers/SecurityProvider");
const AuditProvider_1 = require("./providers/AuditProvider");
function activate(context) {
    console.log('Enterprise AI Plugin is now active!');
    // Initialize core managers
    const securityManager = new SecurityManager_1.SecurityManager(context);
    const aiPluginManager = new AiPluginManager_1.AiPluginManager(context, securityManager);
    // Register providers
    const chatProvider = new ChatProvider_1.ChatProvider(context, aiPluginManager);
    const pluginProvider = new PluginProvider_1.PluginProvider(context, aiPluginManager);
    const securityProvider = new SecurityProvider_1.SecurityProvider(context, securityManager);
    const auditProvider = new AuditProvider_1.AuditProvider(context, securityManager);
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
    context.subscriptions.push(startCommand, configureCommand, installPluginCommand, securityAuditCommand);
    // Initialize the plugin manager
    aiPluginManager.initialize();
}
function deactivate() {
    console.log('Enterprise AI Plugin is now deactivated!');
}
//# sourceMappingURL=extension.js.map
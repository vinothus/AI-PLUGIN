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
exports.AuditItem = exports.AuditProvider = void 0;
const vscode = __importStar(require("vscode"));
class AuditProvider {
    constructor(context, securityManager) {
        this.context = context;
        this.securityManager = securityManager;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }
        return Promise.resolve([]);
    }
    getRootItems() {
        return [
            new AuditItem('Recent Activity', 'recent', vscode.TreeItemCollapsibleState.Collapsed),
            new AuditItem('Security Events', 'security', vscode.TreeItemCollapsibleState.Collapsed),
            new AuditItem('File Operations', 'files', vscode.TreeItemCollapsibleState.Collapsed),
            new AuditItem('AI Interactions', 'ai', vscode.TreeItemCollapsibleState.Collapsed),
            new AuditItem('Export Logs', 'export', vscode.TreeItemCollapsibleState.None, {
                command: 'enterprise-ai-plugin.export-logs',
                title: 'Export Audit Logs'
            }),
            new AuditItem('Audit Settings', 'settings', vscode.TreeItemCollapsibleState.None, {
                command: 'enterprise-ai-plugin.configure',
                title: 'Configure Audit Settings'
            })
        ];
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
}
exports.AuditProvider = AuditProvider;
class AuditItem extends vscode.TreeItem {
    constructor(label, type, collapsibleState, command) {
        super(label, collapsibleState);
        this.label = label;
        this.type = type;
        this.collapsibleState = collapsibleState;
        this.command = command;
        this.tooltip = `${this.label}`;
        this.description = this.getDescription();
        this.iconPath = this.getIconPath();
    }
    getDescription() {
        switch (this.type) {
            case 'recent':
                return 'View recent audit events';
            case 'security':
                return 'Security-related audit events';
            case 'files':
                return 'File operation audit trail';
            case 'ai':
                return 'AI interaction logs';
            case 'export':
                return 'Export audit logs for compliance';
            case 'settings':
                return 'Configure audit logging';
            default:
                return '';
        }
    }
    getIconPath() {
        switch (this.type) {
            case 'recent':
                return new vscode.ThemeIcon('history');
            case 'security':
                return new vscode.ThemeIcon('shield');
            case 'files':
                return new vscode.ThemeIcon('files');
            case 'ai':
                return new vscode.ThemeIcon('lightbulb');
            case 'export':
                return new vscode.ThemeIcon('export');
            case 'settings':
                return new vscode.ThemeIcon('gear');
            default:
                return new vscode.ThemeIcon('file');
        }
    }
}
exports.AuditItem = AuditItem;
//# sourceMappingURL=AuditProvider.js.map
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
exports.SecurityItem = exports.SecurityProvider = void 0;
const vscode = __importStar(require("vscode"));
class SecurityProvider {
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
            new SecurityItem('Security Audit', 'audit', vscode.TreeItemCollapsibleState.None, {
                command: 'enterprise-ai-plugin.security-audit',
                title: 'Run Security Audit'
            }),
            new SecurityItem('Encryption Status', 'encryption', vscode.TreeItemCollapsibleState.None),
            new SecurityItem('Access Control', 'access', vscode.TreeItemCollapsibleState.Collapsed),
            new SecurityItem('Compliance', 'compliance', vscode.TreeItemCollapsibleState.Collapsed),
            new SecurityItem('Security Settings', 'settings', vscode.TreeItemCollapsibleState.None, {
                command: 'enterprise-ai-plugin.configure',
                title: 'Configure Security Settings'
            })
        ];
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
}
exports.SecurityProvider = SecurityProvider;
class SecurityItem extends vscode.TreeItem {
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
            case 'audit':
                return 'Run comprehensive security audit';
            case 'encryption':
                return 'View encryption status and keys';
            case 'access':
                return 'Manage access controls and permissions';
            case 'compliance':
                return 'View compliance status and reports';
            case 'settings':
                return 'Configure security parameters';
            default:
                return '';
        }
    }
    getIconPath() {
        switch (this.type) {
            case 'audit':
                return new vscode.ThemeIcon('shield');
            case 'encryption':
                return new vscode.ThemeIcon('lock');
            case 'access':
                return new vscode.ThemeIcon('key');
            case 'compliance':
                return new vscode.ThemeIcon('check');
            case 'settings':
                return new vscode.ThemeIcon('gear');
            default:
                return new vscode.ThemeIcon('file');
        }
    }
}
exports.SecurityItem = SecurityItem;
//# sourceMappingURL=SecurityProvider.js.map
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
exports.PluginItem = exports.PluginProvider = void 0;
const vscode = __importStar(require("vscode"));
class PluginProvider {
    constructor(context, aiPluginManager) {
        this.context = context;
        this.aiPluginManager = aiPluginManager;
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
            new PluginItem('Install Plugin', 'install', vscode.TreeItemCollapsibleState.None, {
                command: 'enterprise-ai-plugin.install-plugin',
                title: 'Install Plugin'
            }),
            new PluginItem('Installed Plugins', 'installed', vscode.TreeItemCollapsibleState.Collapsed),
            new PluginItem('Plugin Marketplace', 'marketplace', vscode.TreeItemCollapsibleState.Collapsed),
            new PluginItem('Plugin Settings', 'settings', vscode.TreeItemCollapsibleState.None, {
                command: 'enterprise-ai-plugin.configure',
                title: 'Configure Plugin Settings'
            })
        ];
    }
    async installPlugin() {
        try {
            const pluginUrl = await vscode.window.showInputBox({
                prompt: 'Enter plugin URL or package name',
                placeHolder: 'https://github.com/user/plugin or @scope/plugin-name'
            });
            if (pluginUrl) {
                // Show progress
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Installing Plugin',
                    cancellable: false
                }, async (progress) => {
                    progress.report({ increment: 0, message: 'Validating plugin...' });
                    // Simulate plugin installation
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    progress.report({ increment: 50, message: 'Downloading plugin...' });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    progress.report({ increment: 100, message: 'Plugin installed successfully!' });
                });
                vscode.window.showInformationMessage(`Plugin installed: ${pluginUrl}`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to install plugin: ${error}`);
        }
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
}
exports.PluginProvider = PluginProvider;
class PluginItem extends vscode.TreeItem {
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
            case 'install':
                return 'Install new AI plugins';
            case 'installed':
                return 'Manage installed plugins';
            case 'marketplace':
                return 'Browse available plugins';
            case 'settings':
                return 'Configure plugin behavior';
            default:
                return '';
        }
    }
    getIconPath() {
        switch (this.type) {
            case 'install':
                return new vscode.ThemeIcon('cloud-download');
            case 'installed':
                return new vscode.ThemeIcon('package');
            case 'marketplace':
                return new vscode.ThemeIcon('store');
            case 'settings':
                return new vscode.ThemeIcon('gear');
            default:
                return new vscode.ThemeIcon('file');
        }
    }
}
exports.PluginItem = PluginItem;
//# sourceMappingURL=PluginProvider.js.map
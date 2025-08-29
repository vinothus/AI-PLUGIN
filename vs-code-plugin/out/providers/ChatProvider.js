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
exports.ChatItem = exports.ChatProvider = void 0;
const vscode = __importStar(require("vscode"));
class ChatProvider {
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
            new ChatItem('Start New Chat', 'start-chat', vscode.TreeItemCollapsibleState.None, {
                command: 'enterprise-ai-plugin.start',
                title: 'Start New Chat'
            }),
            new ChatItem('Recent Conversations', 'recent', vscode.TreeItemCollapsibleState.Collapsed),
            new ChatItem('Saved Prompts', 'saved', vscode.TreeItemCollapsibleState.Collapsed),
            new ChatItem('AI Settings', 'settings', vscode.TreeItemCollapsibleState.None, {
                command: 'enterprise-ai-plugin.configure',
                title: 'Configure AI Settings'
            })
        ];
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
}
exports.ChatProvider = ChatProvider;
class ChatItem extends vscode.TreeItem {
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
            case 'start-chat':
                return 'Begin a new AI conversation';
            case 'recent':
                return 'View recent chat history';
            case 'saved':
                return 'Access saved prompts and templates';
            case 'settings':
                return 'Configure AI provider and settings';
            default:
                return '';
        }
    }
    getIconPath() {
        switch (this.type) {
            case 'start-chat':
                return new vscode.ThemeIcon('comment');
            case 'recent':
                return new vscode.ThemeIcon('history');
            case 'saved':
                return new vscode.ThemeIcon('bookmark');
            case 'settings':
                return new vscode.ThemeIcon('gear');
            default:
                return new vscode.ThemeIcon('file');
        }
    }
}
exports.ChatItem = ChatItem;
//# sourceMappingURL=ChatProvider.js.map
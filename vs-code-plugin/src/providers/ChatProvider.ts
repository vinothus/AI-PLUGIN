import * as vscode from 'vscode';
import { AiPluginManager } from '../core/AiPluginManager';

export class ChatProvider implements vscode.TreeDataProvider<ChatItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ChatItem | undefined | null | void> = new vscode.EventEmitter<ChatItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ChatItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        private context: vscode.ExtensionContext,
        private aiPluginManager: AiPluginManager
    ) {}

    getTreeItem(element: ChatItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ChatItem): Thenable<ChatItem[]> {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }
        return Promise.resolve([]);
    }

    private getRootItems(): ChatItem[] {
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

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}

export class ChatItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly type: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);

        this.tooltip = `${this.label}`;
        this.description = this.getDescription();
        this.iconPath = this.getIconPath();
    }

    private getDescription(): string {
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

    private getIconPath(): vscode.ThemeIcon {
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

import * as vscode from 'vscode';
import { AiPluginManager } from '../core/AiPluginManager';
export declare class ChatProvider implements vscode.TreeDataProvider<ChatItem> {
    private context;
    private aiPluginManager;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<ChatItem | undefined | null | void>;
    constructor(context: vscode.ExtensionContext, aiPluginManager: AiPluginManager);
    getTreeItem(element: ChatItem): vscode.TreeItem;
    getChildren(element?: ChatItem): Thenable<ChatItem[]>;
    private getRootItems;
    refresh(): void;
}
export declare class ChatItem extends vscode.TreeItem {
    readonly label: string;
    readonly type: string;
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    readonly command?: vscode.Command | undefined;
    constructor(label: string, type: string, collapsibleState: vscode.TreeItemCollapsibleState, command?: vscode.Command | undefined);
    private getDescription;
    private getIconPath;
}
//# sourceMappingURL=ChatProvider.d.ts.map
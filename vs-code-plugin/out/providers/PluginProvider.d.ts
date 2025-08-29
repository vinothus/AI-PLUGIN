import * as vscode from 'vscode';
import { AiPluginManager } from '../core/AiPluginManager';
export declare class PluginProvider implements vscode.TreeDataProvider<PluginItem> {
    private context;
    private aiPluginManager;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<PluginItem | undefined | null | void>;
    constructor(context: vscode.ExtensionContext, aiPluginManager: AiPluginManager);
    getTreeItem(element: PluginItem): vscode.TreeItem;
    getChildren(element?: PluginItem): Thenable<PluginItem[]>;
    private getRootItems;
    installPlugin(): Promise<void>;
    refresh(): void;
}
export declare class PluginItem extends vscode.TreeItem {
    readonly label: string;
    readonly type: string;
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    readonly command?: vscode.Command | undefined;
    constructor(label: string, type: string, collapsibleState: vscode.TreeItemCollapsibleState, command?: vscode.Command | undefined);
    private getDescription;
    private getIconPath;
}
//# sourceMappingURL=PluginProvider.d.ts.map
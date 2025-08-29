import * as vscode from 'vscode';
import { SecurityManager } from '../security/SecurityManager';
export declare class SecurityProvider implements vscode.TreeDataProvider<SecurityItem> {
    private context;
    private securityManager;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<SecurityItem | undefined | null | void>;
    constructor(context: vscode.ExtensionContext, securityManager: SecurityManager);
    getTreeItem(element: SecurityItem): vscode.TreeItem;
    getChildren(element?: SecurityItem): Thenable<SecurityItem[]>;
    private getRootItems;
    refresh(): void;
}
export declare class SecurityItem extends vscode.TreeItem {
    readonly label: string;
    readonly type: string;
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    readonly command?: vscode.Command | undefined;
    constructor(label: string, type: string, collapsibleState: vscode.TreeItemCollapsibleState, command?: vscode.Command | undefined);
    private getDescription;
    private getIconPath;
}
//# sourceMappingURL=SecurityProvider.d.ts.map
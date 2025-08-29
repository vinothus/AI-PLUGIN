import * as vscode from 'vscode';
import { SecurityManager } from '../security/SecurityManager';
export declare class AuditProvider implements vscode.TreeDataProvider<AuditItem> {
    private context;
    private securityManager;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<AuditItem | undefined | null | void>;
    constructor(context: vscode.ExtensionContext, securityManager: SecurityManager);
    getTreeItem(element: AuditItem): vscode.TreeItem;
    getChildren(element?: AuditItem): Thenable<AuditItem[]>;
    private getRootItems;
    refresh(): void;
}
export declare class AuditItem extends vscode.TreeItem {
    readonly label: string;
    readonly type: string;
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    readonly command?: vscode.Command | undefined;
    constructor(label: string, type: string, collapsibleState: vscode.TreeItemCollapsibleState, command?: vscode.Command | undefined);
    private getDescription;
    private getIconPath;
}
//# sourceMappingURL=AuditProvider.d.ts.map
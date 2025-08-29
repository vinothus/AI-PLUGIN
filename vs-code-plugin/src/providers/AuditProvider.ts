import * as vscode from 'vscode';
import { SecurityManager } from '../security/SecurityManager';

export class AuditProvider implements vscode.TreeDataProvider<AuditItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<AuditItem | undefined | null | void> = new vscode.EventEmitter<AuditItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AuditItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        private context: vscode.ExtensionContext,
        private securityManager: SecurityManager
    ) {}

    getTreeItem(element: AuditItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AuditItem): Thenable<AuditItem[]> {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }
        return Promise.resolve([]);
    }

    private getRootItems(): AuditItem[] {
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

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}

export class AuditItem extends vscode.TreeItem {
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

    private getIconPath(): vscode.ThemeIcon {
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

import * as vscode from 'vscode';
import { SecurityManager } from '../security/SecurityManager';

export class SecurityProvider implements vscode.TreeDataProvider<SecurityItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SecurityItem | undefined | null | void> = new vscode.EventEmitter<SecurityItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SecurityItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        private context: vscode.ExtensionContext,
        private securityManager: SecurityManager
    ) {}

    getTreeItem(element: SecurityItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SecurityItem): Thenable<SecurityItem[]> {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }
        return Promise.resolve([]);
    }

    private getRootItems(): SecurityItem[] {
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

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}

export class SecurityItem extends vscode.TreeItem {
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

    private getIconPath(): vscode.ThemeIcon {
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

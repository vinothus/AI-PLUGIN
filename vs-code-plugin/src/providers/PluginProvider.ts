import * as vscode from 'vscode';
import { AiPluginManager } from '../core/AiPluginManager';

export class PluginProvider implements vscode.TreeDataProvider<PluginItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PluginItem | undefined | null | void> = new vscode.EventEmitter<PluginItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PluginItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        private context: vscode.ExtensionContext,
        private aiPluginManager: AiPluginManager
    ) {}

    getTreeItem(element: PluginItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PluginItem): Thenable<PluginItem[]> {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }
        return Promise.resolve([]);
    }

    private getRootItems(): PluginItem[] {
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

    public async installPlugin(): Promise<void> {
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
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to install plugin: ${error}`);
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}

export class PluginItem extends vscode.TreeItem {
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

    private getIconPath(): vscode.ThemeIcon {
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

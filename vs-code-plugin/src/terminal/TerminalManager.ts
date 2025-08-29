import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface TerminalInfo {
    terminal: vscode.Terminal;
    busy: boolean;
    lastCommand: string;
    id: number;
    shellPath?: string;
    lastActive: number;
    processId?: number;
    isHot: boolean;
    outputBuffer: string[];
    cwd: string;
}

export interface ProcessInfo {
    pid: number;
    command: string;
    startTime: number;
    isActive: boolean;
    output: string[];
}

export class TerminalManager extends EventEmitter {
    private terminals: TerminalInfo[] = [];
    private nextTerminalId = 1;
    private activeProcesses: Map<number, ProcessInfo> = new Map();
    private shellDetectionCache: Map<string, string> = new Map();

    constructor() {
        super();
        this.setupTerminalEventListeners();
    }

    private setupTerminalEventListeners(): void {
        // Listen for terminal close events
        vscode.window.onDidCloseTerminal((terminal) => {
            const terminalInfo = this.findTerminalByInstance(terminal);
            if (terminalInfo) {
                this.removeTerminal(terminalInfo.id);
            }
        });
    }

    createTerminal(cwd?: string, shellPath?: string): TerminalInfo {
        const terminalOptions: vscode.TerminalOptions = {
            cwd: cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
            name: "Enterprise AI Plugin",
            iconPath: new vscode.ThemeIcon("robot"),
            env: {
                ENTERPRISE_AI_PLUGIN_ACTIVE: "true",
                ...this.getDefaultEnvironment(),
            },
        };

        if (shellPath) {
            terminalOptions.shellPath = shellPath;
        }

        const terminal = vscode.window.createTerminal(terminalOptions);
        const newInfo: TerminalInfo = {
            terminal,
            busy: false,
            lastCommand: "",
            id: this.nextTerminalId++,
            shellPath: shellPath || this.detectShell(),
            lastActive: Date.now(),
            isHot: false,
            outputBuffer: [],
            cwd: cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir()
        };

        this.terminals.push(newInfo);
        this.emit('terminalCreated', newInfo);
        return newInfo;
    }

    async runCommand(command: string, cwd?: string, shellPath?: string): Promise<TerminalProcess> {
        const terminalInfo = this.createTerminal(cwd, shellPath);
        const process = new TerminalProcess(terminalInfo, command, this);
        
        // Track the process
        const processInfo: ProcessInfo = {
            pid: process.processId || Date.now(),
            command,
            startTime: Date.now(),
            isActive: true,
            output: []
        };
        
        this.activeProcesses.set(process.processId || Date.now(), processInfo);
        this.updateTerminalBusyState(terminalInfo.id, true);
        
        return process;
    }

    getTerminals(busyOnly: boolean = false): TerminalInfo[] {
        if (busyOnly) {
            return this.terminals.filter(t => t.busy);
        }
        return this.terminals.filter(t => !this.isTerminalClosed(t.terminal));
    }

    getActiveProcesses(): ProcessInfo[] {
        return Array.from(this.activeProcesses.values()).filter(p => p.isActive);
    }

    isProcessHot(processId: number): boolean {
        const process = this.activeProcesses.get(processId);
        if (!process) return false;
        
        // Consider a process "hot" if it's been active for less than 5 seconds
        return process.isActive && (Date.now() - process.startTime) < 5000;
    }

    getUnretrievedOutput(terminalId: number): string {
        const terminal = this.getTerminal(terminalId);
        if (!terminal) return '';
        
        const output = terminal.outputBuffer.join('\n');
        terminal.outputBuffer = [];
        return output;
    }

    private detectShell(): string {
        // Check cache first
        const platform = os.platform();
        if (this.shellDetectionCache.has(platform)) {
            return this.shellDetectionCache.get(platform)!;
        }

        let shell = 'bash';

        // Multi-layered shell detection like Cline
        if (platform === 'win32') {
            // Check VS Code settings first
            const vscodeShell = vscode.workspace.getConfiguration('terminal.integrated.shell').get('windows') as string;
            if (vscodeShell) {
                shell = vscodeShell;
            } else if (process.env.COMSPEC) {
                shell = process.env.COMSPEC;
            } else {
                shell = 'cmd.exe';
            }
        } else if (platform === 'darwin') {
            // macOS
            if (process.env.SHELL) {
                shell = process.env.SHELL;
            } else {
                shell = '/bin/zsh';
            }
        } else {
            // Linux
            if (process.env.SHELL) {
                shell = process.env.SHELL;
            } else {
                shell = '/bin/bash';
            }
        }

        this.shellDetectionCache.set(platform, shell);
        return shell;
    }

    private getDefaultEnvironment(): NodeJS.ProcessEnv {
        return {
            ...process.env,
            ENTERPRISE_AI_PLUGIN_VERSION: '1.0.0',
            ENTERPRISE_AI_PLUGIN_MODE: 'active',
            TERM: 'xterm-256color'
        };
    }

    private findTerminalByInstance(terminal: vscode.Terminal): TerminalInfo | undefined {
        return this.terminals.find(t => t.terminal === terminal);
    }

    private isTerminalClosed(terminal: vscode.Terminal): boolean {
        return terminal.exitStatus !== undefined;
    }

    public updateTerminalBusyState(terminalId: number, busy: boolean): void {
        const terminal = this.getTerminal(terminalId);
        if (terminal) {
            terminal.busy = busy;
            terminal.lastActive = Date.now();
        }
    }

    getTerminal(id: number): TerminalInfo | undefined {
        return this.terminals.find(t => t.id === id);
    }

    removeTerminal(id: number): void {
        this.terminals = this.terminals.filter(t => t.id !== id);
        this.emit('terminalRemoved', id);
    }

    updateTerminalOutput(terminalId: number, output: string): void {
        const terminal = this.getTerminal(terminalId);
        if (terminal) {
            terminal.outputBuffer.push(output);
            terminal.lastActive = Date.now();
        }
    }

    markProcessInactive(processId: number): void {
        const process = this.activeProcesses.get(processId);
        if (process) {
            process.isActive = false;
        }
    }
}

export class TerminalProcess extends EventEmitter {
    public processId: number;
    private terminalInfo: TerminalInfo;
    private command: string;
    private terminalManager: TerminalManager;
    private isCompleted = false;
    private exitCode: number | null = null;

    constructor(terminalInfo: TerminalInfo, command: string, terminalManager: TerminalManager) {
        super();
        this.terminalInfo = terminalInfo;
        this.command = command;
        this.terminalManager = terminalManager;
        this.processId = Date.now();
        
        this.executeCommand();
    }

    private async executeCommand(): Promise<void> {
        try {
            // Send the command to the terminal
            this.terminalInfo.terminal.sendText(this.command);
            this.terminalInfo.lastCommand = this.command;
            
            // Emit start event
            this.emit('started', this.processId);
            
            // For now, we'll assume the command completes after a delay
            // In a real implementation, you'd listen for terminal output events
            setTimeout(() => {
                this.complete();
            }, 1000);
            
        } catch (error) {
            this.emit('error', error);
        }
    }

    private complete(): void {
        this.isCompleted = true;
        this.exitCode = 0;
        this.terminalManager.markProcessInactive(this.processId);
        this.terminalManager.updateTerminalBusyState(this.terminalInfo.id, false);
        
        this.emit('completed', this.exitCode);
        this.emit('continue');
    }

    continue(): void {
        if (!this.isCompleted) {
            this.complete();
        }
    }

    // Get completion promise
    getCompletionPromise(): Promise<number> {
        return new Promise((resolve, reject) => {
            if (this.isCompleted) {
                resolve(this.exitCode || 0);
            } else {
                this.once('completed', resolve);
                this.once('error', reject);
            }
        });
    }
}

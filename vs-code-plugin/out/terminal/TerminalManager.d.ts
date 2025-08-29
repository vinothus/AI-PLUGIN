import * as vscode from 'vscode';
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
export declare class TerminalManager extends EventEmitter {
    private terminals;
    private nextTerminalId;
    private activeProcesses;
    private shellDetectionCache;
    constructor();
    private setupTerminalEventListeners;
    createTerminal(cwd?: string, shellPath?: string): TerminalInfo;
    runCommand(command: string, cwd?: string, shellPath?: string): Promise<TerminalProcess>;
    getTerminals(busyOnly?: boolean): TerminalInfo[];
    getActiveProcesses(): ProcessInfo[];
    isProcessHot(processId: number): boolean;
    getUnretrievedOutput(terminalId: number): string;
    private detectShell;
    private getDefaultEnvironment;
    private findTerminalByInstance;
    private isTerminalClosed;
    updateTerminalBusyState(terminalId: number, busy: boolean): void;
    getTerminal(id: number): TerminalInfo | undefined;
    removeTerminal(id: number): void;
    updateTerminalOutput(terminalId: number, output: string): void;
    markProcessInactive(processId: number): void;
}
export declare class TerminalProcess extends EventEmitter {
    processId: number;
    private terminalInfo;
    private command;
    private terminalManager;
    private isCompleted;
    private exitCode;
    constructor(terminalInfo: TerminalInfo, command: string, terminalManager: TerminalManager);
    private executeCommand;
    private complete;
    continue(): void;
    getCompletionPromise(): Promise<number>;
}
//# sourceMappingURL=TerminalManager.d.ts.map
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalProcess = exports.TerminalManager = void 0;
const vscode = __importStar(require("vscode"));
const os = __importStar(require("os"));
const events_1 = require("events");
class TerminalManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.terminals = [];
        this.nextTerminalId = 1;
        this.activeProcesses = new Map();
        this.shellDetectionCache = new Map();
        this.setupTerminalEventListeners();
    }
    setupTerminalEventListeners() {
        // Listen for terminal close events
        vscode.window.onDidCloseTerminal((terminal) => {
            const terminalInfo = this.findTerminalByInstance(terminal);
            if (terminalInfo) {
                this.removeTerminal(terminalInfo.id);
            }
        });
    }
    createTerminal(cwd, shellPath) {
        const terminalOptions = {
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
        const newInfo = {
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
    async runCommand(command, cwd, shellPath) {
        const terminalInfo = this.createTerminal(cwd, shellPath);
        const process = new TerminalProcess(terminalInfo, command, this);
        // Track the process
        const processInfo = {
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
    getTerminals(busyOnly = false) {
        if (busyOnly) {
            return this.terminals.filter(t => t.busy);
        }
        return this.terminals.filter(t => !this.isTerminalClosed(t.terminal));
    }
    getActiveProcesses() {
        return Array.from(this.activeProcesses.values()).filter(p => p.isActive);
    }
    isProcessHot(processId) {
        const process = this.activeProcesses.get(processId);
        if (!process)
            return false;
        // Consider a process "hot" if it's been active for less than 5 seconds
        return process.isActive && (Date.now() - process.startTime) < 5000;
    }
    getUnretrievedOutput(terminalId) {
        const terminal = this.getTerminal(terminalId);
        if (!terminal)
            return '';
        const output = terminal.outputBuffer.join('\n');
        terminal.outputBuffer = [];
        return output;
    }
    detectShell() {
        // Check cache first
        const platform = os.platform();
        if (this.shellDetectionCache.has(platform)) {
            return this.shellDetectionCache.get(platform);
        }
        let shell = 'bash';
        // Multi-layered shell detection like Cline
        if (platform === 'win32') {
            // Check VS Code settings first
            const vscodeShell = vscode.workspace.getConfiguration('terminal.integrated.shell').get('windows');
            if (vscodeShell) {
                shell = vscodeShell;
            }
            else if (process.env.COMSPEC) {
                shell = process.env.COMSPEC;
            }
            else {
                shell = 'cmd.exe';
            }
        }
        else if (platform === 'darwin') {
            // macOS
            if (process.env.SHELL) {
                shell = process.env.SHELL;
            }
            else {
                shell = '/bin/zsh';
            }
        }
        else {
            // Linux
            if (process.env.SHELL) {
                shell = process.env.SHELL;
            }
            else {
                shell = '/bin/bash';
            }
        }
        this.shellDetectionCache.set(platform, shell);
        return shell;
    }
    getDefaultEnvironment() {
        return {
            ...process.env,
            ENTERPRISE_AI_PLUGIN_VERSION: '1.0.0',
            ENTERPRISE_AI_PLUGIN_MODE: 'active',
            TERM: 'xterm-256color'
        };
    }
    findTerminalByInstance(terminal) {
        return this.terminals.find(t => t.terminal === terminal);
    }
    isTerminalClosed(terminal) {
        return terminal.exitStatus !== undefined;
    }
    updateTerminalBusyState(terminalId, busy) {
        const terminal = this.getTerminal(terminalId);
        if (terminal) {
            terminal.busy = busy;
            terminal.lastActive = Date.now();
        }
    }
    getTerminal(id) {
        return this.terminals.find(t => t.id === id);
    }
    removeTerminal(id) {
        this.terminals = this.terminals.filter(t => t.id !== id);
        this.emit('terminalRemoved', id);
    }
    updateTerminalOutput(terminalId, output) {
        const terminal = this.getTerminal(terminalId);
        if (terminal) {
            terminal.outputBuffer.push(output);
            terminal.lastActive = Date.now();
        }
    }
    markProcessInactive(processId) {
        const process = this.activeProcesses.get(processId);
        if (process) {
            process.isActive = false;
        }
    }
}
exports.TerminalManager = TerminalManager;
class TerminalProcess extends events_1.EventEmitter {
    constructor(terminalInfo, command, terminalManager) {
        super();
        this.isCompleted = false;
        this.exitCode = null;
        this.terminalInfo = terminalInfo;
        this.command = command;
        this.terminalManager = terminalManager;
        this.processId = Date.now();
        this.executeCommand();
    }
    async executeCommand() {
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
        }
        catch (error) {
            this.emit('error', error);
        }
    }
    complete() {
        this.isCompleted = true;
        this.exitCode = 0;
        this.terminalManager.markProcessInactive(this.processId);
        this.terminalManager.updateTerminalBusyState(this.terminalInfo.id, false);
        this.emit('completed', this.exitCode);
        this.emit('continue');
    }
    continue() {
        if (!this.isCompleted) {
            this.complete();
        }
    }
    // Get completion promise
    getCompletionPromise() {
        return new Promise((resolve, reject) => {
            if (this.isCompleted) {
                resolve(this.exitCode || 0);
            }
            else {
                this.once('completed', resolve);
                this.once('error', reject);
            }
        });
    }
}
exports.TerminalProcess = TerminalProcess;
//# sourceMappingURL=TerminalManager.js.map
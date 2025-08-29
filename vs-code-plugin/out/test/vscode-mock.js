"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Range = exports.Position = exports.StatusBarAlignment = exports.languages = exports.commands = exports.ViewColumn = exports.Uri = exports.ExtensionContext = exports.workspace = exports.window = void 0;
// Mock VS Code API for testing
exports.window = {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    createWebviewPanel: jest.fn(),
    activeTextEditor: undefined,
};
exports.workspace = {
    getConfiguration: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn(),
    })),
    workspaceFolders: [],
    onDidChangeTextDocument: jest.fn(),
    onDidChangeWorkspaceFolders: jest.fn(),
};
exports.ExtensionContext = jest.fn();
exports.Uri = {
    file: jest.fn(),
};
exports.ViewColumn = {
    One: 1,
    Two: 2,
    Three: 3,
};
exports.commands = {
    registerCommand: jest.fn(),
};
exports.languages = {
    registerHoverProvider: jest.fn(),
};
exports.StatusBarAlignment = {
    Left: 1,
    Right: 2,
};
const Position = class {
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
};
exports.Position = Position;
const Range = class {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
};
exports.Range = Range;
//# sourceMappingURL=vscode-mock.js.map
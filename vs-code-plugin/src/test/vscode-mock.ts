// Mock VS Code API for testing
export const window = {
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  createWebviewPanel: jest.fn(),
  activeTextEditor: undefined,
};

export const workspace = {
  getConfiguration: jest.fn(() => ({
    get: jest.fn(),
    update: jest.fn(),
  })),
  workspaceFolders: [],
  onDidChangeTextDocument: jest.fn(),
  onDidChangeWorkspaceFolders: jest.fn(),
};

export const ExtensionContext = jest.fn();

export const Uri = {
  file: jest.fn(),
};

export const ViewColumn = {
  One: 1,
  Two: 2,
  Three: 3,
};

export const commands = {
  registerCommand: jest.fn(),
};

export const languages = {
  registerHoverProvider: jest.fn(),
};

export const StatusBarAlignment = {
  Left: 1,
  Right: 2,
};

export const Position = class {
  constructor(public line: number, public character: number) {}
};

export const Range = class {
  constructor(public start: any, public end: any) {}
};

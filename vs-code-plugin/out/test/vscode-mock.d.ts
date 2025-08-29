export declare const window: {
    showInformationMessage: jest.Mock<any, any, any>;
    showErrorMessage: jest.Mock<any, any, any>;
    showWarningMessage: jest.Mock<any, any, any>;
    createWebviewPanel: jest.Mock<any, any, any>;
    activeTextEditor: undefined;
};
export declare const workspace: {
    getConfiguration: jest.Mock<{
        get: jest.Mock<any, any, any>;
        update: jest.Mock<any, any, any>;
    }, [], any>;
    workspaceFolders: never[];
    onDidChangeTextDocument: jest.Mock<any, any, any>;
    onDidChangeWorkspaceFolders: jest.Mock<any, any, any>;
};
export declare const ExtensionContext: jest.Mock<any, any, any>;
export declare const Uri: {
    file: jest.Mock<any, any, any>;
};
export declare const ViewColumn: {
    One: number;
    Two: number;
    Three: number;
};
export declare const commands: {
    registerCommand: jest.Mock<any, any, any>;
};
export declare const languages: {
    registerHoverProvider: jest.Mock<any, any, any>;
};
export declare const StatusBarAlignment: {
    Left: number;
    Right: number;
};
export declare const Position: {
    new (line: number, character: number): {
        line: number;
        character: number;
    };
};
export declare const Range: {
    new (start: any, end: any): {
        start: any;
        end: any;
    };
};
//# sourceMappingURL=vscode-mock.d.ts.map
export declare const isLocalModelFamily: (providerId: string) => boolean;
export declare const isNextGenModelFamily: (modelId: string) => boolean;
export declare const getModelCapabilities: (modelId: string) => {
    supportsBrowser: boolean;
    supportsMCP: boolean;
    supportsFocusChain: boolean;
    maxContextWindow: number;
};
//# sourceMappingURL=utils.d.ts.map
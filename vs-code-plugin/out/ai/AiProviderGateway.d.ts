import { AiResponse } from './AiProvider';
export declare class AiProviderGateway {
    private providers;
    private currentProvider;
    private isInitialized;
    constructor();
    initialize(): Promise<void>;
    private registerDefaultProviders;
    private loadProviderConfig;
    private initializeDefaultProvider;
    connect(): Promise<void>;
    sendMessage(message: string, context: any): Promise<AiResponse>;
    getCurrentProvider(): string | undefined;
    getAvailableProviders(): string[];
    setProvider(providerName: string): void;
    switchProvider(providerName: string): Promise<void>;
}
//# sourceMappingURL=AiProviderGateway.d.ts.map
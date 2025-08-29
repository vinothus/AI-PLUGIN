import { AiProvider, AiResponse } from '../AiProvider';
export declare class AnthropicProvider implements AiProvider {
    private client;
    private apiKey;
    private connected;
    private model;
    private providerInfo;
    constructor();
    initialize(): Promise<void>;
    sendMessage(message: string, context: any): Promise<AiResponse>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    setModel(model: string): void;
    getModel(): string;
    setCustomPrompt(prompt: 'compact' | 'generic' | 'next-gen'): void;
}
//# sourceMappingURL=AnthropicProvider.d.ts.map
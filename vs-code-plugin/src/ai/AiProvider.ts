export interface AiResponse {
    content: string;
    success: boolean;
    error?: string;
    metadata?: {
        tokens?: number;
        model?: string;
        provider?: string;
        timestamp?: number;
    };
}

export interface AiProvider {
    initialize(): Promise<void>;
    sendMessage(message: string, context: any): Promise<AiResponse>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
}

export interface AiProviderInfo {
    providerId: string;
    modelId: string;
    customPrompt?: 'compact' | 'generic' | 'next-gen';
    apiKey?: string;
    baseUrl?: string;
}

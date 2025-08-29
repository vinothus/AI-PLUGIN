import { AiProvider, AiResponse } from '../AiProvider';
export declare class CustomServerProvider implements AiProvider {
    private serverUrl;
    private connected;
    constructor(serverUrl: string);
    initialize(): Promise<void>;
    sendMessage(message: string, context: any): Promise<AiResponse>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
}
//# sourceMappingURL=CustomServerProvider.d.ts.map
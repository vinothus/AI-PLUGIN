import { AiProvider, AiResponse } from '../AiProvider';
export declare class LocalProvider implements AiProvider {
    private connected;
    private model;
    initialize(): Promise<void>;
    sendMessage(message: string, context: any): Promise<AiResponse>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    setModel(model: string): void;
    getModel(): string;
}
//# sourceMappingURL=LocalProvider.d.ts.map
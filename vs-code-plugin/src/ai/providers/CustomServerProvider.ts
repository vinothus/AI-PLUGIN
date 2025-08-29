import { AiProvider, AiResponse } from '../AiProvider';

interface CustomServerResponse {
    response?: string;
    model?: string;
}

export class CustomServerProvider implements AiProvider {
    private serverUrl: string;
    private connected: boolean = false;

    constructor(serverUrl: string) {
        this.serverUrl = serverUrl;
    }

    async initialize(): Promise<void> {
        // Custom server initialization logic
        this.connected = true;
    }

    async sendMessage(message: string, context: any): Promise<AiResponse> {
        if (!this.connected) {
            throw new Error('Custom server provider not connected');
        }

        try {
            // Simulate API call to custom server
            const response = await fetch(`${this.serverUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    context
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json() as CustomServerResponse;
            
            return {
                content: data.response || 'No response from custom server',
                success: true,
                metadata: {
                    model: data.model || 'custom',
                    provider: 'custom',
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            return {
                content: '',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                metadata: {
                    provider: 'custom',
                    timestamp: Date.now()
                }
            };
        }
    }

    async connect(): Promise<void> {
        this.connected = true;
    }

    async disconnect(): Promise<void> {
        this.connected = false;
    }

    public isConnected(): boolean {
        return this.connected;
    }
}

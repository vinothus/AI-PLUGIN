import * as vscode from 'vscode';
import { OpenAiProvider } from './providers/OpenAiProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { LocalProvider } from './providers/LocalProvider';
import { CustomServerProvider } from './providers/CustomServerProvider';
import { AiProvider, AiResponse } from './AiProvider';

export class AiProviderGateway {
    private providers: Map<string, AiProvider> = new Map();
    private currentProvider: string | undefined;
    private isInitialized: boolean = false;

    constructor() {
        this.registerDefaultProviders();
    }

    public async initialize(): Promise<void> {
        try {
            // Load provider configuration
            await this.loadProviderConfig();
            
            // Initialize default provider
            await this.initializeDefaultProvider();
            
            this.isInitialized = true;
        } catch (error) {
            throw new Error(`AI Provider Gateway initialization failed: ${error}`);
        }
    }

    private registerDefaultProviders(): void {
        // Register OpenAI provider
        this.providers.set('openai', new OpenAiProvider());
        
        // Register Anthropic provider
        this.providers.set('anthropic', new AnthropicProvider());
        
        // Register Google Gemini provider
        this.providers.set('gemini', new GeminiProvider());
        
        // Register local provider
        this.providers.set('local', new LocalProvider());
    }

    private async loadProviderConfig(): Promise<void> {
        const config = vscode.workspace.getConfiguration('enterpriseAiPlugin');
        const serverUrl = config.get('serverUrl', '');
        
        if (serverUrl) {
            // Configure custom server provider
            this.providers.set('custom', new CustomServerProvider(serverUrl));
        }
    }

    private async initializeDefaultProvider(): Promise<void> {
        // Try to connect to available providers
        for (const [name, provider] of this.providers) {
            try {
                await provider.initialize();
                this.currentProvider = name;
                break;
            } catch (error) {
                console.log(`Failed to connect to ${name} provider: ${error}`);
            }
        }

        if (!this.currentProvider) {
            throw new Error('No AI providers available');
        }
    }

    public async connect(): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.currentProvider) {
            const provider = this.providers.get(this.currentProvider);
            if (provider) {
                await provider.connect();
            }
        }
    }

    public async sendMessage(message: string, context: any): Promise<AiResponse> {
        if (!this.currentProvider) {
            throw new Error('No AI provider configured');
        }

        const provider = this.providers.get(this.currentProvider);
        if (!provider) {
            throw new Error(`Provider ${this.currentProvider} not found`);
        }

        try {
            return await provider.sendMessage(message, context);
        } catch (error) {
            // Try fallback providers
            for (const [name, fallbackProvider] of this.providers) {
                if (name !== this.currentProvider) {
                    try {
                        await fallbackProvider.connect();
                        return await fallbackProvider.sendMessage(message, context);
                    } catch (fallbackError) {
                        console.log(`Fallback provider ${name} failed: ${fallbackError}`);
                    }
                }
            }
            throw error;
        }
    }

    public getCurrentProvider(): string | undefined {
        return this.currentProvider;
    }

    public getAvailableProviders(): string[] {
        return Array.from(this.providers.keys());
    }

    public setProvider(providerName: string): void {
        if (this.providers.has(providerName)) {
            this.currentProvider = providerName;
        }
    }

    public async switchProvider(providerName: string): Promise<void> {
        if (!this.providers.has(providerName)) {
            throw new Error(`Provider ${providerName} not available`);
        }

        // Disconnect current provider
        if (this.currentProvider) {
            const currentProvider = this.providers.get(this.currentProvider);
            if (currentProvider) {
                await currentProvider.disconnect();
            }
        }

        // Connect to new provider
        const newProvider = this.providers.get(providerName);
        if (newProvider) {
            await newProvider.connect();
            this.currentProvider = providerName;
        }
    }
}

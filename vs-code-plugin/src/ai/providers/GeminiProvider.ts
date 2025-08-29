import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiProvider, AiResponse, AiProviderInfo } from '../AiProvider';
import { buildSystemPrompt, PromptContext } from '../../prompts/system-prompt/build-system-prompt';
import { BrowserSettings } from '../../shared/BrowserSettings';
import { FocusChainSettings } from '../../shared/FocusChainSettings';

export class GeminiProvider implements AiProvider {
    private client: GoogleGenerativeAI | null = null;
    private apiKey: string | null = null;
    private connected: boolean = false;
    private model: string = 'gemini-pro';
    private providerInfo: AiProviderInfo;

    constructor() {
        this.providerInfo = {
            providerId: 'gemini',
            modelId: this.model
        };
    }

    async initialize(): Promise<void> {
        try {
            // Try to get API key from environment
            this.apiKey = process.env.GOOGLE_API_KEY || null;
            
            if (this.apiKey) {
                this.client = new GoogleGenerativeAI(this.apiKey);
                this.connected = true;
            }
        } catch (error) {
            console.error('Failed to initialize Gemini provider:', error);
            throw error;
        }
    }

    async sendMessage(message: string, context: any): Promise<AiResponse> {
        if (!this.client || !this.connected) {
            throw new Error('Gemini provider not connected');
        }

        try {
            // Build comprehensive system prompt
            const promptContext: PromptContext = {
                cwd: context.cwd || process.cwd(),
                supportsBrowserUse: context.supportsBrowserUse || false,
                browserSettings: context.browserSettings || {
                    enabled: false,
                    useLocalChrome: false,
                    customArguments: [],
                    headless: true,
                    viewport: { width: 1280, height: 720 },
                    timeout: 30000,
                    screenshotPath: './screenshots'
                },
                focusChainSettings: context.focusChainSettings || {
                    enabled: false,
                    remindInterval: 6,
                    autoUpdate: true,
                    persistAcrossSessions: true
                },
                providerInfo: this.providerInfo,
                mcpServers: context.mcpServers || [],
                securityLevel: context.securityLevel || 'basic',
                complianceMode: context.complianceMode
            };

            const systemPrompt = await buildSystemPrompt(promptContext);

            const genModel = this.client.getGenerativeModel({ model: this.model });
            
            const result = await genModel.generateContent([
                systemPrompt,
                message
            ]);

            const response = await result.response;
            const content = response.text();
            
            return {
                content,
                success: true,
                metadata: {
                    model: this.model,
                    provider: 'gemini',
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            return {
                content: '',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                metadata: {
                    model: this.model,
                    provider: 'gemini',
                    timestamp: Date.now()
                }
            };
        }
    }

    async connect(): Promise<void> {
        if (!this.client) {
            await this.initialize();
        }
        this.connected = true;
    }

    async disconnect(): Promise<void> {
        this.connected = false;
        this.client = null;
    }

    public isConnected(): boolean {
        return this.connected;
    }

    public setModel(model: string): void {
        this.model = model;
        this.providerInfo.modelId = model;
    }

    public getModel(): string {
        return this.model;
    }

    public setCustomPrompt(prompt: 'compact' | 'generic' | 'next-gen'): void {
        this.providerInfo.customPrompt = prompt;
    }
}

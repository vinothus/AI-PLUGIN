import OpenAI from 'openai';
import { AiProvider, AiResponse, AiProviderInfo } from '../AiProvider';
import { buildSystemPrompt, PromptContext } from '../../prompts/system-prompt/build-system-prompt';
import { BrowserSettings } from '../../shared/BrowserSettings';
import { FocusChainSettings } from '../../shared/FocusChainSettings';

export class OpenAiProvider implements AiProvider {
    private client: OpenAI | null = null;
    private apiKey: string | null = null;
    private connected: boolean = false;
    private model: string = 'gpt-4';
    private providerInfo: AiProviderInfo;

    constructor() {
        this.providerInfo = {
            providerId: 'openai',
            modelId: this.model
        };
    }

    async initialize(): Promise<void> {
        try {
            // Try to get API key from environment
            this.apiKey = process.env.OPENAI_API_KEY || null;
            
            if (this.apiKey) {
                this.client = new OpenAI({
                    apiKey: this.apiKey,
                });
                this.connected = true;
            }
        } catch (error) {
            console.error('Failed to initialize OpenAI provider:', error);
            throw error;
        }
    }

    async sendMessage(message: string, context: any): Promise<AiResponse> {
        if (!this.client || !this.connected) {
            throw new Error('OpenAI provider not connected');
        }

        try {
            // Get enhanced context with environment information
            const enhancedContext = await context.getEnhancedContext?.() || context;
            
            // Build comprehensive system prompt with environment data
            const promptContext: PromptContext = {
                cwd: enhancedContext.workspace?.root || process.cwd(),
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
                mcpServers: enhancedContext.mcpServers || [],
                securityLevel: context.securityLevel || 'basic',
                complianceMode: context.complianceMode
            };

            const systemPrompt = await buildSystemPrompt(promptContext);

            // Add environment information to the message if available
            let enhancedMessage = message;
            if (enhancedContext.environment) {
                const envInfo = enhancedContext.environment;
                enhancedMessage = `ENVIRONMENT CONTEXT:
System: ${envInfo.system.platform} ${envInfo.system.release}
Shell: ${envInfo.shell.name} (${envInfo.shell.path})
Terminals: ${envInfo.terminal.totalTerminals} total, ${envInfo.terminal.busyTerminals} busy
Active Processes: ${envInfo.processes.length}
Platform: ${envInfo.platform.name} (${envInfo.platform.isWindows ? 'Windows' : envInfo.platform.isMacOS ? 'macOS' : 'Linux'})

USER MESSAGE:
${message}`;
            }

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: enhancedMessage }
                ],
                max_tokens: 4000,
                temperature: 0.1
            });

            const content = response.choices[0]?.message?.content || '';
            
            return {
                content,
                success: true,
                metadata: {
                    tokens: response.usage?.total_tokens,
                    model: this.model,
                    provider: 'openai',
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            console.error('Error sending message to OpenAI:', error);
            throw error;
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

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const build_system_prompt_1 = require("../../prompts/system-prompt/build-system-prompt");
class AnthropicProvider {
    constructor() {
        this.client = null;
        this.apiKey = null;
        this.connected = false;
        this.model = 'claude-3-sonnet-20240229';
        this.providerInfo = {
            providerId: 'anthropic',
            modelId: this.model
        };
    }
    async initialize() {
        try {
            // Try to get API key from environment
            this.apiKey = process.env.ANTHROPIC_API_KEY || null;
            if (this.apiKey) {
                this.client = new sdk_1.default({
                    apiKey: this.apiKey,
                });
                this.connected = true;
            }
        }
        catch (error) {
            console.error('Failed to initialize Anthropic provider:', error);
            throw error;
        }
    }
    async sendMessage(message, context) {
        if (!this.client || !this.connected) {
            throw new Error('Anthropic provider not connected');
        }
        try {
            // Build comprehensive system prompt
            const promptContext = {
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
            const systemPrompt = await (0, build_system_prompt_1.buildSystemPrompt)(promptContext);
            // Simplified response for now - will be enhanced in Phase 2
            const content = `Anthropic Claude response to: "${message}"\n\nContext: ${JSON.stringify(context)}\n\nSystem Prompt: ${systemPrompt}`;
            return {
                content,
                success: true,
                metadata: {
                    model: this.model,
                    provider: 'anthropic',
                    timestamp: Date.now()
                }
            };
        }
        catch (error) {
            return {
                content: '',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                metadata: {
                    model: this.model,
                    provider: 'anthropic',
                    timestamp: Date.now()
                }
            };
        }
    }
    async connect() {
        if (!this.client) {
            await this.initialize();
        }
        this.connected = true;
    }
    async disconnect() {
        this.connected = false;
        this.client = null;
    }
    isConnected() {
        return this.connected;
    }
    setModel(model) {
        this.model = model;
        this.providerInfo.modelId = model;
    }
    getModel() {
        return this.model;
    }
    setCustomPrompt(prompt) {
        this.providerInfo.customPrompt = prompt;
    }
}
exports.AnthropicProvider = AnthropicProvider;
//# sourceMappingURL=AnthropicProvider.js.map
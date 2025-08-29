"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
const generative_ai_1 = require("@google/generative-ai");
const build_system_prompt_1 = require("../../prompts/system-prompt/build-system-prompt");
class GeminiProvider {
    constructor() {
        this.client = null;
        this.apiKey = null;
        this.connected = false;
        this.model = 'gemini-pro';
        this.providerInfo = {
            providerId: 'gemini',
            modelId: this.model
        };
    }
    async initialize() {
        try {
            // Try to get API key from environment
            this.apiKey = process.env.GOOGLE_API_KEY || null;
            if (this.apiKey) {
                this.client = new generative_ai_1.GoogleGenerativeAI(this.apiKey);
                this.connected = true;
            }
        }
        catch (error) {
            console.error('Failed to initialize Gemini provider:', error);
            throw error;
        }
    }
    async sendMessage(message, context) {
        if (!this.client || !this.connected) {
            throw new Error('Gemini provider not connected');
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
        }
        catch (error) {
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
exports.GeminiProvider = GeminiProvider;
//# sourceMappingURL=GeminiProvider.js.map
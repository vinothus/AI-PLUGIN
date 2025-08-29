"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiProvider = void 0;
const openai_1 = __importDefault(require("openai"));
const build_system_prompt_1 = require("../../prompts/system-prompt/build-system-prompt");
class OpenAiProvider {
    constructor() {
        this.client = null;
        this.apiKey = null;
        this.connected = false;
        this.model = 'gpt-4';
        this.providerInfo = {
            providerId: 'openai',
            modelId: this.model
        };
    }
    async initialize() {
        try {
            // Try to get API key from environment
            this.apiKey = process.env.OPENAI_API_KEY || null;
            if (this.apiKey) {
                this.client = new openai_1.default({
                    apiKey: this.apiKey,
                });
                this.connected = true;
            }
        }
        catch (error) {
            console.error('Failed to initialize OpenAI provider:', error);
            throw error;
        }
    }
    async sendMessage(message, context) {
        if (!this.client || !this.connected) {
            throw new Error('OpenAI provider not connected');
        }
        try {
            // Get enhanced context with environment information
            const enhancedContext = await context.getEnhancedContext?.() || context;
            // Build comprehensive system prompt with environment data
            const promptContext = {
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
            const systemPrompt = await (0, build_system_prompt_1.buildSystemPrompt)(promptContext);
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
        }
        catch (error) {
            console.error('Error sending message to OpenAI:', error);
            throw error;
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
exports.OpenAiProvider = OpenAiProvider;
//# sourceMappingURL=OpenAiProvider.js.map
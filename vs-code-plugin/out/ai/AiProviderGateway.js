"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiProviderGateway = void 0;
const vscode = __importStar(require("vscode"));
const OpenAiProvider_1 = require("./providers/OpenAiProvider");
const AnthropicProvider_1 = require("./providers/AnthropicProvider");
const GeminiProvider_1 = require("./providers/GeminiProvider");
const LocalProvider_1 = require("./providers/LocalProvider");
const CustomServerProvider_1 = require("./providers/CustomServerProvider");
class AiProviderGateway {
    constructor() {
        this.providers = new Map();
        this.isInitialized = false;
        this.registerDefaultProviders();
    }
    async initialize() {
        try {
            // Load provider configuration
            await this.loadProviderConfig();
            // Initialize default provider
            await this.initializeDefaultProvider();
            this.isInitialized = true;
        }
        catch (error) {
            throw new Error(`AI Provider Gateway initialization failed: ${error}`);
        }
    }
    registerDefaultProviders() {
        // Register OpenAI provider
        this.providers.set('openai', new OpenAiProvider_1.OpenAiProvider());
        // Register Anthropic provider
        this.providers.set('anthropic', new AnthropicProvider_1.AnthropicProvider());
        // Register Google Gemini provider
        this.providers.set('gemini', new GeminiProvider_1.GeminiProvider());
        // Register local provider
        this.providers.set('local', new LocalProvider_1.LocalProvider());
    }
    async loadProviderConfig() {
        const config = vscode.workspace.getConfiguration('enterpriseAiPlugin');
        const serverUrl = config.get('serverUrl', '');
        if (serverUrl) {
            // Configure custom server provider
            this.providers.set('custom', new CustomServerProvider_1.CustomServerProvider(serverUrl));
        }
    }
    async initializeDefaultProvider() {
        // Try to connect to available providers
        for (const [name, provider] of this.providers) {
            try {
                await provider.initialize();
                this.currentProvider = name;
                break;
            }
            catch (error) {
                console.log(`Failed to connect to ${name} provider: ${error}`);
            }
        }
        if (!this.currentProvider) {
            throw new Error('No AI providers available');
        }
    }
    async connect() {
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
    async sendMessage(message, context) {
        if (!this.currentProvider) {
            throw new Error('No AI provider configured');
        }
        const provider = this.providers.get(this.currentProvider);
        if (!provider) {
            throw new Error(`Provider ${this.currentProvider} not found`);
        }
        try {
            return await provider.sendMessage(message, context);
        }
        catch (error) {
            // Try fallback providers
            for (const [name, fallbackProvider] of this.providers) {
                if (name !== this.currentProvider) {
                    try {
                        await fallbackProvider.connect();
                        return await fallbackProvider.sendMessage(message, context);
                    }
                    catch (fallbackError) {
                        console.log(`Fallback provider ${name} failed: ${fallbackError}`);
                    }
                }
            }
            throw error;
        }
    }
    getCurrentProvider() {
        return this.currentProvider;
    }
    getAvailableProviders() {
        return Array.from(this.providers.keys());
    }
    setProvider(providerName) {
        if (this.providers.has(providerName)) {
            this.currentProvider = providerName;
        }
    }
    async switchProvider(providerName) {
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
exports.AiProviderGateway = AiProviderGateway;
//# sourceMappingURL=AiProviderGateway.js.map
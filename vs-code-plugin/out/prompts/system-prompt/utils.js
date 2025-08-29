"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModelCapabilities = exports.isNextGenModelFamily = exports.isLocalModelFamily = void 0;
const isLocalModelFamily = (providerId) => {
    const localProviders = ['ollama', 'lmstudio', 'local', 'custom'];
    return localProviders.includes(providerId.toLowerCase());
};
exports.isLocalModelFamily = isLocalModelFamily;
const isNextGenModelFamily = (modelId) => {
    const nextGenModels = [
        'gpt-4o', 'gpt-4o-mini', 'gpt-5',
        'claude-3-5-sonnet', 'claude-3-5-haiku', 'claude-3-5-opus',
        'gemini-2.0', 'gemini-2.5', 'gemini-3.0',
        'grok-4', 'grok-5'
    ];
    return nextGenModels.some(model => modelId.toLowerCase().includes(model.toLowerCase()));
};
exports.isNextGenModelFamily = isNextGenModelFamily;
const getModelCapabilities = (modelId) => {
    const capabilities = {
        supportsBrowser: false,
        supportsMCP: false,
        supportsFocusChain: false,
        maxContextWindow: 8192
    };
    // Next-gen models have full capabilities
    if ((0, exports.isNextGenModelFamily)(modelId)) {
        capabilities.supportsBrowser = true;
        capabilities.supportsMCP = true;
        capabilities.supportsFocusChain = true;
        capabilities.maxContextWindow = 200000;
    }
    // Standard models have partial capabilities
    else if (modelId.includes('gpt-4') || modelId.includes('claude-3')) {
        capabilities.supportsBrowser = true;
        capabilities.supportsMCP = true;
        capabilities.supportsFocusChain = true;
        capabilities.maxContextWindow = 128000;
    }
    // Local models have basic capabilities
    else if ((0, exports.isLocalModelFamily)(modelId)) {
        capabilities.supportsMCP = true;
        capabilities.supportsFocusChain = true;
        capabilities.maxContextWindow = 32768;
    }
    return capabilities;
};
exports.getModelCapabilities = getModelCapabilities;
//# sourceMappingURL=utils.js.map
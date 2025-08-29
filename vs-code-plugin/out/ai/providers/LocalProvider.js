"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalProvider = void 0;
class LocalProvider {
    constructor() {
        this.connected = false;
        this.model = 'local-model';
    }
    async initialize() {
        // Local model initialization logic
        this.connected = true;
    }
    async sendMessage(message, context) {
        if (!this.connected) {
            throw new Error('Local provider not connected');
        }
        try {
            // Simulate local model processing
            const response = `Local model response to: "${message}"\n\nContext: ${JSON.stringify(context)}\n\nThis is a placeholder response from the local AI model.`;
            return {
                content: response,
                success: true,
                metadata: {
                    model: this.model,
                    provider: 'local',
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
                    provider: 'local',
                    timestamp: Date.now()
                }
            };
        }
    }
    async connect() {
        this.connected = true;
    }
    async disconnect() {
        this.connected = false;
    }
    isConnected() {
        return this.connected;
    }
    setModel(model) {
        this.model = model;
    }
    getModel() {
        return this.model;
    }
}
exports.LocalProvider = LocalProvider;
//# sourceMappingURL=LocalProvider.js.map
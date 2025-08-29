"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomServerProvider = void 0;
class CustomServerProvider {
    constructor(serverUrl) {
        this.connected = false;
        this.serverUrl = serverUrl;
    }
    async initialize() {
        // Custom server initialization logic
        this.connected = true;
    }
    async sendMessage(message, context) {
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
            const data = await response.json();
            return {
                content: data.response || 'No response from custom server',
                success: true,
                metadata: {
                    model: data.model || 'custom',
                    provider: 'custom',
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
                    provider: 'custom',
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
}
exports.CustomServerProvider = CustomServerProvider;
//# sourceMappingURL=CustomServerProvider.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GeminiProvider_1 = require("./GeminiProvider");
// Mock the Google Generative AI SDK
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn().mockResolvedValue({
                response: {
                    text: jest.fn().mockReturnValue('Mock Gemini response')
                }
            })
        })
    }))
}));
describe('GeminiProvider', () => {
    let geminiProvider;
    const originalEnv = process.env;
    beforeEach(() => {
        geminiProvider = new GeminiProvider_1.GeminiProvider();
        process.env = { ...originalEnv };
    });
    afterEach(() => {
        process.env = originalEnv;
        jest.clearAllMocks();
    });
    describe('initialize', () => {
        it('should initialize successfully with valid API key', async () => {
            process.env.GOOGLE_API_KEY = 'test-api-key';
            await expect(geminiProvider.initialize()).resolves.not.toThrow();
            expect(geminiProvider.isConnected()).toBe(true);
        });
        it('should throw error when API key is missing', async () => {
            delete process.env.GOOGLE_API_KEY;
            await expect(geminiProvider.initialize()).rejects.toThrow('Google API key not found');
        });
    });
    describe('sendMessage', () => {
        beforeEach(async () => {
            process.env.GOOGLE_API_KEY = 'test-api-key';
            await geminiProvider.initialize();
        });
        it('should send message successfully', async () => {
            const message = 'Hello, Gemini!';
            const context = { project: 'test-project' };
            const response = await geminiProvider.sendMessage(message, context);
            expect(response).toEqual({
                type: 'text_response',
                content: 'Mock Gemini response',
                provider: 'gemini',
                model: 'gemini-pro',
                usage: expect.objectContaining({
                    prompt_tokens: expect.any(Number),
                    completion_tokens: expect.any(Number),
                    total_tokens: expect.any(Number)
                })
            });
        });
        it('should throw error when not initialized', async () => {
            const uninitializedProvider = new GeminiProvider_1.GeminiProvider();
            await expect(uninitializedProvider.sendMessage('test', {})).rejects.toThrow('Gemini provider not initialized');
        });
    });
    describe('connect and disconnect', () => {
        it('should connect and disconnect properly', async () => {
            process.env.GOOGLE_API_KEY = 'test-api-key';
            await geminiProvider.connect();
            expect(geminiProvider.isConnected()).toBe(true);
            await geminiProvider.disconnect();
            expect(geminiProvider.isConnected()).toBe(false);
        });
    });
    describe('model management', () => {
        it('should set and get model correctly', () => {
            geminiProvider.setModel('gemini-pro-vision');
            expect(geminiProvider.getModel()).toBe('gemini-pro-vision');
        });
    });
});
//# sourceMappingURL=GeminiProvider.test.js.map
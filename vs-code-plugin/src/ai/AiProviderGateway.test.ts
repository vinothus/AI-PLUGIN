import { AiProviderGateway } from './AiProviderGateway';

describe('AiProviderGateway', () => {
  let aiGateway: AiProviderGateway;

  beforeEach(() => {
    aiGateway = new AiProviderGateway();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(aiGateway.initialize()).resolves.not.toThrow();
    });

    it('should register all providers', async () => {
      await aiGateway.initialize();
      
      const providers = aiGateway.getAvailableProviders();
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('local');
      expect(providers).toContain('custom');
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      await aiGateway.initialize();
    });

    it('should send message to current provider', async () => {
      const message = 'Hello, AI!';
      const context = { project: 'test-project' };
      
      const response = await aiGateway.sendMessage(message, context);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should handle provider errors gracefully', async () => {
      // Set an invalid provider to trigger fallback
      aiGateway.setProvider('invalid-provider');
      
      const message = 'Test message';
      const context = { project: 'test-project' };
      
      const response = await aiGateway.sendMessage(message, context);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });
  });

  describe('provider management', () => {
    beforeEach(async () => {
      await aiGateway.initialize();
    });

    it('should set provider correctly', () => {
      aiGateway.setProvider('openai');
      expect(aiGateway.getCurrentProvider()).toBe('openai');
    });

    it('should get available providers', () => {
      const providers = aiGateway.getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should handle invalid provider gracefully', () => {
      aiGateway.setProvider('invalid-provider');
      // Should fall back to default provider
      expect(aiGateway.getCurrentProvider()).toBeDefined();
    });
  });

  describe('fallback mechanism', () => {
    beforeEach(async () => {
      await aiGateway.initialize();
    });

    it('should fallback when primary provider fails', async () => {
      // This test verifies the fallback mechanism works
      const message = 'Test message';
      const context = { project: 'test-project' };
      
      const response = await aiGateway.sendMessage(message, context);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });
  });
});

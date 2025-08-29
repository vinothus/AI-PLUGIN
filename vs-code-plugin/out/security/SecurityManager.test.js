"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SecurityManager_1 = require("./SecurityManager");
describe('SecurityManager', () => {
    let securityManager;
    let mockContext;
    beforeEach(() => {
        mockContext = {
            secrets: {
                get: jest.fn(),
                store: jest.fn(),
            },
        };
        securityManager = new SecurityManager_1.SecurityManager(mockContext);
    });
    describe('initialize', () => {
        it('should initialize successfully', async () => {
            mockContext.secrets.get.mockResolvedValue('test-key');
            await expect(securityManager.initialize()).resolves.not.toThrow();
        });
        it('should generate new encryption key if none exists', async () => {
            mockContext.secrets.get.mockResolvedValue(undefined);
            mockContext.secrets.store.mockResolvedValue(undefined);
            await securityManager.initialize();
            expect(mockContext.secrets.store).toHaveBeenCalledWith('encryptionKey', expect.any(String));
        });
    });
    describe('validateCommand', () => {
        beforeEach(async () => {
            mockContext.secrets.get.mockResolvedValue('test-key');
            await securityManager.initialize();
        });
        it('should allow safe commands', async () => {
            const result = await securityManager.validateCommand('echo "hello world"');
            expect(result).toBe(true);
        });
        it('should reject dangerous commands', async () => {
            await expect(securityManager.validateCommand('rm -rf /')).rejects.toThrow('Dangerous command detected');
        });
        it('should reject format commands', async () => {
            await expect(securityManager.validateCommand('format C:')).rejects.toThrow('Dangerous command detected');
        });
        it('should reject shutdown commands', async () => {
            await expect(securityManager.validateCommand('shutdown /s')).rejects.toThrow('Dangerous command detected');
        });
    });
    describe('encryptData and decryptData', () => {
        beforeEach(async () => {
            mockContext.secrets.get.mockResolvedValue('test-key');
            await securityManager.initialize();
        });
        it('should encrypt and decrypt data correctly', async () => {
            const originalData = 'sensitive information';
            const encrypted = await securityManager.encryptData(originalData);
            expect(encrypted).not.toBe(originalData);
            expect(encrypted).toContain(':');
            const decrypted = await securityManager.decryptData(encrypted);
            expect(decrypted).toBe(originalData);
        });
        it('should throw error when encryption key is not initialized', async () => {
            const uninitializedManager = new SecurityManager_1.SecurityManager(mockContext);
            await expect(uninitializedManager.encryptData('test')).rejects.toThrow('Encryption key not initialized');
        });
    });
    describe('runSecurityAudit', () => {
        beforeEach(async () => {
            mockContext.secrets.get.mockResolvedValue('test-key');
            await securityManager.initialize();
        });
        it('should run security audit successfully', async () => {
            await expect(securityManager.runSecurityAudit()).resolves.not.toThrow();
        });
    });
});
//# sourceMappingURL=SecurityManager.test.js.map
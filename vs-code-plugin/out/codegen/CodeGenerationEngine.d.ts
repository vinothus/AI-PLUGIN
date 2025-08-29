import { AiProviderGateway } from '../ai/AiProviderGateway';
import { ContextManager } from '../context/ContextManager';
import { FileSystemManager } from '../filesystem/FileSystemManager';
export interface CodeGenerationRequest {
    language: string;
    description: string;
    context?: string;
    requirements?: string[];
    style?: string;
    framework?: string;
    targetFile?: string;
    generateTests?: boolean;
    generateDocs?: boolean;
}
export interface CodeGenerationResult {
    code: string;
    language: string;
    fileName?: string;
    tests?: string;
    documentation?: string;
    explanation: string;
    quality: 'low' | 'medium' | 'high';
    estimatedComplexity: number;
    suggestions: string[];
    warnings: string[];
}
export interface CodeQualityMetrics {
    complexity: number;
    maintainability: number;
    testability: number;
    security: number;
    performance: number;
}
export declare class CodeGenerationEngine {
    private aiGateway;
    private contextManager;
    private fileSystemManager;
    private supportedLanguages;
    constructor(aiGateway: AiProviderGateway, contextManager: ContextManager, fileSystemManager: FileSystemManager);
    /**
     * Generate code based on the request
     */
    generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult>;
    /**
     * Generate code for a specific file
     */
    generateCodeForFile(filePath: string, description: string, options?: Partial<CodeGenerationRequest>): Promise<CodeGenerationResult>;
    /**
     * Refactor existing code
     */
    refactorCode(filePath: string, refactoringType: 'optimize' | 'simplify' | 'modernize' | 'secure' | 'testable', options?: any): Promise<CodeGenerationResult>;
    /**
     * Generate debugging assistance
     */
    generateDebuggingHelp(errorMessage: string, codeContext: string, language: string): Promise<{
        analysis: string;
        suggestions: string[];
        fixCode?: string;
        preventionTips: string[];
    }>;
    /**
     * Validate generation request
     */
    private validateRequest;
    /**
     * Build generation prompt
     */
    private buildGenerationPrompt;
    /**
     * Build refactoring prompt
     */
    private buildRefactoringPrompt;
    /**
     * Parse generated code from AI response
     */
    private parseGeneratedCode;
    /**
     * Parse debugging response
     */
    private parseDebuggingResponse;
    /**
     * Generate tests for the code
     */
    private generateTests;
    /**
     * Generate documentation for the code
     */
    private generateDocumentation;
    /**
     * Analyze code quality
     */
    private analyzeCodeQuality;
    /**
     * Determine quality level based on metrics
     */
    private determineQualityLevel;
    /**
     * Detect language from file extension
     */
    private detectLanguageFromFile;
    /**
     * Extract explanation from AI response
     */
    private extractExplanation;
    /**
     * Extract suggestions from AI response
     */
    private extractSuggestions;
    /**
     * Extract warnings from AI response
     */
    private extractWarnings;
    /**
     * Extract code from AI response
     */
    private extractCodeFromResponse;
    /**
     * Get supported languages
     */
    getSupportedLanguages(): string[];
    /**
     * Add support for a new language
     */
    addLanguageSupport(language: string): void;
}
//# sourceMappingURL=CodeGenerationEngine.d.ts.map
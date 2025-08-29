import * as vscode from 'vscode';
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

export class CodeGenerationEngine {
    private aiGateway: AiProviderGateway;
    private contextManager: ContextManager;
    private fileSystemManager: FileSystemManager;
    private supportedLanguages: Set<string>;

    constructor(
        aiGateway: AiProviderGateway,
        contextManager: ContextManager,
        fileSystemManager: FileSystemManager
    ) {
        this.aiGateway = aiGateway;
        this.contextManager = contextManager;
        this.fileSystemManager = fileSystemManager;
        this.supportedLanguages = new Set([
            'typescript', 'javascript', 'python', 'java', 'csharp', 'cpp', 'go', 'rust', 'php', 'ruby'
        ]);
    }

    /**
     * Generate code based on the request
     */
    public async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult> {
        try {
            // Validate request
            this.validateRequest(request);

            // Get comprehensive context
            const context = await this.contextManager.getComprehensiveContext();

            // Build generation prompt
            const prompt = this.buildGenerationPrompt(request, context);

            // Generate code using AI
            const response = await this.aiGateway.sendMessage(prompt, context);

            // Parse and validate the generated code
            const result = this.parseGeneratedCode(response.content, request);

            // Perform quality analysis
            const qualityMetrics = await this.analyzeCodeQuality(result.code, request.language);

            // Update result with quality metrics
            result.quality = this.determineQualityLevel(qualityMetrics);
            result.estimatedComplexity = qualityMetrics.complexity;

            // Generate additional artifacts if requested
            if (request.generateTests) {
                result.tests = await this.generateTests(result.code, request);
            }

            if (request.generateDocs) {
                result.documentation = await this.generateDocumentation(result.code, request);
            }

            return result;

        } catch (error) {
            throw new Error(`Code generation failed: ${error}`);
        }
    }

    /**
     * Generate code for a specific file
     */
    public async generateCodeForFile(
        filePath: string,
        description: string,
        options?: Partial<CodeGenerationRequest>
    ): Promise<CodeGenerationResult> {
        const language = this.detectLanguageFromFile(filePath);
        
        const request: CodeGenerationRequest = {
            language,
            description,
            targetFile: filePath,
            ...options
        };

        const result = await this.generateCode(request);
        result.fileName = filePath;

        return result;
    }

    /**
     * Refactor existing code
     */
    public async refactorCode(
        filePath: string,
        refactoringType: 'optimize' | 'simplify' | 'modernize' | 'secure' | 'testable',
        options?: any
    ): Promise<CodeGenerationResult> {
        try {
            // Read existing code
            const existingCode = await this.fileSystemManager.readFile(filePath);
            const language = this.detectLanguageFromFile(filePath);

            // Get context
            const context = await this.contextManager.getComprehensiveContext();

            // Build refactoring prompt
            const prompt = this.buildRefactoringPrompt(existingCode, refactoringType, language, options);

            // Generate refactored code
            const response = await this.aiGateway.sendMessage(prompt, context);

            // Parse result
            const result = this.parseGeneratedCode(response.content, { language, description: 'Refactored code' });

            result.fileName = filePath;
            result.explanation = `Code refactored for ${refactoringType}`;

            return result;

        } catch (error) {
            throw new Error(`Code refactoring failed: ${error}`);
        }
    }

    /**
     * Generate debugging assistance
     */
    public async generateDebuggingHelp(
        errorMessage: string,
        codeContext: string,
        language: string
    ): Promise<{
        analysis: string;
        suggestions: string[];
        fixCode?: string;
        preventionTips: string[];
    }> {
        try {
            const context = await this.contextManager.getComprehensiveContext();

            const prompt = `Analyze this error and provide debugging assistance:

Error: ${errorMessage}
Code Context: ${codeContext}
Language: ${language}

Please provide:
1. Error analysis and root cause
2. Specific suggestions to fix the issue
3. Corrected code if applicable
4. Tips to prevent similar errors

Return the response in a structured format.`;

            const response = await this.aiGateway.sendMessage(prompt, context);

            return this.parseDebuggingResponse(response.content);

        } catch (error) {
            throw new Error(`Debugging assistance generation failed: ${error}`);
        }
    }

    /**
     * Validate generation request
     */
    private validateRequest(request: CodeGenerationRequest): void {
        if (!request.language) {
            throw new Error('Language is required');
        }

        if (!this.supportedLanguages.has(request.language.toLowerCase())) {
            throw new Error(`Unsupported language: ${request.language}`);
        }

        if (!request.description || request.description.trim().length === 0) {
            throw new Error('Description is required');
        }
    }

    /**
     * Build generation prompt
     */
    private buildGenerationPrompt(request: CodeGenerationRequest, context: any): string {
        const language = request.language.toLowerCase();
        const style = request.style || 'clean';
        const framework = request.framework || '';

        return `Generate high-quality ${language} code based on the following requirements:

Description: ${request.description}
${request.context ? `Context: ${request.context}` : ''}
${request.requirements ? `Requirements: ${request.requirements.join(', ')}` : ''}
Style: ${style}
${framework ? `Framework: ${framework}` : ''}

Current Project Context:
${JSON.stringify(context, null, 2)}

Please generate:
1. Clean, well-structured code
2. Proper error handling
3. Meaningful comments
4. Follow ${language} best practices
5. Consider the project context

Return the code in a code block with the appropriate language tag.`;
    }

    /**
     * Build refactoring prompt
     */
    private buildRefactoringPrompt(
        existingCode: string,
        refactoringType: string,
        language: string,
        options?: any
    ): string {
        return `Refactor the following ${language} code for ${refactoringType}:

Original Code:
\`\`\`${language}
${existingCode}
\`\`\`

Refactoring Type: ${refactoringType}
${options ? `Options: ${JSON.stringify(options)}` : ''}

Please provide:
1. Refactored code that improves ${refactoringType}
2. Explanation of changes made
3. Benefits of the refactoring

Return the refactored code in a code block.`;
    }

    /**
     * Parse generated code from AI response
     */
    private parseGeneratedCode(content: string, request: CodeGenerationRequest): CodeGenerationResult {
        // Extract code from markdown code blocks
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const matches = Array.from(content.matchAll(codeBlockRegex));

        let code = '';
        let tests = '';
        let documentation = '';

        for (const match of matches) {
            const language = match[1] || request.language;
            const codeContent = match[2].trim();

            if (language.includes('test') || language.includes('spec')) {
                tests = codeContent;
            } else if (language.includes('md') || language.includes('doc')) {
                documentation = codeContent;
            } else {
                code = codeContent;
            }
        }

        // If no code blocks found, try to extract code from the response
        if (!code) {
            code = content.trim();
        }

        return {
            code,
            language: request.language,
            tests: tests || undefined,
            documentation: documentation || undefined,
            explanation: this.extractExplanation(content),
            quality: 'medium', // Will be updated by quality analysis
            estimatedComplexity: 0, // Will be updated by quality analysis
            suggestions: this.extractSuggestions(content),
            warnings: this.extractWarnings(content)
        };
    }

    /**
     * Parse debugging response
     */
    private parseDebuggingResponse(content: string): any {
        // Simple parsing - in a real implementation, you'd use more sophisticated parsing
        return {
            analysis: content,
            suggestions: ['Review the error message carefully', 'Check variable types and values'],
            preventionTips: ['Add proper error handling', 'Use type checking']
        };
    }

    /**
     * Generate tests for the code
     */
    private async generateTests(code: string, request: CodeGenerationRequest): Promise<string> {
        const prompt = `Generate comprehensive tests for this ${request.language} code:

\`\`\`${request.language}
${code}
\`\`\`

Please generate:
1. Unit tests covering all functions
2. Edge case testing
3. Error condition testing
4. Integration tests if applicable

Use the appropriate testing framework for ${request.language}.`;

        const response = await this.aiGateway.sendMessage(prompt, {});
        return this.extractCodeFromResponse(response.content);
    }

    /**
     * Generate documentation for the code
     */
    private async generateDocumentation(code: string, request: CodeGenerationRequest): Promise<string> {
        const prompt = `Generate documentation for this ${request.language} code:

\`\`\`${request.language}
${code}
\`\`\`

Please generate:
1. Function/class documentation
2. Usage examples
3. API documentation
4. Installation/setup instructions if applicable

Format the documentation in Markdown.`;

        const response = await this.aiGateway.sendMessage(prompt, {});
        return response.content;
    }

    /**
     * Analyze code quality
     */
    private async analyzeCodeQuality(code: string, language: string): Promise<CodeQualityMetrics> {
        // This is a simplified quality analysis
        // In a real implementation, you'd use language-specific tools
        
        const lines = code.split('\n').length;
        const complexity = Math.min(lines / 10, 10); // Simple complexity calculation
        
        return {
            complexity,
            maintainability: Math.max(10 - complexity, 1),
            testability: 8, // Placeholder
            security: 7, // Placeholder
            performance: 8 // Placeholder
        };
    }

    /**
     * Determine quality level based on metrics
     */
    private determineQualityLevel(metrics: CodeQualityMetrics): 'low' | 'medium' | 'high' {
        const avgScore = (metrics.maintainability + metrics.testability + metrics.security + metrics.performance) / 4;
        
        if (avgScore >= 8) return 'high';
        if (avgScore >= 5) return 'medium';
        return 'low';
    }

    /**
     * Detect language from file extension
     */
    private detectLanguageFromFile(filePath: string): string {
        const ext = filePath.split('.').pop()?.toLowerCase();
        
        const languageMap: { [key: string]: string } = {
            'ts': 'typescript',
            'js': 'javascript',
            'py': 'python',
            'java': 'java',
            'cs': 'csharp',
            'cpp': 'cpp',
            'cc': 'cpp',
            'cxx': 'cpp',
            'go': 'go',
            'rs': 'rust',
            'php': 'php',
            'rb': 'ruby'
        };

        return languageMap[ext || ''] || 'text';
    }

    /**
     * Extract explanation from AI response
     */
    private extractExplanation(content: string): string {
        // Simple extraction - look for explanation after code blocks
        const parts = content.split('```');
        if (parts.length > 2) {
            return parts[parts.length - 1].trim();
        }
        return 'Code generated successfully';
    }

    /**
     * Extract suggestions from AI response
     */
    private extractSuggestions(content: string): string[] {
        // Simple extraction - look for suggestion patterns
        const suggestions: string[] = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            if (line.toLowerCase().includes('suggestion') || line.toLowerCase().includes('consider')) {
                suggestions.push(line.trim());
            }
        }
        
        return suggestions;
    }

    /**
     * Extract warnings from AI response
     */
    private extractWarnings(content: string): string[] {
        // Simple extraction - look for warning patterns
        const warnings: string[] = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            if (line.toLowerCase().includes('warning') || line.toLowerCase().includes('caution')) {
                warnings.push(line.trim());
            }
        }
        
        return warnings;
    }

    /**
     * Extract code from AI response
     */
    private extractCodeFromResponse(content: string): string {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const match = codeBlockRegex.exec(content);
        return match ? match[2].trim() : content.trim();
    }

    /**
     * Get supported languages
     */
    public getSupportedLanguages(): string[] {
        return Array.from(this.supportedLanguages);
    }

    /**
     * Add support for a new language
     */
    public addLanguageSupport(language: string): void {
        this.supportedLanguages.add(language.toLowerCase());
    }
}

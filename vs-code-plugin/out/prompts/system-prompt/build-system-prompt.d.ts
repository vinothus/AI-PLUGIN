import { AiProviderInfo } from '../../ai/AiProvider';
import { BrowserSettings } from '../../shared/BrowserSettings';
import { FocusChainSettings } from '../../shared/FocusChainSettings';
export interface PromptContext {
    cwd: string;
    supportsBrowserUse: boolean;
    browserSettings: BrowserSettings;
    focusChainSettings: FocusChainSettings;
    providerInfo: AiProviderInfo;
    mcpServers: string[];
    securityLevel: 'basic' | 'enterprise' | 'compliance';
    complianceMode?: 'gdpr' | 'soc2' | 'hipaa';
}
export declare const buildSystemPrompt: (context: PromptContext) => Promise<string>;
//# sourceMappingURL=build-system-prompt.d.ts.map
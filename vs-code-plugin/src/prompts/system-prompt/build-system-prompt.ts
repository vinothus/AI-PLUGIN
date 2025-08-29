import { AiProviderInfo } from '../../ai/AiProvider';
import { BrowserSettings } from '../../shared/BrowserSettings';
import { FocusChainSettings } from '../../shared/FocusChainSettings';
import { SYSTEM_PROMPT_COMPACT } from './families/local-models/compact-system-prompt';
import { SYSTEM_PROMPT_NEXT_GEN } from './families/next-gen-models/next-gen-system-prompt';
import { SYSTEM_PROMPT_GENERIC } from './generic-system-prompt';
import { isLocalModelFamily, isNextGenModelFamily } from './utils';

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

export const buildSystemPrompt = async (context: PromptContext): Promise<string> => {
    // Compact prompt for local models with custom prompt set to compact
    if (context.providerInfo.customPrompt === "compact" && isLocalModelFamily(context.providerInfo.providerId)) {
        return SYSTEM_PROMPT_COMPACT(context);
    }
    
    // Next-gen prompts for advanced models
    if (isNextGenModelFamily(context.providerInfo.modelId)) {
        return SYSTEM_PROMPT_NEXT_GEN(context);
    }
    
    // Generic prompt for standard models
    return SYSTEM_PROMPT_GENERIC(context);
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSystemPrompt = void 0;
const compact_system_prompt_1 = require("./families/local-models/compact-system-prompt");
const next_gen_system_prompt_1 = require("./families/next-gen-models/next-gen-system-prompt");
const generic_system_prompt_1 = require("./generic-system-prompt");
const utils_1 = require("./utils");
const buildSystemPrompt = async (context) => {
    // Compact prompt for local models with custom prompt set to compact
    if (context.providerInfo.customPrompt === "compact" && (0, utils_1.isLocalModelFamily)(context.providerInfo.providerId)) {
        return (0, compact_system_prompt_1.SYSTEM_PROMPT_COMPACT)(context);
    }
    // Next-gen prompts for advanced models
    if ((0, utils_1.isNextGenModelFamily)(context.providerInfo.modelId)) {
        return (0, next_gen_system_prompt_1.SYSTEM_PROMPT_NEXT_GEN)(context);
    }
    // Generic prompt for standard models
    return (0, generic_system_prompt_1.SYSTEM_PROMPT_GENERIC)(context);
};
exports.buildSystemPrompt = buildSystemPrompt;
//# sourceMappingURL=build-system-prompt.js.map
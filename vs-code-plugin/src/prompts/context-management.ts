export const summarizeTask = (focusChainEnabled: boolean) =>
    `<explicit_instructions type="summarize_task">
The current conversation is rapidly running out of context. Now, your urgent task is to create a comprehensive detailed summary of the conversation so far, paying close attention to the user's explicit requests and your previous actions.
This summary should be thorough in capturing technical details, code patterns, and architectural decisions that would be essential for continuing development work without losing context. You MUST ONLY respond to this message by using the summarize_task tool call.

Before providing your final summary, wrap your analysis in <thinking> tags to organize your thoughts and ensure you've covered all necessary points. In your analysis process:
1. Chronologically analyze each message and section of the conversation. For each section thoroughly identify:
   - The user's explicit requests and intents
   - Your approach to addressing the user's requests
   - Key decisions, technical concepts and code patterns
   - Specific details like file names, full code snippets, function signatures, file edits, etc
2. Double-check for technical accuracy and completeness, addressing each required element thoroughly.

Your summary should include the following sections:
1. Primary Request and Intent: Capture all of the user's explicit requests and intents in detail
2. Key Technical Concepts: List all important technical concepts, technologies, and frameworks discussed.
3. Files and Code Sections: Enumerate specific files and code sections examined, modified, or created. Pay special attention to the most recent messages and include full code snippets where applicable and include a summary of why this file read or edit is important.
4. Problem Solving: Document problems solved and any ongoing troubleshooting efforts.
5. Pending Tasks: Outline any pending tasks that you have explicitly been asked to work on.
6. Current Work: Describe in detail precisely what was being worked on immediately before this summary request, paying special attention to the most recent messages from both user and assistant. Include file names and code snippets where applicable.
7. Optional Next Step: List the next step that you will take that is related to the most recent work you were doing. IMPORTANT: ensure that this step is DIRECTLY in line with the user's explicit requests, and the task you were working on immediately before this summary request. If your last task was concluded, then only list next steps if they are explicitly in line with the users request. Do not start on tangential requests without confirming with the user first.
                       If there is a next step, include direct quotes from the most recent conversation showing exactly what task you were working on and where you left off. This should be verbatim to ensure there's no drift in task interpretation.
8. You should pay special attention to the most recent user message, as it indicates the user's most recent intent, if applicable.

${
    focusChainEnabled
        ? `Updating task progress:
There is an optional task_progress parameter which you should use to provide an updated checklist to keep the user informed of the latest state of the progress for this task. You should always return the most up to date version of the checklist if there is already an existing checklist. If no task_progress list was included in the previous context, you should NOT create a new task_progress list - do not return a new task_progress list if one does not already exist.

The task_progress should be a markdown checklist that reflects the current state of the task, with completed items marked with [x] and incomplete items marked with [ ].`
        : ""
}

Remember: This summary will be used to continue the conversation, so it must be comprehensive and accurate. Focus on preserving all technical details and context that would be needed to continue development work seamlessly.`;

export const continueTask = (summary: string, focusChainEnabled: boolean) =>
    `<explicit_instructions type="continue_task">
You are continuing a conversation that has been summarized due to context limitations. Below is a comprehensive summary of the previous conversation:

${summary}

Your task is to continue exactly where the conversation left off. You should:

1. **Understand the Context**: Carefully read and understand the summary above
2. **Resume Work**: Continue with the exact task that was being worked on
3. **Maintain Consistency**: Ensure your actions are consistent with the previous work
4. **Preserve Intent**: Maintain the user's original intent and goals
5. **Reference Previous Work**: When making decisions, consider the technical decisions and patterns established in the summary

${
    focusChainEnabled
        ? `**Focus Chain Integration**: If there was a task_progress checklist in the summary, you should continue to use and update it as you work. Maintain the same checklist format and update progress as you complete items.`
        : ""
}

**Important Guidelines**:
- Do not repeat work that has already been completed
- Build upon the existing code and decisions
- If you need clarification about any aspect of the previous work, ask specific questions
- Maintain the same coding standards and patterns established in the summary
- Continue with the same level of detail and thoroughness

Remember: You are picking up exactly where the conversation left off. The user expects seamless continuation of their work.`;

export const compactConversation = (focusChainEnabled: boolean) =>
    `<explicit_instructions type="compact_conversation">
The conversation is getting long and needs to be compacted to preserve context while freeing up space. Your task is to create a concise but comprehensive summary of the conversation that preserves all essential technical details and context.

**Compaction Guidelines**:
1. **Preserve Technical Details**: Keep all important code snippets, file changes, and technical decisions
2. **Maintain Context**: Ensure the summary includes enough context to continue work seamlessly
3. **Focus on Recent Work**: Give more weight to recent messages and current work
4. **Preserve User Intent**: Maintain clear understanding of what the user wants to accomplish
5. **Keep Essential Information**: Include file paths, function names, error messages, and key decisions

**Summary Structure**:
1. **Current Task**: What is being worked on right now
2. **Key Technical Decisions**: Important architectural and implementation choices
3. **Files Modified/Created**: List of files with brief descriptions of changes
4. **Current Status**: Where the work stands and what's next
5. **Important Context**: Any critical information needed to continue

${
    focusChainEnabled
        ? `**Focus Chain**: If there's an active todo list, include the current state of the checklist in the summary.`
        : ""
}

The goal is to reduce the conversation length while maintaining all necessary context for continued development work.`;

export const extractFocusChain = () =>
    `<explicit_instructions type="extract_focus_chain">
Extract the current focus chain (todo list) from the conversation. Look for:
1. Markdown checklists with [ ] and [x] items
2. Task progress updates
3. Lists of steps or actions to be completed
4. Current work items and pending tasks

Return the focus chain in standard markdown checklist format:
- [ ] Incomplete task
- [x] Completed task

If no focus chain is found, return an empty string.`;

Specialized Assistants Implementation Plan

Summary

Implement a system for 3 specialized assistants (AZOR, Biznesmen, Optymista) with ability to switch between
them during conversations.

Implementation Steps

1.  Core Assistant System

- Add id field to Assistant class (src/assistant/assistant.ts)
- Create src/assistant/assistants.ts with assistant registry containing:
  - AZOR: Current friendly dog assistant (perfekcjonistyczny pies)
  - Biznesmen: Goal-oriented, factual, concise businessman
  - Optymista: Optimistic, consoling, caring assistant
- Add factory functions: getAssistantById(), createAssistant(), listAssistants()

2.  Session Persistence

- Update SessionMetadata type to include assistant_id?: string
- Modify loadSessionHistory() to return assistant ID
- Modify saveSessionHistory() to persist assistant ID
- Fix ChatSession.loadFromFile() to restore correct assistant (currently broken)
- Update ChatSession.saveToFile() to save assistant ID

3.  Assistant Switching

- Add switchAssistant() method to ChatSession that:
  - Updates assistant
  - Reinitializes LLM session with new system prompt
  - Saves session
- Add switchAssistantInCurrentSession() to SessionManager

4.  Command Interface

- Add /assistant to valid commands list
- Implement /assistant list - shows available assistants
- Implement /assistant switch <id> - switches to specified assistant
- Create src/commands/assistantList.ts for display logic
- Update help text in src/cli/console.ts

5.  Testing & Verification

- Test assistant switching mid-conversation
- Verify session save/load preserves assistant
- Test backward compatibility with old session files (should default to AZOR)
- Verify each assistant's personality in responses

Files to Modify

- src/assistant/assistant.ts - Add id field
- src/types.ts - Update SessionMetadata
- src/files/sessionFiles.ts - Update load/save
- src/session/chatSession.ts - Fix loading, add switching
- src/session/sessionManager.ts - Add switching method
- src/commandHandler.ts - Add /assistant command
- src/cli/console.ts - Update help

Files to Create

- src/assistant/assistants.ts - Assistant registry
- src/commands/assistantList.ts - List display

Backward Compatibility

Old session files without assistant_id will default to "azor" assistant.

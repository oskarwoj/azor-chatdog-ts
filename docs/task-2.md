Here is Claude's plan:
Automatic Thread Titling Implementation Plan

Overview

Add automatic thread titling that generates descriptive titles from the first user prompt using LLM
intelligence with keyword extraction fallback. Titles will be stored in session JSON files and displayed in
session listings.

Implementation Steps

1.  Update Data Models (src/types.ts, src/files/sessionFiles.ts)

- Add optional title?: string field to SessionMetadata interface
- Add title?: string to StoredSessionMetadata interface
- Ensures backward compatibility with existing sessions

2.  Enhance ChatSession Class (src/session/chatSession.ts)

- Add private \_title: string | null property
- Add getTitle() and setTitle(title: string) methods
- Modify saveToFile() to pass title to storage function
- Modify loadFromFile() to receive and set title from storage
- Add getLLMClient() getter to expose LLM client for title generation

3.  Create Title Generator (NEW: src/utils/titleGenerator.ts)

- Primary method: Send meta-prompt to LLM: "Stwórz krótki, opisowy tytuł (3-6 słów) dla konwersacji
  rozpoczynającej się od: '{prompt}'. Odpowiedz TYLKO tytułem."
- Fallback method: Extract first 50 characters, truncate at word boundary, add "..." if truncated
- Implement generateTitleFromPrompt() that tries LLM first, falls back to keyword extraction on error/timeout

4.  Hook Title Generation into First Message (src/chat.ts)

- In mainLoop(), detect first message using session.isEmpty() before sending
- After successful first response, call generateTitleFromPrompt()
- Set title using session.setTitle()
- Display confirmation: "✓ Wygenerowano tytuł sesji: '{title}'"

5.  Update File Operations (src/files/sessionFiles.ts)

- Modify saveSessionHistory() to accept optional title parameter and include in JSON
- Modify loadSessionHistory() to parse title field and return it
- Update listSessions() return type to include title? field
- Parse and return title in session listing data

6.  Implement /session rename Command

- Add handler in src/commandHandler.ts for handleSessionSubcommand()
- Create NEW file: src/commands/sessionRename.ts
- Implement validation (require non-empty title)
- Update session title and save immediately
- Display confirmation: "✓ Zmieniono tytuł sesji na: '{title}'"

7.  Enhanced Session List Display (src/commands/sessionList.ts)

- Display format: {title} (ID: {first8chars}...)
- Fallback: If no title exists, show ID: {full-uuid} (backward compatibility)
- Example: "Pytanie o temperaturę (ID: 158c11ad...) (Wiadomości: 2, Ost. aktywność: 11.11.2025, 18:34)"

Files to Modify/Create

- New: src/utils/titleGenerator.ts, src/commands/sessionRename.ts
- Modified: src/types.ts, src/session/chatSession.ts, src/files/sessionFiles.ts, src/commands/sessionList.ts,
  src/commandHandler.ts, src/chat.ts

Key Features

✓ Fully automatic - no user interruption
✓ Intelligent LLM-generated titles with robust fallback
✓ Backward compatible with existing sessions
✓ Manual rename capability via /session rename
✓ Clean display in Polish UI

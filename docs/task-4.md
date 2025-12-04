Plan: Add /audio Command with say.js TTS

1.  Install Dependencies

- Add say package: npm install say
- Add TypeScript types: npm install --save-dev @types/say

2.  Create Audio Command (src/commands/audioGeneration.ts)

- Import say library and type definitions
- Implement generateAudioFromLastMessage() function that:
  - Extracts last assistant message from chat history
  - Parses optional --lang parameter (default to Polish: pl-PL)
  - Uses say.speak() to play text with selected language
  - Handles errors gracefully with Polish error messages

3.  Register Command in Command Handler (src/commandHandler.ts)

- Add /audio to VALID_SLASH_COMMANDS array (line ~9)
- Import generateAudioFromLastMessage function
- Add command handler in handleCommand() function (after line ~90)
- Parse optional language parameter from command arguments

4.  Update Help Text (src/cli/console.ts)

- Add /audio [--lang=CODE] to help display (line ~59)
- Include usage example with Polish message

5.  Test the Implementation

- Verify command works with default language
- Test with --lang=en-US parameter
- Confirm error handling for empty history

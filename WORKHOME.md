# Zadanie 1: Dodaj nowego klienta/API

AZØR the CHATDOG. TypeScript.
Folder: `M1/azor-chatdog`

Istniejące API klienckie:

- `node-llama-cpp`: `src/llm/llamaClient.ts`
- `@google/generative-ai` (gemini): `src/llm/geminiClient.ts`

Dodaj nowego klienta/API

- OpenAI/zdalnie (https://api.openai.com)
- OpenAI/REST-lokalnie/ollama (https://ollama.com)

# Zadanie 2: Ustawianie parametrów dla klientów lokalnych ✅

Ustawianie parametrów dla wszystkich klientów lokalnych:

- ✅ Top P
- ✅ Top K
- ✅ Temperature

## Implementacja (Zakończona)

Dodano parametry próbkowania dla obu klientów lokalnych:

### Ollama Client

- Nowe zmienne środowiskowe: `OLLAMA_TEMPERATURE`, `OLLAMA_TOP_P`, `OLLAMA_TOP_K`
- Parametry są przekazywane w opcjach API Ollama podczas każdego żądania
- Wartości domyślne: Temperature=0.8, Top-P=0.9, Top-K=40

### LLaMA Client (node-llama-cpp)

- Nowe zmienne środowiskowe: `LLAMA_TEMPERATURE`, `LLAMA_TOP_P`, `LLAMA_TOP_K`
- Parametry są przekazywane do metody `prompt()` przy każdym wywołaniu
- Wartości domyślne: Temperature=0.8, Top-P=0.9, Top-K=40

### Zmiany w plikach:

- `src/llm/ollamaValidation.ts` - dodano walidację Zod dla nowych parametrów
- `src/llm/llamaValidation.ts` - dodano walidację Zod dla nowych parametrów
- `src/llm/ollamaClient.ts` - dodano interfejs `SamplingParams`, przekazywanie parametrów do API
- `src/llm/llamaClient.ts` - dodano interfejs `SamplingParams`, przekazywanie parametrów do sesji
- `OLLAMA.md` - zaktualizowana dokumentacja z wyjaśnieniem parametrów
- `README.md` - zaktualizowana sekcja konfiguracji
- `CLAUDE.md` - zaktualizowana sekcja konfiguracji

### Jak używać:

Dodaj do pliku `.env`:

```bash
# Dla Ollama
OLLAMA_TEMPERATURE=0.8
OLLAMA_TOP_P=0.9
OLLAMA_TOP_K=40

# Dla LLaMA
LLAMA_TEMPERATURE=0.8
LLAMA_TOP_P=0.9
LLAMA_TOP_K=40
```

Parametry są opcjonalne - jeśli nie zostaną ustawione, użyte będą wartości domyślne.

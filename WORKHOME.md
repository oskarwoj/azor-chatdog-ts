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

# Zadanie 2

AZØR - Nadaj tytuł wątkowi

Najpierw ZAPROJEKTUJ - potem ZAKODUJ ficzer który umożliwia AZØROWI tytułowanie wątków (konwersacji) podczas ich tworzenia.

W typowych aplikacjach konwersacyjnych działa to tak:

- otwierasz nowy wątek, piszesz prompta
- otrzymujesz odpowiedź (obviously)
- wątek jest domyślnie TYTUŁOWANY na podstawie Twojego pierwszego prompta
- możesz potem wątek "przenazwić", ale wyłącznie ręcznie. Automatyczne nazywanie wątku dzieje się tylko przy pierwszym prompcie.

**ZADANIE**:

- najpierw PRZEMYŚL jak to zrobić. Omawiaj na discordzie pomysły. Różnych rozwiązań jest sporo, są lepsze i gorsze, prostsze i trudniejsze
- ZAIMPLEMENTUJ. Obecnie wątki można identyfikować jedynie po ID sesji i - o ile w przypadku przełączania wątku to musi zostać - o tyle wyświetlenie tytułu wątku (wraz z jego wcześniejszym ustaleniem) byłoby bardzo user-friendly.
- Tytułowanie wątku dzieje się z automatu. Jeśli powstaje wątek (wysłałeś/aś prompta), to musi być zatytułowany
- nowa komenda daje możliwość "przenazwić" tytuł wątku
- Tytuł wątku jest (siłą rzeczy) przechowywany w plikach `.json`, dla spójności systemu

# Zadanie 3

AZØR - Wyspecjalizowani asystenci

Rozbuduj AZØRA (kod bazowy - z `M1/azor-chatdog`)

- kodujesz możliwość tworzenia różnych **wyspecjalizowanych asystentów**.
- użytkownik przełącza asystenta manualnie, np. nową komendą
- asystenci mogą być zahardkodowani w kodzie (choć można zaprogramować tworzenie nowych dynamicznie np. nową komendą)
- Wątek powinien mieć określonego aktualnego asystenta (aby było spójnie i jednoznacznie)

**CEL**: masz minimum 2 nowych asystentów (a AZØR zostaje - więc w sumie minimum trzech). I w możesz w trakcie trwania konwersacji ich przełączać.

Inspiracje asystentów:

- perfekcjonista przykładający ogromną wagę do detali.
- biznesmen zorientowany na cele, wypowiadający się bardzo rzeczowo i krótko.
- optymistyczny pochlebca który zawsze pocieszy i dopytuje jak się czujesz.
  ale to może być co-/ktokolwiek.

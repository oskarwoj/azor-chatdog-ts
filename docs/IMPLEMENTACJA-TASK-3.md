# Jak zostało zaimplementowane zadanie 3: Specjalizowani Asystenci

## Wyjaśnienie metodą Feymana

### Co to w ogóle jest?

Wyobraź sobie, że masz chatbota, który zawsze odpowiadał w ten sam sposób - jak przyjazny pies o imieniu AZOR. Teraz chcemy, żeby ten sam chatbot mógł "przebrać się" w różne osobowości w trakcie rozmowy. To jak zmiana aktora w teatrze - ta sama scena (historia rozmowy), ale inny aktor (asystent) z innym charakterem.

### Trzy główne części systemu

#### 1. **Rejestr Asystentów** (jak katalog aktorów)

W pliku `src/assistant/assistants.ts` stworzyliśmy coś w rodzaju katalogu wszystkich dostępnych asystentów. To jest po prostu obiekt JavaScript, który przechowuje trzy definicje:

- **AZOR** - przyjazny pies (oryginalny)
- **BIZNESMEN** - konkretny, rzeczowy, bez zbędnych słów
- **OPTYMISTA** - ciepły, wspierający, zawsze widzi pozytywne strony

Każdy asystent ma:
- `id` - unikalny identyfikator (jak numer w katalogu)
- `name` - nazwa wyświetlana
- `systemPrompt` - instrukcje dla AI, jak ma się zachowywać (to jest jak scenariusz dla aktora)
- `description` - krótki opis dla użytkownika

Dodatkowo mamy funkcje pomocnicze:
- `getAssistantById()` - "daj mi asystenta o tym ID"
- `createAssistant()` - "stwórz instancję asystenta z tego ID"
- `listAssistants()` - "pokaż mi wszystkich dostępnych asystentów"

#### 2. **Pamięć o Asystencie** (zapamiętywanie, kto grał)

Problem: Gdy zapisujemy sesję rozmowy do pliku, musimy też zapamiętać, który asystent był używany. Inaczej po ponownym otwarciu sesji nie wiedzielibyśmy, czy rozmawialiśmy z AZOR-em, BIZNESMEN-em czy OPTYMISTĄ.

**Rozwiązanie:**

1. **W typach** (`src/types.ts`):
   - Dodaliśmy opcjonalne pole `assistant_id?: string` do `SessionMetadata`
   - To pole może być `undefined` (dla starych sesji, które nie mają tego pola)

2. **W zapisie** (`src/files/sessionFiles.ts`):
   - Funkcja `saveSessionHistory()` teraz przyjmuje dodatkowy parametr `assistantId`
   - Zapisuje go do pliku JSON razem z historią rozmowy
   - Jeśli `assistantId` jest `null` lub `undefined`, po prostu go nie zapisuje (nie psuje to starych plików)

3. **W odczycie** (`src/files/sessionFiles.ts`):
   - Funkcja `loadSessionHistory()` teraz zwraca również `assistantId` jako czwarty element krotki
   - Jeśli plik nie ma tego pola (stare sesje), zwraca `null`
   - To zapewnia **kompatybilność wsteczną** - stare sesje nadal działają

4. **W klasie ChatSession** (`src/session/chatSession.ts`):
   - `loadFromFile()` sprawdza, czy w pliku jest `assistantId`
   - Jeśli jest, tworzy odpowiedniego asystenta zamiast domyślnego
   - Jeśli nie ma (stara sesja), używa domyślnego asystenta (AZOR)
   - `saveToFile()` zapisuje `assistant.id` razem z resztą danych

#### 3. **Przełączanie Asystentów** (zmiana aktora w trakcie spektaklu)

To jest najciekawsza część. Chcemy móc zmienić asystenta w trakcie rozmowy, ale zachować całą historię.

**Jak to działa:**

1. **W ChatSession** (`src/session/chatSession.ts`):
   - Metoda `switchAssistant(newAssistant)`:
     - Zmienia wewnętrzny obiekt `assistant` na nowy
     - Wywołuje `_initializeLLMSession()` - to jest kluczowe!
     - `_initializeLLMSession()` tworzy nową sesję LLM z **nowym system promptem** (nową osobowością), ale z **tą samą historią rozmowy**
     - Zapisuje sesję z nowym `assistant_id`

2. **W SessionManager** (`src/session/sessionManager.ts`):
   - Metoda `switchAssistantInCurrentSession(assistantId)`:
     - Sprawdza, czy jest aktywna sesja
     - Tworzy nowego asystenta z podanego ID
     - Wywołuje `switchAssistant()` na bieżącej sesji

3. **Dlaczego to działa?**
   - LLM (model językowy) dostaje historię rozmowy + nowy system prompt
   - System prompt mówi mu: "Teraz jesteś BIZNESMEN-em, odpowiadaj konkretnie"
   - Model "czyta" całą historię, ale odpowiada w stylu nowego asystenta
   - To jak aktor, który czyta scenariusz, ale gra swoją rolę

#### 4. **Interfejs Użytkownika** (jak użytkownik to obsługuje)

Dodaliśmy nową komendę `/assistant` z dwoma podkomendami:

1. **`/assistant list`**:
   - Wyświetla wszystkich dostępnych asystentów
   - Pokazuje, który jest aktualnie aktywny (oznaczenie "AKTUALNY")
   - Implementacja jest bezpośrednio w `commandHandler.ts` (nie ma osobnego pliku `assistantList.ts`)

2. **`/assistant switch <ID>`**:
   - Sprawdza, czy podany ID istnieje
   - Sprawdza, czy nie jest już aktywny
   - Wywołuje `switchAssistantInCurrentSession()`
   - Informuje użytkownika o sukcesie

**Zmiany w `commandHandler.ts`**:
- Dodano `/assistant` do listy `VALID_SLASH_COMMANDS`
- Dodano funkcję `handleAssistantSubcommand()` do obsługi podkomend
- Integracja z resztą systemu komend

**Zmiany w `console.ts`**:
- Zaktualizowano `displayHelp()` o nowe komendy `/assistant`

### Kompatybilność wsteczna (ważne!)

Stare sesje (zapisane przed tą zmianą) nie mają pola `assistant_id`. System radzi sobie z tym tak:

1. Przy odczycie: jeśli `assistant_id` jest `null`, używa domyślnego asystenta (AZOR)
2. Przy zapisie: jeśli `assistant_id` jest `null`, po prostu go nie zapisuje
3. Stare pliki JSON nie są modyfikowane, dopóki nie zapiszemy nowej sesji

To oznacza, że:
- Stare sesje nadal działają
- Po pierwszym zapisie nowej sesji, pole `assistant_id` zostanie dodane
- Nie trzeba migrować starych plików

### Przepływ danych (jak to wszystko się łączy)

```
Użytkownik wpisuje: /assistant switch biznesmen
    ↓
commandHandler.handleCommand() rozpoznaje komendę
    ↓
handleAssistantSubcommand() wywołuje manager.switchAssistantInCurrentSession('biznesmen')
    ↓
SessionManager.switchAssistantInCurrentSession() tworzy nowego asystenta
    ↓
ChatSession.switchAssistant() zmienia asystenta i reinicjalizuje LLM
    ↓
_initializeLLMSession() tworzy nową sesję LLM z nowym system promptem + starą historią
    ↓
saveToFile() zapisuje sesję z nowym assistant_id
    ↓
Użytkownik widzi: "✓ Przełączono na asystenta: BIZNESMEN"
```

### Kluczowe insighty (co było ważne w implementacji)

1. **System prompt vs historia**: System prompt definiuje osobowość, historia to kontekst. Zmiana system promptu przy zachowaniu historii = zmiana osobowości przy zachowaniu kontekstu.

2. **Reinicjalizacja sesji LLM**: Nie możemy po prostu zmienić system promptu w istniejącej sesji. Musimy stworzyć nową sesję z nowym promptem, ale przekazać starą historię. To jak restart z kontekstem.

3. **Identyfikatory**: Używamy małych liter dla ID (`'azor'`, `'biznesmen'`, `'optymista'`) i normalizujemy input użytkownika do małych liter. To zapobiega problemom z wielkością liter.

4. **Opциональność**: Pole `assistant_id` jest opcjonalne (`?`) w typach TypeScript. To pozwala na kompatybilność wsteczną i bezpieczne odczytywanie starych plików.

5. **Błędy**: Jeśli użytkownik poda nieprawidłowy ID asystenta, system rzuca wyjątek z czytelnym komunikatem i sugeruje użycie `/assistant list`.

### Co zostało zaimplementowane vs plan

✅ **Zaimplementowane:**
- Pole `id` w klasie `Assistant`
- Rejestr asystentów w `assistants.ts` z trzema asystentami
- Funkcje factory: `getAssistantById()`, `createAssistant()`, `listAssistants()`
- Pole `assistant_id` w `SessionMetadata`
- Aktualizacja `loadSessionHistory()` i `saveSessionHistory()`
- Naprawa `ChatSession.loadFromFile()` do przywracania właściwego asystenta
- Aktualizacja `ChatSession.saveToFile()` do zapisywania `assistant_id`
- Metoda `switchAssistant()` w `ChatSession`
- Metoda `switchAssistantInCurrentSession()` w `SessionManager`
- Komenda `/assistant` z podkomendami `list` i `switch`
- Aktualizacja help text w `console.ts`
- Kompatybilność wsteczna ze starymi sesjami

❌ **Nie zaimplementowane (ale nie było potrzebne):**
- Osobny plik `src/commands/assistantList.ts` - logika jest bezpośrednio w `commandHandler.ts`, co jest prostsze i bardziej spójne z resztą kodu

### Podsumowanie (jednym zdaniem)

System pozwala na przełączanie między trzema asystentami (AZOR, BIZNESMEN, OPTYMISTA) w trakcie rozmowy, zachowując historię konwersacji, zapisując wybór asystenta do pliku i zapewniając kompatybilność wsteczną ze starymi sesjami.



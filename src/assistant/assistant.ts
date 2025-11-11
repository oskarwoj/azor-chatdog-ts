/**
 * Assistant class definition
 * Defines the Assistant class that encapsulates assistant configuration.
 */

export class Assistant {
  private _systemPrompt: string;
  private _name: string;

  /**
   * Initialize an Assistant with system prompt and name configuration.
   *
   * @param systemPrompt - The system instruction/prompt that defines the assistant's behavior
   * @param name - The display name of the assistant
   */
  constructor(systemPrompt: string, name: string) {
    this._systemPrompt = systemPrompt;
    this._name = name;
  }

  /**
   * Get the system prompt for this assistant.
   */
  get systemPrompt(): string {
    return this._systemPrompt;
  }

  /**
   * Get the display name for this assistant.
   */
  get name(): string {
    return this._name;
  }
}

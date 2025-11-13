/**
 * Assistant class definition
 * Defines the Assistant class that encapsulates assistant configuration.
 */

export class Assistant {
  private _id: string;
  private _systemPrompt: string;
  private _name: string;

  /**
   * Initialize an Assistant with system prompt and name configuration.
   *
   * @param id - Unique identifier for the assistant
   * @param systemPrompt - The system instruction/prompt that defines the assistant's behavior
   * @param name - The display name of the assistant
   */
  constructor(id: string, systemPrompt: string, name: string) {
    this._id = id;
    this._systemPrompt = systemPrompt;
    this._name = name;
  }

  /**
   * Get the unique identifier for this assistant.
   */
  get id(): string {
    return this._id;
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

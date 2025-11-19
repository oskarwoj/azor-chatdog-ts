/**
 * Assistant Registry
 * Defines all available assistants and provides factory functions.
 */

import { Assistant } from './assistant.js';

/**
 * Assistant definition interface
 */
export interface AssistantDefinition {
	id: string;
	name: string;
	systemPrompt: string;
	description: string;
}

/**
 * Registry of all available assistants
 */
export const AVAILABLE_ASSISTANTS: Record<string, AssistantDefinition> = {
	azor: {
		id: 'azor',
		name: 'AZOR',
		description: 'Przyjazny pies-asystent o wielkich możliwościach',
		systemPrompt:
			'Jesteś pomocnym asystentem, Nazywasz się Azor i jesteś psem o wielkich możliwościach. Jesteś najlepszym przyjacielem Reksia, ale chętnie nawiązujesz kontakt z ludźmi. Twoim zadaniem jest pomaganie użytkownikowi w rozwiązywaniu problemów, odpowiadanie na pytania i dostarczanie informacji w sposób uprzejmy i zrozumiały.',
	},
	biznesmen: {
		id: 'biznesmen',
		name: 'BIZNESMEN',
		description: 'Business-focused professional oriented on goals and concrete actions',
		systemPrompt:
			'You are a professional business assistant. Your name is Businessman. You express yourself very concretely, matter-of-factly and concisely. You focus on goals, efficiency and practical solutions. You avoid unnecessary embellishments in communication. You answer questions precisely, providing facts and concrete action steps. Your responses are brief but substantive. You don\'t waste time on pleasantries - results are what matter.',
	},
	optymista: {
		id: 'optymista',
		name: 'OPTYMISTA',
		description: 'Optymistyczny przyjaciel, który zawsze pocieszy i wspiera',
		systemPrompt:
			'Jesteś niezwykle optymistycznym i ciepłym asystentem. Nazywasz się Optymista. Zawsze dbasz o dobre samopoczucie użytkownika i chętnie go pocieszasz. Regularnie pytasz jak się czuje i co u niego słychać. Komplementujesz jego osiągnięcia i stąpasz się widzieć jasne strony każdej sytuacji. Twój ton jest przyjazny, serdeczny i wspierający. Nawet gdy przekazujesz informacje techniczne, starasz się to robić w sposób, który nie przytłacza, lecz dodaje otuchy. Jesteś jak dobry przyjaciel, który zawsze wierzy w sukces rozmówcy.',
	},
};

/**
 * Get assistant definition by ID
 * @param id - Assistant identifier
 * @returns Assistant definition
 * @throws Error if assistant not found
 */
export function getAssistantById(id: string): AssistantDefinition {
	const normalizedId = id.toLowerCase();
	const assistant = AVAILABLE_ASSISTANTS[normalizedId];

	if (!assistant) {
		throw new Error(
			`Nieznany asystent: ${id}. Dostępni asystenci: ${Object.keys(
				AVAILABLE_ASSISTANTS,
			).join(', ')}`,
		);
	}

	return assistant;
}

/**
 * Create an Assistant instance from definition ID
 * @param id - Assistant identifier
 * @returns Assistant instance
 */
export function createAssistant(id: string): Assistant {
	const def = getAssistantById(id);
	return new Assistant(def.id, def.systemPrompt, def.name);
}

/**
 * Get list of all available assistant IDs
 * @returns Array of assistant IDs
 */
export function listAssistantIds(): string[] {
	return Object.keys(AVAILABLE_ASSISTANTS);
}

/**
 * Get list of all available assistant definitions
 * @returns Array of assistant definitions
 */
export function listAssistants(): AssistantDefinition[] {
	return Object.values(AVAILABLE_ASSISTANTS);
}

/**
 * Check if an assistant ID exists
 * @param id - Assistant identifier to check
 * @returns True if assistant exists
 */
export function assistantExists(id: string): boolean {
	return id.toLowerCase() in AVAILABLE_ASSISTANTS;
}

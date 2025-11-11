import { z } from 'zod';

export const OllamaConfigSchema = z.object({
	engine: z.literal('OLLAMA').default('OLLAMA'),
	modelName: z.string().describe('Nazwa modelu Ollama'),
	ollamaBaseUrl: z
		.string()
		.url('OLLAMA_BASE_URL musi być prawidłowym URL')
		.default('http://localhost:11434')
		.describe('URL bazowy serwera Ollama'),
	ollamaTimeout: z
		.number()
		.int()
		.min(1000)
		.default(30000)
		.describe('Timeout dla requestów w milisekundach'),
	ollamaTemperature: z
		.number()
		.min(0)
		.max(2)
		.default(0.8)
		.describe('Temperatura próbkowania (0-2)'),
	ollamaTopP: z
		.number()
		.min(0)
		.max(1)
		.default(0.9)
		.describe('Top P próbkowania (0-1)'),
	ollamaTopK: z
		.number()
		.int()
		.min(1)
		.default(40)
		.describe('Top K próbkowania (min 1)'),
});

export type OllamaConfig = z.infer<typeof OllamaConfigSchema>;

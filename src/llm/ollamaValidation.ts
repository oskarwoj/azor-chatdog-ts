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
});

export type OllamaConfig = z.infer<typeof OllamaConfigSchema>;

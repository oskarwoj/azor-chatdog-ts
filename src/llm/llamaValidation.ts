import { existsSync } from 'fs';
import { z } from 'zod';

export const LlamaConfigSchema = z.object({
	engine: z.literal('LLAMA_CPP').default('LLAMA_CPP'),
	modelName: z.string().describe('Nazwa modelu Llama'),
	llamaModelPath: z
		.string()
		.describe('Ścieżka do pliku modelu .gguf')
		.refine((path) => existsSync(path), { message: 'Plik modelu nie istnieje' })
		.refine((path) => path.endsWith('.gguf'), {
			message: 'Plik modelu musi mieć rozszerzenie .gguf',
		}),
	llamaGpuLayers: z
		.number()
		.int()
		.min(0)
		.default(1)
		.describe('Liczba warstw GPU'),
	llamaContextSize: z
		.number()
		.int()
		.min(512)
		.default(8192)
		.describe('Rozmiar kontekstu (min 8192 zalecane dla narzędzi)'),
	llamaTemperature: z
		.number()
		.min(0)
		.max(2)
		.default(0.8)
		.describe('Temperatura próbkowania (0-2)'),
	llamaTopP: z
		.number()
		.min(0)
		.max(1)
		.default(0.9)
		.describe('Top P próbkowania (0-1)'),
	llamaTopK: z
		.number()
		.int()
		.min(1)
		.default(40)
		.describe('Top K próbkowania (min 1)'),
});

export type LlamaConfig = z.infer<typeof LlamaConfigSchema>;

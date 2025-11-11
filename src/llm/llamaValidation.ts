import { z } from 'zod';
import { existsSync } from 'fs';

export const LlamaConfigSchema = z.object({
  engine: z.literal('LLAMA_CPP').default('LLAMA_CPP'),
  modelName: z.string().describe('Nazwa modelu Llama'),
  llamaModelPath: z
    .string()
    .describe('Ścieżka do pliku modelu .gguf')
    .refine(path => existsSync(path), { message: 'Plik modelu nie istnieje' })
    .refine(path => path.endsWith('.gguf'), { message: 'Plik modelu musi mieć rozszerzenie .gguf' }),
  llamaGpuLayers: z.number().int().min(0).default(1).describe('Liczba warstw GPU'),
  llamaContextSize: z.number().int().min(1).default(2048).describe('Rozmiar kontekstu')
});

export type LlamaConfig = z.infer<typeof LlamaConfigSchema>;

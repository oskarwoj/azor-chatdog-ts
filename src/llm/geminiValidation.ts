import { z } from 'zod';

export const GeminiConfigSchema = z.object({
  engine: z.literal('GEMINI').default('GEMINI'),
  modelName: z.string().describe('Nazwa modelu Gemini'),
  geminiApiKey: z
    .string()
    .min(1, 'GEMINI_API_KEY nie może być pusty')
    .transform(val => val.trim())
});

export type GeminiConfig = z.infer<typeof GeminiConfigSchema>;

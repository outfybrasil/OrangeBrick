export interface EditorialProviderResponse<TSource> {
  text?: string;
  sources?: TSource[];
}

interface EditorialProviderDependencies<TSource> {
  now(): number;
  generateGemini(model: string, prompt: string, deadline: number): Promise<EditorialProviderResponse<TSource>>;
  generateGroq(prompt: string, deadline: number): Promise<string>;
  onGeminiFailure?(model: string, message: string): void;
  onGeminiFallback?(errors: string[]): void;
}

export async function generateWithProviderFallback<TSource>(
  models: readonly string[],
  prompt: string,
  deadline: number,
  dependencies: EditorialProviderDependencies<TSource>
): Promise<{ text: string; sources: TSource[] }> {
  const errors: string[] = [];

  for (const model of models) {
    if (deadline - dependencies.now() <= 0) break;

    try {
      const response = await dependencies.generateGemini(model, prompt, deadline);
      if (response.text) return { text: response.text, sources: response.sources ?? [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${model}: ${message.slice(0, 160)}`);
      dependencies.onGeminiFailure?.(model, message);
    }
  }

  dependencies.onGeminiFallback?.(errors);
  return { text: await dependencies.generateGroq(prompt, deadline), sources: [] };
}

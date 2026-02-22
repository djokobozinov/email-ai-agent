const DEFAULT_OPENAI_MODEL = "gpt-5-nano";

export function getOpenAIModel(): string {
  const configuredModel = process.env.OPENAI_MODEL?.trim();
  return configuredModel || DEFAULT_OPENAI_MODEL;
}

export { DEFAULT_OPENAI_MODEL };

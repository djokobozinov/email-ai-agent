import { DEFAULT_OPENAI_MODEL, getConfiguredValue } from "./config";

export function getOpenAIModel(): string {
  return getConfiguredValue("OPENAI_MODEL") || DEFAULT_OPENAI_MODEL;
}

export { DEFAULT_OPENAI_MODEL };

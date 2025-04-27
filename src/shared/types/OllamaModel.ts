export type OllamaModelType = "LLM" | "Embedding" | "Reasoning";

export type OllamaModel = { name: string, type: OllamaModelType, installed?: boolean, installing?: boolean }

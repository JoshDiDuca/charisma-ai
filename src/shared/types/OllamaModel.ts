export type OllamaModelType = "LLM" | "Embedding" | "Reasoning";

export type OllamaModel = { name: string, type: OllamaModelType, installed?: boolean, installing?: boolean }

export type OllamaExtraction = {
    manifestUrl: string;
    baseUrl: string;
    config: string;
    modelName: string;
    tag: string;
    layers: {
      url: string;
            size: number;
            mediaType: string;
            filename: string;

    }[];
    configFilename: any;
}

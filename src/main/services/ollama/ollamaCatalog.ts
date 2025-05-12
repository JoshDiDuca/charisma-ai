import { OllamaExtraction, OllamaModel } from "shared/types/OllamaModel";

export const OllamaModels: OllamaModel[] = [
  {
    name: 'mxbai-embed-large:latest',
    type: "Embedding"
  },
  {
    name: 'nomic-embed-text:latest',
    type: "Embedding"
  },
  {
    name: 'deepseek-r1:latest',
    type: "LLM"
  },
  {
    name: 'llama4:latest',
    type: "LLM"
  },
  {
    name: 'llama3:latest',
    type: "LLM"
  },
  {
    name: 'gemma3:latest',
    type: "LLM"
  },
  {
    name: 'qwq:latest',
    type: "LLM"
  },
  {
    name: 'mistral:latest',
    type: "LLM"
  },
  {
    name: 'GandalfBaum/deepseek_r1-claude3.7',
    type: "LLM"
  },
  {
    name: 'llama3.3:latest',
    type: "LLM"
  },
  {
    name: 'llama3.2:latest',
    type: "LLM"
  },
  {
    name: 'llama3.1:latest',
    type: "LLM"
  },
  {
    name: 'qwen2.5:latest',
    type: "LLM"
  }
  ,
  {
    name: 'qwen2.5-coder:latest',
    type: "LLM"
  }
  ,
  {
    name: 'gemma2:latest',
    type: "LLM"
  }
  ,
  {
    name: 'llama2:latest',
    type: "LLM"
  },
  {
    name: 'phi3:latest',
    type: "LLM"
  }
  ,
  {
    name: 'codellama:latest',
    type: "LLM"
  }

]

export const getUrls = async (baseUrl: string, manifestUrl: string) => {
      try {
        const response = await fetch(manifestUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch manifest data');
        }

        const manifestData = await response.json();

        const urls = {
          manifest: manifestUrl,
          config: baseUrl + manifestData.config.digest,
          layers: manifestData.layers.map((layer: any) => ({
            url: baseUrl + layer.digest,
            size: layer.size,
            mediaType: layer.mediaType,
            filename: layer.digest.replace(":", "-")
          })),
          configFilename: manifestData.config.digest.replace(":", "-")
        };

        return urls;
      } catch (error) {
        throw new Error(`Error fetching model data: ${error}`);
      }
    }


export const extractOllamaDownloadUrls = async (modelInput: string) : Promise<OllamaExtraction> => {
  // Convert input to model name and tag
  const inputSplit = modelInput.trim().split(':');
  if (inputSplit.length !== 2) {
    throw new Error('Invalid input format. Please use the format "model:tag"');
  }

  const modelName = inputSplit[0];
  const tag = inputSplit[1];
  const manifestUrl = `https://registry.ollama.ai/v2/library/${modelName}/manifests/${tag}`;
  const baseUrl = `https://registry.ollama.ai/v2/library/${modelName}/blobs/`;

 const urls = await getUrls(baseUrl, manifestUrl);

  return {
    modelName,
    tag,
    manifestUrl,
    baseUrl,
    ...urls
  };
}

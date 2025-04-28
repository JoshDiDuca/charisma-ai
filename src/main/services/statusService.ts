import { AppStatus } from "shared/types/AppStatus";
import { getChromaOnlineStatus } from "./chroma/chromaService";
import { getOllamaStatus } from "./ollama/ollamaService"
import { Module } from "shared/constants/modules";
import { getEligibleGpu } from "./gpuService";

export const getCurrentStatus = async () : Promise<AppStatus> => {
  const ollama = await getOllamaStatus();
  const chroma = await getChromaOnlineStatus();
  const gpu = await getEligibleGpu();

  return {
    [Module.ChromaDB]: chroma ? "Running" : "Stopped",
    [Module.Ollama]: ollama ? "Running" : "Stopped",
    [Module.GPU]: gpu ? "Running" : "Stopped",
    [Module.FileProcessing]: "Running"
  };
}

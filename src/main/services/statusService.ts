import { AppStatus } from "shared/types/AppStatus";
import { getOllamaStatus } from "./ollama/ollamaService"
import { Module } from "shared/constants/modules";
import { getEligibleGpu } from "./gpuService";

export const getCurrentStatus = async () : Promise<AppStatus> => {
  const ollama = await getOllamaStatus();
  const db = true;
  const gpu = await getEligibleGpu();

  return {
    [Module.Database]: db ? "Running" : "Stopped",
    [Module.Ollama]: ollama ? "Running" : "Stopped",
    [Module.GPU]: gpu ? "Running" : "Stopped",
    [Module.Conversations]: "Running",
    [Module.FileProcessing]: "Running"
  };
}

import axios from 'axios'
import { mainWindow } from 'main/windows/main'
import { Ollama, Tool } from 'ollama'
export const ollamaURL = process.env.OLLAMA_API_BASE || 'http://localhost:11434'
export const ollama = new Ollama({ host: ollamaURL })

export const getOllamaStatus = async (): Promise<boolean> => {
  const appStatus = await axios.get(ollamaURL)

  if (appStatus.data === 'Ollama is running') {
    return true
  }
  return false
}

export const getInstalledModels = async () => {
  const response = await ollama.list()
  return response.models.map((m) => m.name)
}

export const downloadModel = async (modelName: string) => {
  const installed = await ollama.list()
  if (installed.models.some((m) => m.name === modelName)) {
    return { status: 'already_installed' }
  }

  await ollama.pull({
    model: modelName,
    stream: true,
  })
}

export const sendMessage = async (
  message: string,
  model: string,
  tools: Tool[],
  systemMessage?: string
) => {
  try {
    const responseStream = await ollama.chat({
      model,
      messages: [
        ...(systemMessage ? [{ role: 'system', content: systemMessage }] : []),
        { role: 'user', content: message },
      ],
      stream: true,
      tools,
    })

    let fullResponse = ''
    for await (const chunk of responseStream) {
      fullResponse += chunk.message.content
      mainWindow?.webContents.send('stream-update', {
        partial: chunk.message.content,
        complete: false,
      })
    }

    return {
      status: 'complete',
      content: fullResponse,
    }
  } catch (error) {
    console.error('Chat error:', error)
    return {
      status: 'error',
      error: error,
    }
  }
}
export const getModelInfo = async (modelName: string) => {
  const response = await ollama.list()
  return response.models.find((m) => m.name === modelName)
}

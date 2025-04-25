// src/renderer/components/ModelManager.tsx (modified)
import { useEffect, useState } from 'react'

const { App } = window

export const ModelManager = () => {
  const [models, setModels] = useState<string[]>([])
  const [installedModels, setInstalledModels] = useState<string[]>([])
  const [progress, setProgress] = useState<{ [key: string]: number }>({})

  useEffect(() => {
    App.invoke('get-installed-models').then((r) => {
      console.log(r)
      setInstalledModels(r)
    })

    setModels([
      'llama3.1:8b',
      'starcoder2:15b',
      'deepseek-coder-v2:16b',
      'dolphin3:8b',
    ])

    const progressHandler = (
      _: any,
      { model, percentage }: { model: string; percentage: number }
    ) => {
      setProgress((prev) => ({ ...prev, [model]: percentage }))
    }

    App.on('download-progress', progressHandler)

    return () => {
      App.removeAllListeners('download-progress')
    }
  }, [])

  const handleInstall = async (model: string) => {
    try {
      const result = await App.invoke('download-model', model)
      if (result.status === 'already_installed') {
        alert(`${model} is already installed!`)
        return
      }
      setInstalledModels((prev) => [...prev, model])
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  return (
    <div>
      <h2>Available Models</h2>
      <div className="model-list">
        {models.map((model) => (
          <div key={model} className="model-item">
            <span>{model}</span>
            {installedModels.includes(model) ? (
              <button disabled>Installed</button>
            ) : (
              <button onClick={() => handleInstall(model)}>
                {progress[model] ? `${progress[model]}%` : 'Install'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

import { Badge, Button, Card, Select, SelectItem } from '@heroui/react'
import { useEffect, useState } from 'react'
import { Tree, TreeNode } from './FileTree'

const { App } = window


export interface SidebarProps {
  model: string;
  embeddingModel: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  setEmbeddingModel: React.Dispatch<React.SetStateAction<string>>;
}

export const Sidebar = ({ model, embeddingModel, setModel, setEmbeddingModel }:SidebarProps) => {
  const [status, setStatus] = useState<'Running' | 'Stopped' | 'Loading...'>(
    'Loading...'
  )
  const [filePath, setFilePath] = useState<string>('')
  const [files, setFiles] = useState<string[]>([])
  const [embeddingModels, setEmbeddingModels] = useState<{ name:string }[]>([])
  const [models, setModels] = useState<{ name:string }[]>([])

  const [treeData, setTreeData] = useState<TreeNode>()

  const handleSelectFolder = async () => {
    const folder = await App.invoke('select-folder')
    if (!folder) return

    setFilePath(folder)
    const fileList = await App.invoke('get-folder-files', folder)
    setTreeData(fileList)
  }

  const loadStatus = async () => {
    // Send message and receive stream
    const response: boolean = await App.invoke('get-llm-status')
    if (response) {
      setStatus('Running')
    } else {
      setStatus('Stopped')
    }
  }

  const loadEmbeddingModels = async () => {
    // Send message and receive stream
    const response: { name:string }[] = await App.invoke('get-all-embedding-models')
    if (response) {
      setEmbeddingModels(response);
    }
  }

  const loadModels = async () => {
    // Send message and receive stream
    const response: { name:string }[] = await App.invoke('get-all-models')
    if (response) {
      setModels(response);
    }
  }

  const downloadModel = async (model: string, type: 'LLM' | 'Embedding') => {
    await App.invoke('download-model', model)
    if(type === 'LLM') {
      setModel(model)
    } else {
      setEmbeddingModel(model)
    }
  }

  useEffect(() => {
    loadStatus()
    loadEmbeddingModels()
    loadModels()
  }, [])

  return (
    <Card className="p-4 w-120" style={{ width: '30rem' }}>
      <div className="flex flex-col gap-4 h-screen">
        <div className="flex flex-col gap-2">
          <div className="inline-flex">
            <img
              src="/logo.png"
              width={25}
              height={25}
              style={{ marginRight: '0.25rem' }}
            ></img>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                Status:{' '}
                <b style={{ color: status === 'Running' ? 'green' : 'red' }}>
                  {status.toWellFormed()}
                </b>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Model</label>
          <Select value={model} onChange={(e) => downloadModel(e.target.value, 'LLM')}>
            {models.map((model) => (
              <SelectItem key={model.name}>{model.name}</SelectItem>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Embedding Model</label>
          <Select value={embeddingModel} onChange={(e) => downloadModel(e.target.value, 'Embedding')}>
            {embeddingModels.map((model) => (
              <SelectItem key={model.name}>{model.name}</SelectItem>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Files:</label>
            <Button onClick={handleSelectFolder}>Select Folder</Button>
          </div>
          <Card className="p-2 h-500" style={{ height: "500px", overflowY: 'auto' }}>
            <div className="text-sm">
              {treeData &&
                <Tree node={treeData} onDelete={(_) => {}} />
              }
            </div>
          </Card>
        </div>
      </div>
    </Card>
  )
}

export default Sidebar

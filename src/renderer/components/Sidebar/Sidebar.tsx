import { Badge, Button, Card, Select, SelectItem } from '@heroui/react'
import { useState } from 'react'

const { App } = window

export const Sidebar = () => {
  const [status] = useState<'running' | 'stopped'>('running')
  const [model, setModel] = useState<string>('openchat')
  const [embeddingModel, setEmbeddingModel] =
    useState<string>('nomic-embed-text')
  const [filePath, setFilePath] = useState<string>('')
  const [files, setFiles] = useState<string[]>([])

  const handleSelectFolder = async () => {
    const folder = await App.invoke('select-folder')
    if (!folder) return

    setFilePath(folder)
    const fileList = await App.invoke('get-folder-files', folder)
    setFiles(fileList)
  }

  return (
    <Card className="p-4 w-120" style={{ width: '20rem' }}>
      <div className="flex flex-col gap-4 h-screen">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">AI Application</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Badge color={status === 'running' ? 'success' : 'danger'}>
              {status}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Model</label>
          <Select value={model}>
            <SelectItem key="openchat">openchat</SelectItem>
            <SelectItem key="llama3">llama3</SelectItem>
            <SelectItem key="gpt-4o">gpt-4o</SelectItem>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Embedding Model</label>
          <Select value={embeddingModel}>
            <SelectItem key="nomic-embed-text">nomic-embed-text</SelectItem>
            <SelectItem key="text-embedding-ada-002">
              text-embedding-ada-002
            </SelectItem>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Files:</label>
            <Button onClick={handleSelectFolder}>Select Folder</Button>
          </div>
          <Card className="p-2 h-40 overflow-hidden">
            <div className="text-sm">
              <ul className="mt-2 space-y-1">
                {files.map((file, idx) => (
                  <li key={idx} className="truncate">
                    {file}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        <Button className="w-full mt-auto">Embed files</Button>
      </div>
    </Card>
  )
}

export default Sidebar

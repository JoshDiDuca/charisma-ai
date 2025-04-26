import { Badge, Button, Card, Select, SelectItem } from '@heroui/react'
import { useEffect, useState } from 'react'
import { buildTreeStructure, Tree, TreeNode } from './FileTree'

const { App } = window

export const Sidebar = () => {
  const [status, setStatus] = useState<'Running' | 'Stopped' | 'Loading...'>(
    'Loading...'
  )
  const [model, setModel] = useState<string>('openchat')
  const [embeddingModel, setEmbeddingModel] =
    useState<string>('nomic-embed-text')
  const [filePath, setFilePath] = useState<string>('')
  const [files, setFiles] = useState<string[]>([])

  const [treeData, setTreeData] = useState<TreeNode[]>([])

  const handleSelectFolder = async () => {
    const folder = await App.invoke('select-folder')
    if (!folder) return

    setFilePath(folder)
    const fileList = await App.invoke('get-folder-files', folder)
    const tree = buildTreeStructure(fileList, folder)
    setTreeData(tree)
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

  useEffect(() => {
    loadStatus()
  }, [])

  return (
    <Card className="p-4 w-120" style={{ width: '20rem' }}>
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
          <Card className="p-2 h-auto overflow-hidden">
            <div className="text-sm">
              {treeData.map((node) => (
                <Tree key={node.path} node={node} onDelete={(_) => {}} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Card>
  )
}

export default Sidebar

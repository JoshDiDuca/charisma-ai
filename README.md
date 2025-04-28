# 🌟 Charisma Studio 🌟

**Ask questions about your local folders using local and remote LLMs with RAG-powered insights.**

Charisma Studio is a desktop client that transforms how you interact with local directories (codebases, research papers, projects) by combining LLMs like Ollama with Retrieval-Augmented Generation (RAG) and ChromaDB vector search. Select any folder, and get AI-powered context about its contents through an intuitive chat interface.

---

## 🚀 Features

### Core Capabilities

- **Local LLM Integration** - Direct connection to Ollama instances
- **RAG-Powered Insights** - ChromaDB vector search for precise context
- **Multi-Format Support** - Process code, text, Markdown, and PDFs
- **Real-Time Streaming** - Typewriter-style response delivery

### Developer Experience

- **Electron Packaging** - Cross-platform desktop app
- **TypeSafe Architecture** - Built with React + TypeScript

---

## 🛠 Technology Stack

| Component | Choice | Why? |
| :-- | :-- | :-- |
| **Frontend** | React + TypeScript | Type safety, component reuse |
| **Styling** | Tailwind CSS + Headless UI | Rapid UI development |
| **State** | Zustand | Lightweight global management |
| **LLM Core** | Ollama + ChromaDB | Local-first, privacy focused |
| **Packaging** | Electron + Vite | Cross-platform binaries |


---

## ⚙️ Installation

### Prerequisites Checklist

- [ ] Node.js 18+ ([download](https://nodejs.org/))
**Not Required**
- [ ] Ollama running locally ([setup guide](https://ollama.com/)) (or use the bundled version with project)
- [ ] ChromaDB installed (`pip install chromadb`) (or use the bundled version with the project)

```bash
# 1. Clone repository
git clone https://github.com/yourusername/charisma-studio.git
cd charisma-studio

# 2. Install dependencies
pnpm install

# 3. Start dev server
pnpm dev
```


---

## 🏁 Quick Start

```bash
# Pull a model (try different sizes)
ollama pull llama3:8b

# Launch studio with debug mode
DEBUG=true pnpm start
```

1. Click **Folder Select** and choose a codebase
2. Type questions like:
    - "Explain the main architecture"
    - "Find all TypeScript interfaces"
    - "What dependencies are we using?"

---

## 🛣 Roadmap

### Next Release (v0.5)

- [ ] Multi-model conversations
- [ ] Code modification suggestions
- [ ] Local storage for frequent queries


### Future Vision

- **AI Pair Programmer** - Refactor code via chat
- **Multi-Modal Analysis** - Images/PDFs support
- **Team Collaboration** - Shared session histories

---

## 🤝 Contributing

We welcome contributions! Please follow our [contribution guidelines](CONTRIBUTING.md) and:

1. Fork the repository
2. Create feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feat/amazing-feature`)
5. Open Pull Request

---

## 📜 License

MIT Licensed - See [LICENSE](LICENSE) for details.
*Ollama and ChromaDB have their own licenses - please review separately.*[^1][^4][^11]

<div style="text-align: center">⁂</div>

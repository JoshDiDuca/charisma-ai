# Charisma AI

**Ask questions about your local folders using local and remote Large Language Models.**

Charisma AI is a desktop client application designed to help you understand the contents of local folders (like codebases, research papers, project files, etc.) by leveraging the power of Large Language Models (LLMs). Connect to your local Ollama instance, select a folder, and start asking questions!

<!-- Add a compelling screenshot or GIF of the application in action -->
## Screenshot / Demo

![Screenshot Placeholder](placeholder.png) <!-- Replace placeholder.png with the actual path/URL -->
*(Add your screenshot here showing the main interface: folder selection, chat window, etc.)*

---

## Features

*   **Local LLM Integration:** Connects directly to a running Ollama instance on your machine.
*   **Folder Context:** Select any folder on your local filesystem to provide context for your questions.
*   **Intuitive Chat Interface:** Ask questions about the selected folder's content in a natural language chat interface.
*   **Cross-Platform:** Built with web technologies (React, TypeScript) aiming for cross-platform compatibility (potentially via Electron in the future).
*   **Extensible:** Planned support for additional local and remote LLM providers.

## Technology Stack

*   **Frontend:** React, TypeScript
*   **Styling:** Tailwind CSS (or specify your choice)
*   **State Management:** React Context API / Zustand (or specify your choice)
*   **LLM Backend (Initial):** Ollama

## Prerequisites

Before you begin, ensure you have the following installed and running:

1.  **Node.js and npm/yarn/pnpm:** [Download Node.js](https://nodejs.org/) (LTS version recommended).
2.  **Ollama:** Install Ollama from [ollama.com](https://ollama.com/).
3.  **Running Ollama Instance:** Make sure the Ollama application or service is running.
4.  **Ollama Model:** Pull at least one model using the Ollama CLI (e.g., `ollama pull llama3`). The application will need a model to communicate with.
5. **chromadb** Download and install chromadb

## Installation

1.  **Clone the repository:**
    ```
    git clone <your-repository-url>
    cd <your-repository-name>
    ```
2.  **Install dependencies:**
    ```
    pnpm install
    ```

## Running the Application

1.  **Ensure Ollama is running** locally with a model available.
2.  **Start the electron app:**
    ```
    pnpm start
    ```
## Usage Guide

## Publishing

1.  **Ensure Ollama is running** locally with a model available.
2.  **Start the electron app:**
    ```
    pnpm build
    ```
## Usage Guide

1.  Launch the application.
2.  Use the "Select Folder" button or designated area to choose the local directory you want to ask questions about.
3.  The application will process the folder content to provide context to the LLM (details depend on implementation - e.g., reading file contents, creating summaries, or embeddings).
4.  Type your questions about the folder's contents into the chat input and press Enter.
5.  The application will send your question along with the folder context to your configured Ollama instance and display the response.

## ToDo / Planned Features

*   **LLM Provider Expansion:**
    *   [ ] Support for remote APIs (OpenAI, Anthropic, Gemini) with API key management.
    *   [ ] Integration with other local LLM servers (e.g., LM Studio, Jan).
    *   [ ] UI for selecting the desired LLM provider and model.
*   **Context Management:**
    *   [ ] Implement robust context window management (chunking, sliding window).
    *   [ ] Explore Retrieval-Augmented Generation (RAG) using embeddings (e.g., Ollama embeddings, Sentence Transformers) for more accurate answers on large folders.
    *   [ ] Allow filtering by file type (e.g., only include `.ts`, `.py` files).
*   **UI/UX Improvements:**
    *   [ ] Loading indicators while processing folders and waiting for LLM responses.
    *   [ ] Better error handling and display (e.g., Ollama connection issues, model not found).
    *   [ ] Streaming responses from the LLM.
    *   [ ] Chat history persistence (session or local storage).
    *   [ ] Copy code snippets from responses.
    *   [ ] Syntax highlighting for code in responses.
    *   [ ] Progress indicator for initial folder processing/indexing.
*   **Core Functionality:**
    *   [ ] Allow specifying *which* Ollama model to use (if multiple are available).
    *   [ ] Background processing/indexing for large folders.
*   **Packaging:**
    *   [x] Package as a standalone desktop application using Electron.

## Future Vision

Looking further ahead, Charisma AI could evolve into a more powerful developer and knowledge worker tool:

*   **Advanced RAG:** Implement more sophisticated RAG techniques (re-ranking, query transformation) for highly accurate, context-aware responses.
*   **Multi-Modal Support:** Allow asking questions about images, diagrams, or other non-text files within the folder (requires multi-modal LLMs).
*   **Code Generation & Modification:** Enable the LLM to suggest code changes, generate boilerplate, or refactor code based on the folder context.
*   **Deeper IDE Integration:** Develop plugins for IDEs like VS Code to provide contextual insights directly within the coding environment.
*   **Cross-Platform Native:** Explore building fully native versions for optimal performance and system integration.
*   **Collaboration:** Allow sharing sessions or insights derived from a folder context (with appropriate privacy controls).
*   **Plugin System:** Allow third-party developers to extend functionality (e.g., custom data loaders, specific domain knowledge injectors).

## Contributing

Contributions are welcome! Please follow standard GitHub practices: fork the repository, create a feature branch, and submit a pull request. For major changes, please open an issue first to discuss what you would like to change.

*(Add more specific contribution guidelines if you have them)*

## License

This project is licensed under the [MIT License](LICENSE).

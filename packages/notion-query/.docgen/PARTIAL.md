The Notion Query MCP server provides a comprehensive suite of tools for interacting with a Notion workspace. It enables AI models to read, search, create, and update Notion pages and databases programmatically.

At its core, the package features a powerful local synchronization and search system. It continuously downloads content from the Notion workspace, converts it to a clean Markdown format, and indexes it in a local Retrieval-Augmented Generation (RAG) vector store. This architecture allows for incredibly fast and accurate semantic search across all your Notion documents.

### Key Features

- **Comprehensive Notion Integration**: Provides a full set of tools to `create`, `fetch`, `query`, `update`, and `search` for content within Notion.
- **Local RAG-based Search**: Utilizes a local vector store for fast, offline-capable semantic search across the entire workspace, independent of Notion's own search capabilities.
- **Robust Synchronization**: A throttled, queue-based background process keeps the local content cache up-to-date with changes in Notion, ensuring search results are fresh.
- **Rich Markdown Conversion**: Converts Notion's complex block structure into a clean, model-friendly Markdown format, preserving formatting like headings, lists, and colors.
- **Database and Page Manipulation**: Supports advanced operations such as querying database views with filters and sorts, creating new pages with structured properties, and performing granular content updates.
- **Dynamic Discovery**: Automatically discovers and indexes new pages linked within existing synchronized content.

### Windows Setup Requirement

The **Local RAG-based Search** feature relies on the `@huggingface/transformers` library, which uses native code (ONNX Runtime) for high-performance machine learning operations.

To ensure this works correctly on Windows, users **must** install the **Microsoft Visual C++ Redistributable**. Failure to do so will result in a `DLL initialization routine failed` error when the application starts.

- **Download Link**: [Latest supported Visual C++ Redistributable downloads](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist)
- **File to Install**: Under the "Visual Studio 2015, 2017, 2019, and 2022" section, download and run `vc_redist.x64.exe`.
- A system restart is recommended after installation.

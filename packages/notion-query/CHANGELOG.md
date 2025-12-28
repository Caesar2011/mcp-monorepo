# @mcp-monorepo/notion-query

## 1.3.0

### Minor Changes

- 35ada47: add update-page tool and implement property update parsing; rename create-pages tool
- 926640a: introduce local RAG module with LanceDB vector store, worker-based HF embeddings, file/folder/url ingestion, hybrid search, directory watcher, and demo script
- 9b62729: add Notion syncer and semantic search, integrate LocalRAG and trigger immediate sync in tools

### Patch Changes

- 67961fe: enforce immutable yarn install in release workflow, keep yarn.lock, remove why-is-node-running dev dependency
- a66e4e2: move demo to local-rag/DEMO.ts and update import path and run instructions
- fd2f271: serialize write operations via ThrottledExecutor to prevent concurrent vector store mutations and await idle on shutdown
- 67961fe: enforce immutable yarn install in release workflow, keep yarn.lock, remove why-is-node-running dev dependency
- Updated dependencies [7929a55]
- Updated dependencies [5358942]
- Updated dependencies [41b64e4]
  - @mcp-monorepo/shared@1.1.0

## 1.2.0

### Minor Changes

- b49ff85: add notion create-pages tool with markdown content, register in server, enhance property parsing
- 85cfbe7: rename tool to query-datasource, switch to Notion client dataSources.query, add page parser to simplify results, update input/output schemas
- b9b5064: add fetch tool to retrieve notion pages/databases and format responses to markdown; introduce client singleton and id normalization; register tool in server and update dependencies

### Patch Changes

- 75e8973: migrate monorepo to yarn 4, update CI/husky/scripts and run-on-changed, add yarnrc and packageManager, switch internal deps to workspace:\* and simplify bin fields
- Updated dependencies [b4338ec]
- Updated dependencies [75e8973]
  - @mcp-monorepo/shared@1.0.2

## 1.1.0

### Minor Changes

- ecbc935: rename CLI binaries from mcp-npm-server to scoped package names across packages

### Patch Changes

- c92118c: use repeated filter_properties query params instead of comma-separated single param

## 1.0.1

### Patch Changes

- 78096b0: Fixed any schema in notion-query
- 6c2d9c6: Fixed filter_properties of notion-query

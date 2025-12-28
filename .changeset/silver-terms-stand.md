---
'@mcp-monorepo/notion-query': patch
---

serialize write operations via ThrottledExecutor to prevent concurrent vector store mutations and await idle on shutdown

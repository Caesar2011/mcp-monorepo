# @mcp-monorepo/notion-query

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

# @mcp-monorepo/ics

## 1.5.0

### Minor Changes

- 54413fe: add support for Windows timezone identifiers

## 1.4.0

### Minor Changes

- 7f6ee0a: generate READMEs for packages via MCP introspection, add docgen and scripts, bump zod to v4 with schema fixes, improve syslog/logger graceful shutdown
- 2c227d5: added proper README files for all packages
- 690e3aa: add TOOL_ADVISORY_ONLY mode to skip tool execution and onReady hooks

### Patch Changes

- 2c227d5: added proper README files for all packages
- 2c227d5: added proper README files for all packages
- Updated dependencies [7f6ee0a]
- Updated dependencies [2c227d5]
- Updated dependencies [2c227d5]
- Updated dependencies [690e3aa]
- Updated dependencies [2c227d5]
  - @mcp-monorepo/shared@1.2.0

## 1.3.3

### Patch Changes

- fd22b00: Fixed yarn versioning during publish
- Updated dependencies [fd22b00]
  - @mcp-monorepo/shared@1.1.1

## 1.3.2

### Patch Changes

- Updated dependencies [7929a55]
- Updated dependencies [5358942]
- Updated dependencies [41b64e4]
  - @mcp-monorepo/shared@1.1.0

## 1.3.1

### Patch Changes

- 75e8973: migrate monorepo to yarn 4, update CI/husky/scripts and run-on-changed, add yarnrc and packageManager, switch internal deps to workspace:\* and simplify bin fields
- Updated dependencies [b4338ec]
- Updated dependencies [75e8973]
  - @mcp-monorepo/shared@1.0.2

## 1.3.0

### Minor Changes

- 435af78: introduce ICS parser with timezone and recurrence, replace legacy event-store with prepared cache, update tools and tests

### Patch Changes

- Updated dependencies [63e57bb]
  - @mcp-monorepo/shared@1.0.1

## 1.2.0

### Minor Changes

- 5f142de: add timeZone support to formatDate, handle exdate and cancelled recurrences, and replace rawEvents with getRawEvents singleton

## 1.1.0

### Minor Changes

- ecbc935: rename CLI binaries from mcp-npm-server to scoped package names across packages

## 1.0.1

### Patch Changes

- 4fc8556: Fixed ics cache

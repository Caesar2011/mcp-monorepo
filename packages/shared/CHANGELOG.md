# @mcp-monorepo/shared

## 1.1.0

### Minor Changes

- 7929a55: add close methods to syslog client and transport to close UDP socket and prevent resource leaks
- 5358942: add ThrottledExecutor for rate-limited sequential tasks and harden syslog encode/decode with tokenized escaping; fix project root resolution and simplify transport error logging
- 41b64e4: add close methods to syslog client and transport to close UDP socket and prevent resource leaks

## 1.0.2

### Patch Changes

- b4338ec: map warn to logger.warning
- 75e8973: migrate monorepo to yarn 4, update CI/husky/scripts and run-on-changed, add yarnrc and packageManager, switch internal deps to workspace:\* and simplify bin fields

## 1.0.1

### Patch Changes

- 63e57bb: log Error instances with stack or message in syslog client

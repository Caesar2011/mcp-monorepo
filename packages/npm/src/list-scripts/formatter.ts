export function formatScriptsList(scripts: Record<string, string>): string {
  if (!scripts || Object.keys(scripts).length === 0) {
    return 'No npm scripts found in package.json'
  }
  const lines = Object.entries(scripts).map(([name, cmd]) => `• ${name}: ${cmd}`)
  return `Available npm scripts:\n\n${lines.join('\n')}`
}

export function formatError(error: string): string {
  return `Error reading package.json: ${error}`
}

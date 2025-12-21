/**
 * Splits a command string into an array of arguments,
 * handling single quotes, double quotes, and escaped characters.
 *
 * @param commandString The input command string.
 * @returns An array of strings, where each string is an argument.
 */
export function splitCommandArgs(commandString: string): string[] {
  const args: string[] = []
  let currentArg: string = ''
  let inSingleQuote: boolean = false
  let inDoubleQuote: boolean = false
  let escaped: boolean = false

  for (let i = 0; i < commandString.length; i++) {
    const char = commandString[i]

    if (escaped) {
      currentArg += char
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === "'") {
      if (!inDoubleQuote) {
        // Single quotes aren't special inside double quotes
        inSingleQuote = !inSingleQuote
        // Don't add the quote character to the argument
        continue
      }
    }

    if (char === '"') {
      if (!inSingleQuote) {
        // Double quotes aren't special inside single quotes
        inDoubleQuote = !inDoubleQuote
        // Don't add the quote character to the argument
        continue
      }
    }

    if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
      // End of an argument if outside quotes and currentArg has content
      if (currentArg !== '') {
        args.push(currentArg)
        currentArg = ''
      }
      continue
    }

    currentArg += char
  }

  // Add the last argument if it exists
  if (currentArg !== '') {
    args.push(currentArg)
  }

  return args
}

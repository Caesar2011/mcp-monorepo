/**
 * Finds the n-th last line break before the specified position in the input string.
 *
 * @param input - The input string to search within.
 * @param position - The position in the string to search before.
 * @param n - Number of line breaks.
 * @returns The index of the n-th last line break before the position, or undefined if not found.
 */
export function getNthLastLineBreakBeforePosition(input: string, position: number, n: number): number | undefined {
  const regex = new RegExp(`(?:\\n[^\\n]*?){${n - 1}}\\n(?=[^\\n]*$)`)
  const substring = input.slice(0, position)
  const match = substring.match(regex)

  if (match) {
    return match.index ?? undefined
  }

  return undefined
}

/**
 * Finds the n-th next line break after the specified position in the input string.
 *
 * @param input - The input string to search within.
 * @param position - The position in the string to search after.
 * @param n - Number of line breaks.
 * @returns The index of the n-th next line break after the position, or undefined if not found.
 */
export function getNthNextLineBreakAfterPosition(input: string, position: number, n: number): number | undefined {
  const substring = input.slice(position)
  const regex = new RegExp(`(?:[^\\n]*\\n){${n}}`)
  const match = substring.match(regex)

  if (match) {
    const nthNextLineBreakIndex = match[0].length
    if (nthNextLineBreakIndex === 0) return 0
    return position + nthNextLineBreakIndex - 1
  }

  return undefined
}

/**
 * Determines the line number at the specified position in the input string.
 *
 * @param input - The input string to analyze.
 * @param position - The position in the string to determine the line number for.
 * @returns The 1-based line number at the specified position.
 * @throws If the position is out of bounds of the input string.
 */
export function getLineNumberAtPosition(input: string, position: number): number {
  if (position < 0 || position > input.length) {
    throw new Error('Position is out of bounds')
  }

  const substring = input.slice(0, position)
  const lineBreakCount = (substring.match(/\n/g) || []).length

  return lineBreakCount + 1
}

/**
 * Converts a 1-based line number to a position index in the file content.
 *
 * @param fileContent - The content of the file.
 * @param lineNumber - The 1-based line number to convert.
 * @returns The position index of the start of the specified line, or undefined if the line does not exist.
 */
export function getPositionForLineNumber(fileContent: string, lineNumber: number): number | undefined {
  const position = getNthNextLineBreakAfterPosition(fileContent, 0, lineNumber - 1)
  const offset = lineNumber === 1 ? 0 : 1
  return position === undefined || fileContent.length <= position ? undefined : position + offset
}

/**
 * Extracts the substring from two line breaks before and after the given position,
 * and prepends each line with line numbers, linebreaks, and "|".
 *
 * @param input - The input string to process.
 * @param startPos - The start position in the string to center the extraction around.
 * @param endPos - The end position in the string to center the extraction around.
 * @returns The formatted substring with line numbers, linebreaks, and "|" prepended to each line.
 */
export function getFormattedSubstring(input: string, startPos: number, endPos: number): string {
  let start = getNthLastLineBreakBeforePosition(input, startPos, 2)
  start = start === undefined ? 0 : start + 1
  let end = getNthNextLineBreakAfterPosition(input, endPos, 2)
  end = end === undefined ? input.length : end

  const substring = input.slice(start, end)
  const startLineNumber = getLineNumberAtPosition(input, start)

  if (substring === '') {
    return ''
  }

  return substring
    .split('\n')
    .map((line, index) => `${startLineNumber + index} | ${line}`)
    .join('\n')
}

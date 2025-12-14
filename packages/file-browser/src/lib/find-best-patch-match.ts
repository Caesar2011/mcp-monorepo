import {
  getNthLastLineBreakBeforePosition,
  getNthNextLineBreakAfterPosition,
  getPositionForLineNumber,
} from './finder.js'

type PatchMatchResult = { maxOverlap: number; bestMatchPos: number }
type PatchPositionResult = { patchStartPos: PatchMatchResult | undefined; patchEndPos: PatchMatchResult | undefined }

/**
 * Finds the longest match for a patch substring using binary search.
 *
 * @param fileContent - The content of the file to search within.
 * @param patch - The patch substring to search for.
 * @param approxLine - The approximate line number to center the search around.
 * @param isStart - Whether to search for the start or end of the patch.
 * @param radius - The number of lines to search around the approximate line.
 * @returns The position of the longest match, or undefined if not found.
 */
export function findLongestMatch(
  fileContent: string,
  patch: string,
  approxLine: number,
  isStart: boolean,
  radius: number,
): PatchMatchResult | undefined {
  // Calculate the search range using line-based helper methods
  const approxPos = getPositionForLineNumber(fileContent, approxLine)
  if (approxPos === undefined) return undefined

  const startSearchPos = getNthLastLineBreakBeforePosition(fileContent, approxPos, radius) ?? 0
  const endSearchPos = getNthNextLineBreakAfterPosition(fileContent, approxPos, radius) ?? fileContent.length
  const targetSegment = fileContent.slice(startSearchPos, endSearchPos)

  // Binary search for the longest match
  let low = 1 // Minimum overlap length
  let isFirstStage = true
  let high: number = Math.min(10, patch.length)
  let bestMatchPos: number | undefined = undefined

  while (low <= high) {
    const mid: number = isFirstStage ? high : Math.floor((low + high) / 2)
    const substring = isStart ? patch.slice(0, mid) : patch.slice(-mid)

    const regex = new RegExp(substring.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    const match = targetSegment.match(regex)

    if (match) {
      // Match found, try for a longer overlap
      if (isFirstStage) {
        high *= 2
        if (high >= patch.length) {
          high = patch.length
          isFirstStage = false
        }
      } else {
        low = mid + 1
      }
      bestMatchPos = fileContent.indexOf(match[0], startSearchPos)
      bestMatchPos = isStart ? bestMatchPos : bestMatchPos + match[0].length
    } else {
      // No match, try for a shorter overlap
      if (isFirstStage) {
        isFirstStage = false
      } else {
        high = mid - 1
      }
    }
  }

  return bestMatchPos !== undefined ? { maxOverlap: high, bestMatchPos } : undefined
}

/**
 * Finds the start and end positions of a patch in the file content.
 *
 * @param fileContent - The content of the file to search within.
 * @param patch - The patch substring to locate.
 * @param approxStartLine - The approximate line number where the patch starts.
 * @param approxEndLine - The approximate line number where the patch ends.
 * @returns The start and end positions of the patch in the file content.
 */
export function findPatchPositions(
  fileContent: string,
  patch: string,
  approxStartLine: number,
  approxEndLine: number,
): PatchPositionResult {
  const searchRadius = 10 // Number of lines to search around the approximate position

  // Find the start position of the patch
  const patchStartPos = findLongestMatch(fileContent, patch, approxStartLine, true, searchRadius)

  // Find the end position of the patch
  const patchEndPos = findLongestMatch(fileContent, patch, approxEndLine, false, searchRadius)

  return { patchStartPos, patchEndPos }
}

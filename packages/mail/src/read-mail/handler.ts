// Callback for read-mail tool (minimal logic)
import { formatReadMailResponse, formatReadMailError } from './formatter.js'
import { readMailContents } from './helper.js'
import { type ReadMailParams } from './types.js'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const toolHandler = async (params: ReadMailParams): Promise<CallToolResult> => {
  try {
    const resultList = await readMailContents(params)
    return formatReadMailResponse(resultList)
  } catch (err) {
    return formatReadMailError(err)
  }
}

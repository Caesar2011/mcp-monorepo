import { formatScriptsList, formatError } from './formatter.js'
import { getScriptsOrError } from './helper.js'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const toolHandler = async ({ workspace }: { workspace?: string | undefined }): Promise<CallToolResult> => {
  try {
    const scriptsOrError = await getScriptsOrError(workspace)
    if ('error' in scriptsOrError) {
      return {
        content: [
          {
            type: 'text',
            text: formatError(scriptsOrError.error),
            _meta: {
              stderr: scriptsOrError.error,
              exitCode: 1,
            },
          },
        ],
      }
    }
    return {
      content: [{ type: 'text', text: formatScriptsList(scriptsOrError.scripts) }],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      content: [
        {
          type: 'text',
          text: formatError(message),
          _meta: {
            stderr: message,
            exitCode: 1,
          },
        },
      ],
    }
  }
}

import { Client } from '@notionhq/client'

let notionClient: Client | undefined

/**
 * Initializes and returns a singleton instance of the Notion SDK Client.
 * It retrieves the NOTION_API_KEY from the environment variables.
 * @throws {Error} If the NOTION_API_KEY environment variable is not set.
 * @returns {Client} The initialized Notion client.
 */
export function getNotionClient(): Client {
  if (!notionClient) {
    const NOTION_API_KEY = process.env.NOTION_API_KEY
    if (!NOTION_API_KEY) {
      throw new Error('NOTION_API_KEY environment variable is not set.')
    }
    notionClient = new Client({ auth: NOTION_API_KEY })
  }
  return notionClient
}

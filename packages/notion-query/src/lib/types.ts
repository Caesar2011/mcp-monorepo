import { type NotionSyncer } from './notion-syncer.js'
import { type LocalRAG } from '../local-rag/index.js'

export type ToolServices = {
  notionSyncer?: NotionSyncer
  localRag?: LocalRAG
}

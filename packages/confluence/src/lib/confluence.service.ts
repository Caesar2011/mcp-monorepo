/**
 * Unified Confluence service layer abstracting v1/v2 API differences
 */

import { adfToMd, mdToAdf } from './adf-utils.js'
import { getConfluenceApiVersion, getConfluenceBaseUrl } from './confluence-env.js'
import { buildApiPath, requestConfluence } from './request.js'
import { getSpaceIdByKey, getSpaceKeyById, setSpaceMapping } from './space-cache.js'

import type {
  ConfluencePage,
  ConfluenceSpace,
  ConfluenceV2Page,
  ConfluenceV2PagedResponse,
  ConfluenceV2Space,
  PagedResult,
} from './types.js'

// ========================================
// Public API Functions
// ========================================

/**
 * Get a single page by ID
 */
export async function getPage(pageId: string): Promise<ConfluencePage> {
  const version = getConfluenceApiVersion()

  if (version === '2') {
    const response = await requestConfluence<ConfluenceV2Page>({
      endpoint: buildApiPath(`pages/${pageId}`),
      queryParams: { 'body-format': 'atlas_doc_format' },
    })
    return normalizeV2Page(response)
  } else {
    // v1
    interface V1PageResponse {
      id: string
      title: string
      type: string
      space: { key: string }
      body?: { storage?: { value: string } }
      version: { number: number }
      history?: { createdDate?: string; lastUpdated?: { when?: string } }
      _links: { webui: string }
    }

    const response = await requestConfluence<V1PageResponse>({
      endpoint: buildApiPath(`content/${pageId}`),
      queryParams: { expand: 'body.storage,version,space,history' },
    })
    return normalizeV1Page(response)
  }
}

/**
 * Create a new page
 */
export async function createPage(params: {
  spaceKey: string
  title: string
  content: string
  parentId?: string
}): Promise<ConfluencePage> {
  const version = getConfluenceApiVersion()

  if (version === '2') {
    const spaceId = await getSpaceIdByKey(params.spaceKey)
    const adf = mdToAdf(params.content)

    if (!adf) {
      throw new Error('Failed to convert Markdown to ADF')
    }

    const body = {
      spaceId,
      status: 'current',
      title: params.title,
      parentId: params.parentId,
      body: {
        representation: 'atlas_doc_format' as const,
        value: adf,
      },
    }

    const response = await requestConfluence<ConfluenceV2Page>({
      endpoint: buildApiPath('pages'),
      method: 'POST',
      body,
    })

    return normalizeV2Page(response)
  } else {
    // v1
    interface V1CreatePageRequest {
      type: string
      title: string
      space: { key: string }
      body: { storage: { value: string; representation: string } }
      ancestors?: Array<{ id: string }>
    }

    interface V1PageResponse {
      id: string
      title: string
      type: string
      space: { key: string }
      body?: { storage?: { value: string } }
      version: { number: number }
      history?: { createdDate?: string }
      _links: { webui: string }
    }

    const body: V1CreatePageRequest = {
      type: 'page',
      title: params.title,
      space: { key: params.spaceKey },
      body: {
        storage: {
          value: params.content,
          representation: 'storage',
        },
      },
    }

    if (params.parentId) {
      body.ancestors = [{ id: params.parentId }]
    }

    const response = await requestConfluence<V1PageResponse>({
      endpoint: buildApiPath('content'),
      method: 'POST',
      body,
    })

    return normalizeV1Page(response)
  }
}

/**
 * Update an existing page
 */
export async function updatePage(
  pageId: string,
  params: {
    title: string
    content: string
    version: number
  },
): Promise<ConfluencePage> {
  const apiVersion = getConfluenceApiVersion()

  if (apiVersion === '2') {
    const adf = mdToAdf(params.content)

    if (!adf) {
      throw new Error('Failed to convert Markdown to ADF')
    }

    const body = {
      id: pageId,
      status: 'current',
      title: params.title,
      body: {
        representation: 'atlas_doc_format' as const,
        value: adf,
      },
      version: {
        number: params.version + 1,
        message: `Updated via MCP`,
      },
    }

    const response = await requestConfluence<ConfluenceV2Page>({
      endpoint: buildApiPath(`pages/${pageId}`),
      method: 'PUT',
      body,
    })

    return normalizeV2Page(response)
  } else {
    // v1
    interface V1UpdatePageRequest {
      version: { number: number }
      title: string
      type: string
      body: { storage: { value: string; representation: string } }
    }

    interface V1PageResponse {
      id: string
      title: string
      type: string
      space: { key: string }
      body?: { storage?: { value: string } }
      version: { number: number }
      history?: { lastUpdated?: { when?: string } }
      _links: { webui: string }
    }

    const body: V1UpdatePageRequest = {
      version: { number: params.version + 1 },
      title: params.title,
      type: 'page',
      body: {
        storage: {
          value: params.content,
          representation: 'storage',
        },
      },
    }

    const response = await requestConfluence<V1PageResponse>({
      endpoint: buildApiPath(`content/${pageId}`),
      method: 'PUT',
      body,
    })

    return normalizeV1Page(response)
  }
}

/**
 * List pages in a space with pagination
 */
export async function listPagesInSpace(
  spaceKey: string,
  options?: {
    cursor?: string
    start?: number
    limit?: number
  },
): Promise<PagedResult<ConfluencePage>> {
  const version = getConfluenceApiVersion()
  const limit = options?.limit ?? 50

  if (version === '2') {
    const spaceId = await getSpaceIdByKey(spaceKey)
    const queryParams: Record<string, string | number> = {
      limit,
      'body-format': 'atlas_doc_format',
    }

    if (options?.cursor) {
      queryParams.cursor = options.cursor
    }

    const response = await requestConfluence<ConfluenceV2PagedResponse<ConfluenceV2Page>>({
      endpoint: buildApiPath(`spaces/${spaceId}/pages`),
      queryParams,
    })

    const nextCursor = response._links.next ? extractCursorFromUrl(response._links.next) : undefined

    return {
      results: await Promise.all(response.results.map(normalizeV2Page)),
      nextCursor,
      hasMore: !!response._links.next,
    }
  } else {
    // v1
    interface V1PageListItem {
      id: string
      title: string
      type: string
      space: { key: string }
      version: { number: number }
      _links: { webui: string }
    }

    const start = options?.start ?? 0
    const response = await requestConfluence<{
      results: V1PageListItem[]
      start: number
      limit: number
      size: number
      _links: { self: string; next?: string; base: string }
    }>({
      endpoint: buildApiPath('content'),
      queryParams: {
        spaceKey,
        type: 'page',
        start,
        limit,
        expand: 'version,space',
      },
    })

    const hasMore = response.start + response.size < response.size
    const nextStart = hasMore ? response.start + response.size : undefined

    return {
      results: response.results.map((page) => ({
        id: String(page.id),
        title: page.title,
        spaceKey: page.space.key,
        webUrl: `${getConfluenceBaseUrl()}${page._links.webui}`,
        version: page.version.number,
      })),
      nextStart,
      hasMore,
    }
  }
}

/**
 * List all spaces with pagination
 */
export async function listSpaces(options?: {
  cursor?: string
  start?: number
  limit?: number
}): Promise<PagedResult<ConfluenceSpace>> {
  const version = getConfluenceApiVersion()
  const limit = options?.limit ?? 50

  if (version === '2') {
    const queryParams: Record<string, string | number> = { limit }

    if (options?.cursor) {
      queryParams.cursor = options.cursor
    }

    const response = await requestConfluence<ConfluenceV2PagedResponse<ConfluenceV2Space>>({
      endpoint: buildApiPath('spaces'),
      queryParams,
    })

    // Cache spaceKey ↔ spaceId mappings
    response.results.forEach((space) => {
      setSpaceMapping(space.key, space.id)
    })

    const nextCursor = response._links.next ? extractCursorFromUrl(response._links.next) : undefined

    return {
      results: response.results.map(normalizeV2Space),
      nextCursor,
      hasMore: !!response._links.next,
    }
  } else {
    // v1
    interface V1Space {
      id: number | string
      key: string
      name: string
      type: string
      _links: { webui: string }
    }

    const start = options?.start ?? 0
    const response = await requestConfluence<{
      results: V1Space[]
      start: number
      limit: number
      size: number
      _links: { self: string; next?: string; base: string }
    }>({
      endpoint: buildApiPath('space'),
      queryParams: {
        start,
        limit,
      },
    })

    // Cache spaceKey ↔ spaceId mappings
    response.results.forEach((space) => {
      setSpaceMapping(space.key, String(space.id))
    })

    const hasMore = response.start + response.size < response.size
    const nextStart = hasMore ? response.start + response.size : undefined

    return {
      results: response.results.map((space) => ({
        id: String(space.id),
        key: space.key,
        name: space.name,
        type: space.type,
        webUrl: `${getConfluenceBaseUrl()}${space._links.webui}`,
      })),
      nextStart,
      hasMore,
    }
  }
}

/**
 * Search pages by title (v2 only)
 */
export async function searchPages(
  query: string,
  options?: {
    cursor?: string
    limit?: number
  },
): Promise<PagedResult<ConfluencePage>> {
  const version = getConfluenceApiVersion()

  if (version !== '2') {
    throw new Error('searchPages is only available in API v2. Use search-cql tool for v1.')
  }

  const limit = options?.limit ?? 50
  const queryParams: Record<string, string | number> = {
    title: query,
    limit,
    'body-format': 'atlas_doc_format',
  }

  if (options?.cursor) {
    queryParams.cursor = options.cursor
  }

  const response = await requestConfluence<ConfluenceV2PagedResponse<ConfluenceV2Page>>({
    endpoint: buildApiPath('pages'),
    queryParams,
  })

  const nextCursor = response._links.next ? extractCursorFromUrl(response._links.next) : undefined

  return {
    results: await Promise.all(response.results.map(normalizeV2Page)),
    nextCursor,
    hasMore: !!response._links.next,
  }
}

// ========================================
// Normalization Helpers
// ========================================

function normalizeV1Page(v1Page: {
  id: string
  title: string
  space: { key: string }
  body?: { storage?: { value: string } }
  version: { number: number }
  history?: { createdDate?: string; lastUpdated?: { when?: string } }
  _links: { webui: string }
}): ConfluencePage {
  return {
    id: v1Page.id,
    title: v1Page.title,
    spaceKey: v1Page.space.key,
    webUrl: `${getConfluenceBaseUrl()}${v1Page._links.webui}`,
    content: v1Page.body?.storage?.value,
    version: v1Page.version.number,
    createdAt: v1Page.history?.createdDate,
    updatedAt: v1Page.history?.lastUpdated?.when,
  }
}

async function normalizeV2Page(v2Page: ConfluenceV2Page): Promise<ConfluencePage> {
  // Resolve spaceId → spaceKey (from cache or fetch)
  const spaceKey = getSpaceKeyById(v2Page.spaceId)

  // Convert ADF to Markdown
  const content = v2Page.body?.atlas_doc_format
    ? adfToMd(v2Page.body.atlas_doc_format.value)
    : v2Page.body?.storage?.value

  return {
    id: v2Page.id,
    title: v2Page.title,
    spaceKey: spaceKey || v2Page.spaceId, // Fallback to ID if key not in cache
    parentId: v2Page.parentId,
    webUrl: `${getConfluenceBaseUrl()}${v2Page._links.webui}`,
    content,
    version: v2Page.version.number,
    createdAt: v2Page.createdAt,
    updatedAt: v2Page.version.createdAt,
  }
}

function normalizeV2Space(v2Space: ConfluenceV2Space): ConfluenceSpace {
  return {
    id: v2Space.id,
    key: v2Space.key,
    name: v2Space.name,
    type: v2Space.type,
    webUrl: `${getConfluenceBaseUrl()}${v2Space._links.webui}`,
  }
}

/**
 * Extract cursor from pagination URL
 */
function extractCursorFromUrl(url: string): string | undefined {
  try {
    const urlObj = new URL(url, 'https://placeholder.com') // Base needed for relative URLs
    return urlObj.searchParams.get('cursor') ?? undefined
  } catch {
    return undefined
  }
}

import { trpc } from './trpc'
import { content as fallback } from '../content'
import type { SiteContent } from '../types'

export function pickContent(
  data: { siteContent: SiteContent } | undefined,
  fb: SiteContent,
): SiteContent {
  return data?.siteContent ?? fb
}

export function useContent(): SiteContent {
  const query = trpc.content.get.useQuery(undefined, {
    placeholderData: { siteContent: fallback },
    staleTime: 60_000,
    retry: false,
  })
  return pickContent(query.data, fallback)
}

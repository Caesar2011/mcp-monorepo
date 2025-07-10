import { isAbsolute, normalize, relative } from 'path'

export function isSubPath(parent: string, possibleChild: string): boolean {
  const normParent = normalize(parent)
  const normChild = normalize(possibleChild)
  const rel = relative(normParent, normChild) as string | undefined
  return !rel || (!rel.startsWith('..') && !isAbsolute(rel))
}

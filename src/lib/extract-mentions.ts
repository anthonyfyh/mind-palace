type TiptapNode = {
  type: string
  attrs?: { id?: string; label?: string }
  content?: TiptapNode[]
}

export function extractMentionIds(doc: unknown): string[] {
  try {
    const ids: string[] = []

    function walk(node: TiptapNode) {
      if (node.type === 'mention' && node.attrs?.id) {
        ids.push(node.attrs.id)
      }
      node.content?.forEach(walk)
    }

    if (doc && typeof doc === 'object' && 'type' in (doc as object)) {
      walk(doc as TiptapNode)
    }

    return [...new Set(ids)]
  } catch {
    return []
  }
}

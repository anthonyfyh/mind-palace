type TiptapNode = {
  type: string
  attrs?: { id?: string; label?: string }
  content?: TiptapNode[]
}

export function extractMentionIds(doc: TiptapNode): string[] {
  const ids: string[] = []

  function walk(node: TiptapNode) {
    if (node.type === 'mention' && node.attrs?.id) {
      ids.push(node.attrs.id)
    }
    node.content?.forEach(walk)
  }

  walk(doc)
  return [...new Set(ids)]
}

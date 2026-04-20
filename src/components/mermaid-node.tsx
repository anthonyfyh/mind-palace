'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict' })

let counter = 0

function MermaidNodeView({ node }: { node: { attrs: { code: string } } }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)
  const id = useRef(`mermaid-${++counter}`)

  useEffect(() => {
    const code = node.attrs.code
    if (!ref.current || !code) return
    setError(false)

    mermaid.render(id.current, code)
      .then(({ svg }) => {
        if (ref.current) {
          ref.current.innerHTML = svg
          // make svg responsive
          const svgEl = ref.current.querySelector('svg')
          if (svgEl) { svgEl.style.maxWidth = '100%'; svgEl.removeAttribute('width') }
        }
      })
      .catch(() => setError(true))
  }, [node.attrs.code])

  return (
    <NodeViewWrapper>
      <div className="my-4 rounded-lg border border-neutral-100 bg-neutral-50 p-4 overflow-x-auto" data-type="mermaid">
        {error ? (
          <pre className="text-xs text-red-500 whitespace-pre-wrap">{node.attrs.code}</pre>
        ) : (
          <div ref={ref} />
        )}
      </div>
    </NodeViewWrapper>
  )
}

export const MermaidExtension = Node.create({
  name: 'mermaidDiagram',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      code: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mermaid"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mermaid' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView)
  },
})

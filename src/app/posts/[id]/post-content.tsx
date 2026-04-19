'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import { MermaidExtension } from '@/components/mermaid-node'
import { useRouter } from 'next/navigation'

export function PostContent({ content }: { content: object }) {
  const router = useRouter()

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      MermaidExtension,
      Mention.configure({
        HTMLAttributes: {
          class: 'topic-mention',
          style: 'color: #6366f1; font-weight: 500; cursor: pointer;',
        },
        renderLabel({ node }) {
          return `[${node.attrs.label}]`
        },
      }),
    ],
    content,
    editable: false,
    editorProps: {
      attributes: { class: 'prose prose-neutral max-w-none' },
      handleClickOn(_view, _pos, node) {
        if (node.type.name === 'mention' && node.attrs.id) {
          router.push(`/topics/${node.attrs.id}`)
          return true
        }
        return false
      },
    },
  })

  return <EditorContent editor={editor} />
}

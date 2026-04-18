'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export function PostContent({ content }: { content: object }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-neutral max-w-none',
      },
    },
  })

  return <EditorContent editor={editor} />
}

'use client'

import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import tippy, { type Instance } from 'tippy.js'
import { MentionList, type MentionListHandle } from './mention-list'
import 'tippy.js/dist/tippy.css'

type Topic = { id: string; title: string }

interface EditorProps {
  content?: object
  onChange?: (content: object) => void
  placeholder?: string
  topics?: Topic[]
}

export function Editor({ content, onChange, placeholder = 'Write your explanation…', topics = [] }: EditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: { class: 'topic-mention' },
        renderLabel({ options, node }) {
          return `${options.suggestion.char}${node.attrs.label}`
        },
        suggestion: {
          char: '[',
          items({ query }) {
            return topics
              .filter(t => t.title.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 8)
          },
          render() {
            let component: ReactRenderer<MentionListHandle>
            let popup: Instance[]

            return {
              onStart(props) {
                component = new ReactRenderer(MentionList, { props, editor: props.editor })
                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                })
              },
              onUpdate(props) {
                component.updateProps(props)
                popup[0].setProps({ getReferenceClientRect: props.clientRect as () => DOMRect })
              },
              onKeyDown(props) {
                if (props.event.key === 'Escape') { popup[0].hide(); return true }
                return component.ref?.onKeyDown(props) ?? false
              },
              onExit() {
                popup[0].destroy()
                component.destroy()
              },
            }
          },
        },
      }),
    ],
    content: content ?? '',
    editorProps: {
      attributes: {
        class: 'prose prose-neutral prose-sm max-w-none min-h-[200px] focus:outline-none',
      },
    },
    onUpdate({ editor }) {
      onChange?.(editor.getJSON())
    },
  })

  return (
    <div className="border border-neutral-200 rounded-md px-4 py-3 focus-within:border-neutral-400 transition-colors">
      {editor && (
        <div className="flex gap-1 mb-3 pb-3 border-b border-neutral-100 flex-wrap">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>B</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><em>i</em></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>H2</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>H3</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>• List</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>1. List</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>❝</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}>{'</>'}</ToolbarButton>
          <span className="ml-auto text-xs text-neutral-300 self-center">type [ to link a topic</span>
        </div>
      )}
      <EditorContent editor={editor} />
      <style>{`.topic-mention { color: #6366f1; font-weight: 500; cursor: pointer; }`}</style>
    </div>
  )
}

function ToolbarButton({ onClick, active, children }: { onClick: () => void; active: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded transition-colors ${active ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}
    >
      {children}
    </button>
  )
}

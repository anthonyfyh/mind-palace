'use client'

import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react'
import { useRef, useEffect, useState } from 'react'
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

const AI_ACTIONS = [
  { key: 'expand',   label: 'Expand',   title: 'Add more depth and examples' },
  { key: 'improve',  label: 'Improve',  title: 'Sharpen clarity and flow' },
  { key: 'simplify', label: 'Simplify', title: 'Make it easier to read' },
] as const

export function Editor({ content, onChange, placeholder = 'Write your explanation…', topics = [] }: EditorProps) {
  const topicsRef = useRef(topics)
  useEffect(() => { topicsRef.current = topics }, [topics])

  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

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
            return topicsRef.current
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

  async function handleAiAction(action: string) {
    if (!editor) return
    const currentContent = editor.getJSON()
    setAiLoading(action)
    setAiError(null)

    const res = await fetch('/api/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: currentContent, action }),
    })
    const json = await res.json()

    if (!res.ok || json.error) {
      setAiError(json.error ?? 'Something went wrong.')
      setAiLoading(null)
      return
    }

    editor.commands.setContent(json)
    onChange?.(json)
    setAiLoading(null)
  }

  return (
    <div>
      {editor && (
        <div className="flex gap-1 mb-4 flex-wrap items-center">
          {/* Formatting */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>B</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><em>i</em></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>H2</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>H3</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>• List</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>1. List</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>❝</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}>{'</>'}</ToolbarButton>

          {/* Divider */}
          <span className="w-px h-4 bg-neutral-200 mx-1" />

          {/* AI actions */}
          {AI_ACTIONS.map(({ key, label, title }) => (
            <button
              key={key}
              type="button"
              title={title}
              disabled={!!aiLoading}
              onClick={() => handleAiAction(key)}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                aiLoading === key
                  ? 'bg-neutral-100 text-neutral-400 cursor-wait'
                  : 'text-violet-600 hover:bg-violet-50 hover:text-violet-800'
              } disabled:opacity-50`}
            >
              <SparkleIcon />
              {aiLoading === key ? `${label}ing…` : label}
            </button>
          ))}

          <span className="ml-auto text-xs text-neutral-300 self-center">type [ to link a topic</span>
        </div>
      )}

      {aiError && (
        <p className="text-xs text-red-500 mb-2">{aiError}</p>
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

function SparkleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.88 5.76a1 1 0 0 0 .95.69H21l-4.94 3.59a1 1 0 0 0-.36 1.12L17.59 20 12 16.41 6.41 20l1.89-5.84a1 1 0 0 0-.36-1.12L3 9.45h6.17a1 1 0 0 0 .95-.69L12 3z" />
    </svg>
  )
}

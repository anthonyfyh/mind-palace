'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Editor } from '@/components/editor'
import { PostContent } from '@/app/posts/[id]/post-content'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type Topic = { id: string; title: string }

function parseDescription(raw: string | null): object | null {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function TopicHeader({ topic, isCreator, allTopics }: {
  topic: { id: string; title: string; description: string | null }
  isCreator: boolean
  allTopics: Topic[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const richDescription = parseDescription(topic.description)

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(topic.title)
  const [descContent, setDescContent] = useState<object>(richDescription ?? {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('topics')
      .update({
        title: title.trim(),
        description: JSON.stringify(descContent),
      })
      .eq('id', topic.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setEditing(false)
    setSaving(false)
    router.refresh()
  }

  if (editing) {
    return (
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label>Title</Label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            className="text-2xl font-semibold tracking-tight border border-neutral-200 rounded-md px-3 py-2 outline-none focus:border-neutral-400 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label>Description <span className="text-neutral-400 font-normal">(optional — type [ to link a topic)</span></Label>
          <Editor
            content={richDescription ?? undefined}
            onChange={setDescContent}
            topics={allTopics}
            placeholder="Describe this topic. Type [ to link to related topics…"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setTitle(topic.title) }} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-semibold tracking-tight mb-3">{title}</h1>
          {richDescription ? (
            <div className="text-neutral-600">
              <PostContent content={richDescription} />
            </div>
          ) : topic.description ? (
            <p className="text-neutral-500">{topic.description}</p>
          ) : null}
        </div>
        {isCreator && (
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 text-sm border border-neutral-200 rounded-md px-3 py-1.5 text-neutral-600 hover:border-neutral-400 transition-colors"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  )
}
